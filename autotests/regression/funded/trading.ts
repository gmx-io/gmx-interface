import assert from "node:assert/strict";
import { getAddress, parseEventLogs, type Abi, type TransactionReceipt } from "viem";

import EventEmitter from "../../../sdk/src/abis/EventEmitter";
import SyntheticsReader from "../../../sdk/src/abis/SyntheticsReader";
import { getContract } from "../../../sdk/src/configs/contracts";
import { hashedPositionKey } from "../../../sdk/src/configs/dataStore";
import { getBatchTypedData } from "../../../sdk/src/utils/express/utils/batchOrderUtils";
import {
  buildTokenTransfersParamsForIncreaseOrSwap,
  getBatchOrderMulticallPayload,
} from "../../../sdk/src/utils/orderTransactions/utils";
import { setOrderDataListMetadataIsExpress } from "../../../sdk/src/utils/twap/uiFeeReceiver";
import { chargedFees, type FundedAction } from "./journal";
import { getPositionKey } from "../../../sdk/src/utils/positions/utils";
import { affordablePosition, ceilDiv, checkFeeBudget, economy, USD } from "./economy";
import { inspectPreparedOrder, type OrderIntent } from "./preparedOrder";
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

export async function changePosition(
  session: FundedSession,
  operation: "increase" | "deposit" | "withdraw" | "partial" | "close"
) {
  const state = await session.snapshot();
  const before = await session.remember("position", () => position(session));
  if (await session.previousAction(operation)) {
    const expected =
      operation === "close"
        ? 0n
        : operation === "partial"
          ? before.sizeInUsd - before.sizeInUsd / 2n
          : operation === "increase"
            ? before.sizeInUsd + state.market.minPositionSizeUsd
            : before.sizeInUsd;
    await eventually(
      () => session.snapshot(),
      (s) =>
        expected === 0n
          ? !s.positions.length && !s.onchainPositionCount
          : s.positions[0]?.sizeInUsd === expected &&
            (operation === "deposit"
              ? s.positions[0].collateralAmount > before.collateralAmount
              : operation === "withdraw"
                ? s.positions[0].collateralAmount < before.collateralAmount
                : true)
    );
    return expected;
  }
  if (operation === "deposit" || operation === "withdraw") {
    const amount = 250_000n;
    if (operation === "deposit" && before.collateralUsd + USD / 4n > economy.collateralLimitUsd)
      throw new Error("Collateral addition exceeds the $5 cap");
    assert.equal(
      before.contractKey,
      hashedPositionKey(session.address, state.market.marketTokenAddress, state.usdc.address, before.isLong),
      "Position contract key does not match the permitted wallet and market"
    );
    const prepared = await session.sdk.prepareCollateral({
      operation,
      positionKey: before.contractKey,
      amount,
      gasPaymentToken: state.usdc.address,
      slippage: economy.slippageBps,
      mode: "express",
      from: session.address,
    });
    await session.execute(
      prepared,
      {
        kind: operation === "deposit" ? "increase" : "close",
        isLong: before.isLong,
        sizeUsd: 0n,
        collateralAmount: amount,
      },
      operation,
      false
    );
    const after = await eventually(
      () => position(session),
      (p) =>
        operation === "deposit"
          ? p.collateralAmount > before.collateralAmount
          : p.collateralAmount < before.collateralAmount
    );
    assert.equal(after.sizeInUsd, before.sizeInUsd);
    return after.sizeInUsd;
  }
  const increasing = operation === "increase";
  const size = increasing
    ? state.market.minPositionSizeUsd
    : operation === "partial"
      ? before.sizeInUsd / 2n
      : before.sizeInUsd;
  if (increasing && before.sizeInUsd + size > economy.positionLimitUsd)
    throw new Error("Increase exceeds the $10 position cap");
  if (
    operation === "partial" &&
    (size < state.market.minPositionSizeUsd || before.sizeInUsd - size < state.market.minPositionSizeUsd)
  )
    throw new Error("Partial close would leave a position below the live minimum");
  const collateral = increasing ? ceilDiv(size * 10n ** 6n, 2n * state.usdc.prices.minPrice) : before.collateralAmount;
  if (increasing && before.collateralUsd + size / 2n > economy.collateralLimitUsd)
    throw new Error("Increase exceeds the collateral cap");
  const prepared = await session.sdk.prepareOrder({
    kind: increasing ? "increase" : "decrease",
    symbol: state.market.marketTokenAddress,
    direction: before.isLong ? "long" : "short",
    orderType: "market",
    size,
    collateralToken: "USDC",
    ...(increasing
      ? { collateralToPay: { token: "USDC", amount: collateral } }
      : { receiveToken: "USDC", keepLeverage: false }),
    gasPaymentToken: state.usdc.address,
    mode: "express",
    from: session.address,
    slippage: economy.slippageBps,
  });
  await session.execute(
    prepared,
    { kind: increasing ? "increase" : "close", isLong: before.isLong, sizeUsd: size, collateralAmount: collateral },
    operation,
    operation === "close"
  );
  const expectedSize = increasing ? before.sizeInUsd + size : before.sizeInUsd - size;
  await eventually(
    () => session.snapshot(),
    (s) =>
      expectedSize === 0n ? !s.positions.length && !s.onchainPositionCount : s.positions[0]?.sizeInUsd === expectedSize
  );
  return expectedSize;
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
  const quote = inspectPreparedOrder({
    prepared,
    intent,
    address: session.address,
    marketAddress: state.market.marketTokenAddress,
    subaccountApproval: session.sdk.subaccountApprovalMessage,
    ...state,
  });
  return { prepared, intent, feeUsd: quote.feeUsd, amount };
}

