import assert from "node:assert/strict";
import type { TransactionReceipt } from "viem";

import { getContract } from "../../../sdk/src/configs/contracts";
import { getBatchTypedData } from "../../../sdk/src/utils/express/utils/batchOrderUtils";
import {
  buildTokenTransfersParamsForIncreaseOrSwap,
  getBatchOrderMulticallPayload,
} from "../../../sdk/src/utils/orderTransactions/utils";
import { setOrderDataListMetadataIsExpress } from "../../../sdk/src/utils/twap/uiFeeReceiver";
import type { FundedAction } from "./journal";
import { getPositionKey } from "../../../sdk/src/utils/positions/utils";
import { affordablePosition, ceilDiv, economy, USD } from "./economy";
import { bufferSubaccountRelayFee, inspectPreparedOrder, type OrderIntent } from "./preparedOrder";
import { orderEventKeys } from "./orderReceipt";
import type { FundedSession } from "./session";

export async function eventually<T>(read: () => Promise<T>, matches: (value: T) => boolean, timeout = 90_000) {
  const deadline = Date.now() + timeout;
  do {
    const value = await read();
    if (matches(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  } while (Date.now() < deadline);
  throw new Error("Expected settlement was not observed before the deadline");
}

export async function position(session: FundedSession) {
  const state = await session.snapshot();
  assert.equal(state.positions.length, 1, "Expected exactly one funded position");
  assert.equal(state.onchainPositionCount, 1);
  const position = state.positions[0];
  assert.ok(session.active.ownedPositionKeys.includes(position.key), "Unowned position");
  return position;
}

export async function ownPlannedPosition(session: FundedSession, isLong: boolean) {
  const state = await session.snapshot();
  const key = getPositionKey(session.address, state.market.marketTokenAddress, state.usdc.address, isLong);
  if (!session.active.ownedPositionKeys.includes(key)) session.active.ownedPositionKeys.push(key);
  await session.save();
}

export async function quoteTrigger(
  session: FundedSession,
  state: Awaited<ReturnType<FundedSession["snapshot"]>>,
  isLong: boolean,
  kind: "limit" | "stop-market" | "take-profit" | "stop-loss",
  existing?: Awaited<ReturnType<typeof position>>
) {
  const increase = kind === "limit" || kind === "stop-market";
  const below =
    kind === "limit" ? isLong : kind === "stop-market" ? !isLong : kind === "take-profit" ? !isLong : isLong;
  const triggerPrice = (state.weth.prices.minPrice * (below ? 50n : 150n)) / 100n;
  const sizing = affordablePosition({ ...state.market, openingCostsUsd: USD / 2n });
  const amount = ceilDiv(sizing.collateralUsd * 10n ** 6n, state.usdc.prices.minPrice);
  const sizeUsd = existing?.sizeInUsd ?? sizing.sizeUsd;
  const prepared = await session.sdk.prepareOrder({
    kind: increase ? "increase" : "decrease",
    symbol: state.market.marketTokenAddress,
    direction: isLong ? "long" : "short",
    orderType: kind,
    size: sizeUsd,
    triggerPrice,
    collateralToken: "USDC",
    ...(increase ? { collateralToPay: { token: "USDC", amount } } : { receiveToken: "USDC" }),
    gasPaymentToken: state.usdc.address,
    slippage: economy.slippageBps,
    mode: "express",
    from: session.address,
  });
  const intent: OrderIntent = increase
    ? {
        kind: "increase" as const,
        isLong,
        sizeUsd,
        collateralAmount: amount,
        orderType: kind === "limit" ? 3 : 8,
        triggerPrice: triggerPrice / 10n ** 18n,
      }
    : {
        kind: "close" as const,
        isLong,
        sizeUsd,
        collateralAmount: existing!.collateralAmount,
        orderType: kind === "take-profit" ? 5 : 6,
        triggerPrice: triggerPrice / 10n ** 18n,
      };
  const buffered = bufferSubaccountRelayFee({
    prepared,
    intent,
    address: session.address,
    marketAddress: state.market.marketTokenAddress,
    subaccountApproval: session.sdk.subaccountApprovalMessage,
    ...state,
  });
  const quote = inspectPreparedOrder({
    prepared: buffered,
    intent,
    address: session.address,
    marketAddress: state.market.marketTokenAddress,
    subaccountApproval: session.sdk.subaccountApprovalMessage,
    ...state,
  });
  return { prepared: buffered, intent, feeUsd: quote.feeUsd, amount };
}

export async function quoteTwap(session: FundedSession, state: Awaited<ReturnType<FundedSession["snapshot"]>>) {
  const { size, collateral, amount } = twapSizing(state);
  const start = Math.floor(Date.now() / 1000) - 5;
  const prepared = await session.sdk.prepareOrder({
    kind: "increase",
    orderType: "twap",
    symbol: state.market.marketTokenAddress,
    direction: "long",
    size,
    collateralToken: "USDC",
    collateralToPay: { token: "USDC", amount },
    twapConfig: { duration: 600, parts: 2 },
    gasPaymentToken: state.usdc.address,
    slippage: economy.slippageBps,
    mode: "express",
    from: session.address,
  });
  const orders = prepared.payload.batchParams.createOrderParams.map((p) => p.orderPayload);
  // API TWAP quotes use unlimited acceptable prices; classic calldata enforces a fixed bound.
  for (const order of orders)
    order.numbers.acceptablePrice = (state.weth.prices.maxPrice * 10_030n) / 10_000n / 10n ** 18n;
  prepared.payload.typedData = getBatchTypedData({
    chainId: 42161,
    account: session.address,
    batchParams: prepared.payload.batchParams,
    relayParams: prepared.payload.relayParams,
    relayRouterAddress: getContract(42161, "GelatoRelayRouter"),
  });
  const quote = inspectPreparedOrder({
    prepared,
    address: session.address,
    marketAddress: state.market.marketTokenAddress,
    ...state,
    intent: {
      kind: "increase",
      isLong: true,
      sizeUsd: size,
      collateralAmount: amount,
      orderType: 3,
      twap: { start, end: start + 630 },
    },
  });
  for (const create of prepared.payload.batchParams.createOrderParams) {
    const order = create.orderPayload;
    order.addresses.receiver = order.addresses.cancellationReceiver = session.address;
    order.dataList = setOrderDataListMetadataIsExpress(order.dataList, false);
    create.tokenTransfersParams = buildTokenTransfersParamsForIncreaseOrSwap({
      chainId: 42161,
      receiver: session.address,
      payTokenAddress: state.usdc.address,
      payTokenAmount: BigInt(order.numbers.initialCollateralDeltaAmount),
      receiveTokenAddress: state.usdc.address,
      executionFeeAmount: BigInt(order.numbers.executionFee),
      externalSwapQuote: undefined,
      minOutputAmount: 0n,
      swapPath: [],
    });
  }
  const batch = getBatchOrderMulticallPayload({ params: prepared.payload.batchParams });
  const executionFeeUsd = (batch.value * state.weth.prices.maxPrice) / 10n ** 18n;
  assert.ok(
    executionFeeUsd > 0n && executionFeeUsd <= quote.feeUsd,
    "TWAP native execution fees exceed the inspected budget"
  );
  // Classic submission pays native keeper fees; nativeTransaction adds gas, with no relay charge.
  return { size, collateral, amount, batch, feeUsd: executionFeeUsd + quote.orderCostsUsd };
}

function twapSizing(state: Awaited<ReturnType<FundedSession["snapshot"]>>) {
  const size = [4n * USD, state.market.minPositionSizeUsd * 2n].reduce((a, b) => (a > b ? a : b));
  const collateral = [size / 2n + 2n * USD, state.market.minCollateralUsd * 2n + USD].reduce((a, b) => (a > b ? a : b));
  assert.ok(
    size <= economy.positionLimitUsd && collateral <= economy.collateralLimitUsd,
    "TWAP minimums exceed economy caps"
  );
  // The API floors each TWAP part, so collateral must divide evenly into two parts.
  const amount = ceilDiv(collateral * 10n ** 6n, state.usdc.prices.minPrice * 2n) * 2n;
  return { size, collateral, amount };
}

export function registerTwapReceipt(session: FundedSession, action: FundedAction, receipt: TransactionReceipt) {
  const keys = orderEventKeys(receipt, "OrderCreated", session.address, session.active.marketAddress);
  assert.equal(keys.length, 2, "TWAP receipt must create two orders");
  for (const key of keys) if (!session.active.ownedOrderKeys.includes(key)) session.active.ownedOrderKeys.push(key);
  action.orderKeys = keys;
}
