import assert from "node:assert/strict";

import { getContract } from "../../../sdk/src/configs/contracts";
import { getBatchTypedData } from "../../../sdk/src/utils/express/utils/batchOrderUtils";
import { getPositionKey } from "../../../sdk/src/utils/positions/utils";
import { affordablePosition, ceilDiv, economy, USD } from "./economy";
import { inspectPreparedOrder } from "./preparedOrder";
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
  kind: "limit" | "stop-market"
) {
  const below = kind === "limit" ? isLong : !isLong;
  const triggerPrice = (state.weth.prices.minPrice * (below ? 50n : 150n)) / 100n;
  const sizing = affordablePosition({ ...state.market, openingCostsUsd: USD / 2n });
  const amount = ceilDiv(sizing.collateralUsd * 10n ** 6n, state.usdc.prices.minPrice);
  const prepared = await session.sdk.prepareOrder({
    kind: "increase",
    symbol: state.market.marketTokenAddress,
    direction: isLong ? "long" : "short",
    orderType: kind,
    size: sizing.sizeUsd,
    triggerPrice,
    collateralToken: "USDC",
    collateralToPay: { token: "USDC", amount },
    gasPaymentToken: state.usdc.address,
    slippage: economy.slippageBps,
    mode: "express",
    from: session.address,
  });
  return inspectPreparedOrder({
    prepared,
    intent: {
      kind: "increase",
      isLong,
      sizeUsd: sizing.sizeUsd,
      collateralAmount: amount,
      orderType: kind === "limit" ? 3 : 8,
      triggerPrice: triggerPrice / 10n ** 18n,
    },
    address: session.address,
    marketAddress: state.market.marketTokenAddress,
    ...state,
  });
}

export async function quoteTwap(session: FundedSession, state: Awaited<ReturnType<FundedSession["snapshot"]>>) {
  const { size, amount } = twapSizing(state);
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
  // The inspector rejects the API's unlimited TWAP acceptable prices, so bound them before checking the fee.
  for (const { orderPayload } of prepared.payload.batchParams.createOrderParams)
    orderPayload.numbers.acceptablePrice = (state.weth.prices.maxPrice * 10_030n) / 10_000n / 10n ** 18n;
  prepared.payload.typedData = getBatchTypedData({
    chainId: 42161,
    account: session.address,
    batchParams: prepared.payload.batchParams,
    relayParams: prepared.payload.relayParams,
    relayRouterAddress: getContract(42161, "GelatoRelayRouter"),
  });
  return inspectPreparedOrder({
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
  return { size, amount };
}