export async function createTrigger(
  session: FundedSession,
  isLong: boolean,
  kind: "limit" | "stop-market" | "take-profit" | "stop-loss"
) {
  const previous = await session.previousAction("trigger");
  if (previous) {
    assert.equal(previous.orderKeys?.length, 1);
    return previous.orderKeys[0];
  }
  const state = await session.snapshot();
  const increase = kind === "limit" || kind === "stop-market";
  const existing = increase ? undefined : await position(session);
  const quote = await quoteTrigger(session, state, isLong, kind, existing);
  checkFeeBudget(chargedFees(session.active), quote.feeUsd + USD / 20n, false, session.feePolicy);
  if (increase) {
    assert.equal(state.positions.length, 0);
    assert.equal(state.orders.length, 0);
    await session.allowance(state.usdc, quote.amount + 1_000_000n, false);
    await ownPlannedPosition(session, isLong);
  }
  const action = await session.execute(quote.prepared, quote.intent, "trigger", false, "creation");
  assert.equal(action.orderKeys?.length, 1);
  const key = action.orderKeys[0];
  await eventually(
    () => session.snapshot(),
    (s) => s.orders.some((o) => o.key === key) && s.onchainOrderCount === s.orders.length
  );
  return key;
}

export async function editTrigger(session: FundedSession, key: string) {
  const state = await session.snapshot();
  const order = await session.remember("order", async () => state.orders.find((o) => o.key === key));
  assert.ok(order && session.active.ownedOrderKeys.includes(key));
  const chainOrder = (await session.remember("onchain-order", () =>
    session.rpc.readContract({
      abi: SyntheticsReader as Abi,
      address: getContract(42161, "SyntheticsReader"),
      functionName: "getOrder",
      args: [getContract(42161, "DataStore"), key],
    })
  )) as { numbers: { triggerPrice: bigint; acceptablePrice: bigint } };
  const oldTrigger = chainOrder.numbers.triggerPrice;
  const scale = order.triggerPrice === oldTrigger ? 1n : 10n ** 18n;
  assert.equal(order.triggerPrice, oldTrigger * scale, "API and on-chain trigger prices differ");
  const trigger = (oldTrigger * 101n) / 100n;
  const buying = [3, 8].includes(order.orderType) ? order.isLong : !order.isLong;
  const acceptable =
    (buying ? state.weth.prices.maxPrice * 10_030n : state.weth.prices.minPrice * 9_970n) / 10_000n / 10n ** 18n;
  if (!(await session.previousAction("edit"))) {
    const prepared = await session.sdk.prepareEditOrder({
      orderIds: [key],
      newTriggerPrice: trigger * 10n ** 18n,
      newAcceptablePrice: acceptable * 10n ** 18n,
      newSize: order.sizeDeltaUsd,
      mode: "express",
      from: session.address,
    });
    await session.execute(
      prepared,
      {
        kind: "edit",
        key,
        sizeUsd: order.sizeDeltaUsd,
        triggerPrice: trigger,
        acceptablePrice: acceptable,
        autoCancel: order.autoCancel,
        minOutputAmount: order.minOutputAmount,
        validFromTime: order.validFromTime,
      },
      "edit",
      false,
      "receipt"
    );
  }
  await eventually(
    () => session.sdk.fetchOrders({ address: session.address }),
    (orders) => orders.some((o) => o.key === key && o.triggerPrice === trigger * scale)
  );
}

export async function cancelOrders(session: FundedSession, keys: string[]) {
  assert.ok(keys.length > 0 && keys.every((key) => session.active.ownedOrderKeys.includes(key)));
  if (!(await session.previousAction("cancel"))) {
    const prepared = await session.sdk.prepareCancelOrder({ orderIds: keys, mode: "express", from: session.address });
    await session.execute(prepared, { kind: "cancel", keys }, "cancel", true, "receipt");
  }
  await eventually(
    () => session.snapshot(),
    (s) => keys.every((key) => !s.orders.some((o) => o.key === key)) && s.onchainOrderCount === s.orders.length
  );
}

