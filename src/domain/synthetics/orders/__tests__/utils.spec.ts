import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { expandDecimals } from "lib/numbers";
import { mockMarketsInfoData, mockTokensData } from "sdk/test/mock";

import { NextPositionValues } from "../../trade";
import { OrderType, PositionOrderInfo } from "../types";
import { getOrderErrors } from "../utils";

const tokensData = mockTokensData();
const marketsInfoData = mockMarketsInfoData(tokensData, ["BTC-BTC-USDC"], {
  "BTC-BTC-USDC": { minCollateralFactor: expandDecimals(1, 28) },
});
const marketInfo = marketsInfoData["BTC-BTC-USDC"];

function makeIncreaseOrder(orderType: OrderType, overrides: Partial<PositionOrderInfo> = {}): PositionOrderInfo {
  return {
    key: "order-key",
    account: "0x1111111111111111111111111111111111111111",
    marketAddress: marketInfo.marketTokenAddress,
    marketInfo,
    indexToken: marketInfo.indexToken,
    initialCollateralToken: tokensData.USDC,
    targetCollateralToken: tokensData.USDC,
    initialCollateralTokenAddress: tokensData.USDC.address,
    initialCollateralDeltaAmount: expandDecimals(1000, 6),
    sizeDeltaUsd: expandDecimals(10_000, 30),
    triggerPrice: expandDecimals(50_000, 30),
    acceptablePrice: expandDecimals(50_500, 30),
    minOutputAmount: 0n,
    swapPath: [],
    swapPathStats: undefined,
    isLong: true,
    isTwap: false,
    isSwap: false,
    orderType,
    validFromTime: 0n,
    updatedAtTime: 0n,
    ...overrides,
  } as unknown as PositionOrderInfo;
}

const baseParams = {
  marketsInfoData,
  positionsInfoData: {},
  findSwapPath: (() => undefined) as any,
  uiFeeFactor: 0n,
  chainId: ARBITRUM,
  isSetAcceptablePriceImpactEnabled: false,
};

const nextValues = (nextLiqPrice: bigint) => ({ nextLiqPrice }) as NextPositionValues;

const hasLiquidatableError = (result: ReturnType<typeof getOrderErrors>) =>
  result.errors.some((e) => e.key === "resultingLiquidatable" && e.level === "error");

describe("getOrderErrors — resulting position liquidatable at trigger price", () => {
  it("flags a long Limit Increase when nextLiqPrice is above the trigger price", () => {
    const result = getOrderErrors({
      ...baseParams,
      order: makeIncreaseOrder(OrderType.LimitIncrease),
      nextPositionValues: nextValues(expandDecimals(55_000, 30)),
    });

    expect(hasLiquidatableError(result)).toBe(true);
    expect(result.errors.find((error) => error.key === "resultingLiquidatable")?.msg).toBe(
      "Order may not execute: the resulting position would be liquidatable at the trigger price. Deposit margin or reduce the order size."
    );
    expect(result.level).toBe("error");
  });

  it("does not flag a long Limit Increase when nextLiqPrice is below the trigger price", () => {
    const result = getOrderErrors({
      ...baseParams,
      order: makeIncreaseOrder(OrderType.LimitIncrease),
      nextPositionValues: nextValues(expandDecimals(45_000, 30)),
    });

    expect(hasLiquidatableError(result)).toBe(false);
  });

  it("flags a short Stop Increase when nextLiqPrice is below the trigger price", () => {
    const result = getOrderErrors({
      ...baseParams,
      order: makeIncreaseOrder(OrderType.StopIncrease, { isLong: false }),
      nextPositionValues: nextValues(expandDecimals(45_000, 30)),
    });

    expect(hasLiquidatableError(result)).toBe(true);
  });

  it("does not flag a Market Increase order even if nextPositionValues are provided", () => {
    const result = getOrderErrors({
      ...baseParams,
      order: makeIncreaseOrder(OrderType.MarketIncrease, { triggerPrice: 0n }),
      nextPositionValues: nextValues(expandDecimals(55_000, 30)),
    });

    expect(hasLiquidatableError(result)).toBe(false);
  });

  it("does not flag when nextPositionValues are missing", () => {
    const result = getOrderErrors({
      ...baseParams,
      order: makeIncreaseOrder(OrderType.LimitIncrease),
    });

    expect(hasLiquidatableError(result)).toBe(false);
  });

  const positionKey = `0x1111111111111111111111111111111111111111:${marketInfo.marketTokenAddress}:USDC:true`;

  function makePosition(liquidationPrice: bigint) {
    return {
      key: positionKey,
      isLong: true,
      sizeInUsd: expandDecimals(20_000, 30),
      collateralUsd: expandDecimals(2_000, 30),
      liquidationPrice,
    } as any;
  }

  it("does not flag when the trigger is beyond the current position's liq price", () => {
    const result = getOrderErrors({
      ...baseParams,
      positionsInfoData: { [positionKey]: makePosition(expandDecimals(55_000, 30)) },
      order: makeIncreaseOrder(OrderType.LimitIncrease),
      nextPositionValues: nextValues(expandDecimals(56_000, 30)),
    });

    expect(hasLiquidatableError(result)).toBe(false);
  });

  it("flags when the position is alive at the trigger and the resulting position is liquidatable", () => {
    const result = getOrderErrors({
      ...baseParams,
      positionsInfoData: { [positionKey]: makePosition(expandDecimals(45_000, 30)) },
      order: makeIncreaseOrder(OrderType.LimitIncrease),
      nextPositionValues: nextValues(expandDecimals(52_000, 30)),
    });

    expect(hasLiquidatableError(result)).toBe(true);
  });
});