export async function swap(session: FundedSession, reverse: boolean, amount: bigint) {
  const state = await session.snapshot();
  const before = await session.remember("balances", async () => ({
    wrappedAmount: state.wrappedAmount,
    stableAmount: state.stableAmount,
  }));
  const input = reverse ? state.weth : state.usdc;
  const output = reverse ? state.usdc : state.weth;
  const valueUsd = (amount * input.prices.minPrice) / 10n ** BigInt(input.decimals);
  assert.ok(amount > 0n && valueUsd <= 2n * USD, "Swap exceeds $2");
  if (!reverse && state.stableUsd - valueUsd < economy.stableReserveUsd + economy.cleanupReserveUsd)
    throw new Error("Swap would consume stablecoin reserves");
  const minimum = (valueUsd * 9_950n * 10n ** BigInt(output.decimals)) / output.prices.maxPrice / 10_000n;
  if (!(await session.previousAction("swap"))) {
    const quote = await session.quoteSwap(state, amount, !reverse, false);
    checkFeeBudget(chargedFees(session.active), quote.feeUsd + USD / 20n, reverse, session.feePolicy);
    await session.allowance(input, amount + (reverse ? 0n : 1_000_000n), reverse);
    await session.execute(quote.prepared, quote.intent, "swap", reverse);
  }
  const after = await eventually(
    () => session.snapshot(),
    (s) =>
      reverse
        ? s.wrappedAmount <= before.wrappedAmount - amount && s.stableAmount > before.stableAmount
        : s.wrappedAmount >= before.wrappedAmount + minimum
  );
  return reverse ? after.stableAmount - before.stableAmount : after.wrappedAmount - before.wrappedAmount;
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
  assert.ok(
    (batch.value * state.weth.prices.maxPrice) / 10n ** 18n <= quote.feeUsd,
    "TWAP native execution fees exceed the inspected budget"
  );
  return { size, collateral, amount, batch, feeUsd: quote.feeUsd };
}

function twapSizing(state: Awaited<ReturnType<FundedSession["snapshot"]>>) {
  const size = [4n * USD, state.market.minPositionSizeUsd * 2n].reduce((a, b) => (a > b ? a : b));
  const collateral = [size / 2n + 2n * USD, state.market.minCollateralUsd * 2n + USD].reduce((a, b) => (a > b ? a : b));
  assert.ok(
    size <= economy.positionLimitUsd && collateral <= economy.collateralLimitUsd,
    "TWAP minimums exceed economy caps"
  );
  const amount = ceilDiv(collateral * 10n ** 6n, state.usdc.prices.minPrice);
  return { size, collateral, amount };
}

export async function twap(session: FundedSession) {
  const state = await session.snapshot();
  const { size, collateral, amount } = twapSizing(state);
  let action = await session.previousAction("twap");
  if (!action) {
    const { batch, feeUsd } = await quoteTwap(session, state);
    checkFeeBudget(chargedFees(session.active), feeUsd + USD / 20n, false, session.feePolicy);
    if (state.stableUsd - collateral < economy.stableReserveUsd + economy.cleanupReserveUsd)
      throw new Error("TWAP collateral would consume reserves");
    await session.allowance(state.usdc, amount, false);
    await ownPlannedPosition(session, true);
    action = await session.nativeTransaction(
      {
        to: getContract(42161, "ExchangeRouter"),
        data: batch.callData as `0x${string}`,
        value: batch.value,
      },
      "twap",
      false,
      feeUsd
    );
  }
  assert.ok(action.txHash);
  const receipt = await session.rpc.getTransactionReceipt({ hash: action.txHash });
  registerTwapReceipt(session, action, receipt);
  await session.save();
  const after = await eventually(
    () => session.snapshot(),
    (s) =>
      s.positions.length === 1 &&
      s.positions[0].sizeInUsd === size / 2n &&
      s.orders.length === 1 &&
      s.onchainOrderCount === 1,
    180_000
  );
  assert.ok(session.active.ownedOrderKeys.includes(after.orders[0].key));
  return after.orders[0].key;
}

export function registerTwapReceipt(session: FundedSession, action: FundedAction, receipt: TransactionReceipt) {
  const events = parseEventLogs({
    abi: EventEmitter as Abi,
    logs: receipt.logs.filter((log) => getAddress(log.address) === getAddress(getContract(42161, "EventEmitter"))),
    strict: false,
  });
  const keys = events
    .filter((e) => (e.args as { eventName?: string }).eventName === "OrderCreated")
    .map((e) => (e.args as { topic1: string }).topic1);
  assert.equal(keys.length, 2, "TWAP receipt must create two orders");
  for (const key of keys) if (!session.active.ownedOrderKeys.includes(key)) session.active.ownedOrderKeys.push(key);
  action.orderKeys = keys;
}
