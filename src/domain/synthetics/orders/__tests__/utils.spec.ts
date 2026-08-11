import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { mockPositionInfo } from "domain/synthetics/testUtils/mocks";
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

describe("getOrderErrors — margin deposit orders", () => {
  const ACCOUNT = "0x1111111111111111111111111111111111111111";

  function makeDepositOrder(overrides: Partial<PositionOrderInfo> = {}) {
    return makeIncreaseOrder(OrderType.LimitIncrease, {
      account: ACCOUNT,
      sizeDeltaUsd: 0n,
      initialCollateralDeltaAmount: expandDecimals(5_000, 6),
      triggerPrice: expandDecimals(18_500, 30),
      ...overrides,
    });
  }

  function makeDepositPosition(liquidationPrice: bigint) {
    return mockPositionInfo(
      {
        marketInfo,
        collateralTokenAddress: tokensData.USDC.address,
        account: ACCOUNT,
        isLong: true,
        sizeInUsd: expandDecimals(10_000, 30),
        collateralUsd: expandDecimals(1_000, 30),
      },
      { liquidationPrice }
    );
  }

  /**
   * 10k long/short on BTC at $20,000 (0.5 BTC) with $3,000 of USDC margin, so the untouched
   * liquidation price sits around $14,200 for a long and $25,800 for a short.
   */
  function makeFundedPosition(p: {
    liquidationPrice: bigint;
    isLong?: boolean;
    pendingBorrowingFeesUsd?: bigint;
    pendingFundingFeesUsd?: bigint;
  }) {
    const isLong = p.isLong ?? true;

    return mockPositionInfo(
      {
        marketInfo,
        collateralTokenAddress: tokensData.USDC.address,
        account: ACCOUNT,
        isLong,
        sizeInUsd: expandDecimals(10_000, 30),
        collateralUsd: expandDecimals(3_000, 30),
      },
      {
        isLong,
        liquidationPrice: p.liquidationPrice,
        pendingBorrowingFeesUsd: p.pendingBorrowingFeesUsd ?? 0n,
        pendingFundingFeesUsd: p.pendingFundingFeesUsd ?? 0n,
      }
    );
  }

  const depositParams = {
    ...baseParams,
    minCollateralUsd: expandDecimals(10, 30),
    userReferralInfo: undefined,
  };

  const errorKeys = (result: ReturnType<typeof getOrderErrors>) => result.errors.map((e) => e.key);

  it("returns the red state when the deposit still leaves the position liquidatable at the trigger", () => {
    const position = makeDepositPosition(expandDecimals(19_000, 30));

    const result = getOrderErrors({
      ...depositParams,
      positionsInfoData: { [position.key]: position },
      order: makeDepositOrder({
        initialCollateralDeltaAmount: expandDecimals(1, 6),
        triggerPrice: expandDecimals(15_000, 30),
      }),
    });

    expect(errorKeys(result)).toEqual(["marginDepositInsufficient"]);
    expect(result.level).toBe("error");
  });

  it("returns the yellow state when the trigger is at or beyond the current liquidation price", () => {
    const position = makeDepositPosition(expandDecimals(19_000, 30));

    const result = getOrderErrors({
      ...depositParams,
      positionsInfoData: { [position.key]: position },
      order: makeDepositOrder(),
    });

    expect(errorKeys(result)).toEqual(["marginDepositBeyondLiqPrice"]);
    expect(result.level).toBe("warning");
  });

  it("returns no state when the trigger is a safe distance from liquidation", () => {
    const position = makeDepositPosition(expandDecimals(15_000, 30));

    const result = getOrderErrors({
      ...depositParams,
      positionsInfoData: { [position.key]: position },
      order: makeDepositOrder(),
    });

    expect(result.errors).toEqual([]);
    expect(result.level).toBeUndefined();
  });

  it("returns the red state and skips the standard increase checks when no position matches", () => {
    const otherCollateralPosition = mockPositionInfo({
      marketInfo,
      collateralTokenAddress: tokensData.BTC.address,
      account: ACCOUNT,
      isLong: true,
      sizeInUsd: expandDecimals(10_000, 30),
      collateralUsd: expandDecimals(1_000, 30),
    });

    const result = getOrderErrors({
      ...depositParams,
      isSetAcceptablePriceImpactEnabled: true,
      positionsInfoData: { [otherCollateralPosition.key]: otherCollateralPosition },
      order: makeDepositOrder(),
    });

    // the standard path would add the "collateralToken" mismatch warning here
    expect(errorKeys(result)).toEqual(["marginDepositInsufficient"]);
  });

  it("stays silent while positions are still loading", () => {
    const result = getOrderErrors({
      ...depositParams,
      positionsInfoData: undefined,
      order: makeDepositOrder(),
    });

    expect(result.errors).toEqual([]);
  });

  it("leaves a regular Limit Increase with a positive size on the standard path", () => {
    const otherCollateralPosition = mockPositionInfo({
      marketInfo,
      collateralTokenAddress: tokensData.BTC.address,
      account: ACCOUNT,
      isLong: true,
      sizeInUsd: expandDecimals(10_000, 30),
      collateralUsd: expandDecimals(1_000, 30),
    });

    const result = getOrderErrors({
      ...depositParams,
      positionsInfoData: { [otherCollateralPosition.key]: otherCollateralPosition },
      order: makeIncreaseOrder(OrderType.LimitIncrease, { account: ACCOUNT }),
    });

    expect(errorKeys(result)).toContain("collateralToken");
    expect(errorKeys(result)).not.toContain("marginDepositInsufficient");
    expect(errorKeys(result)).not.toContain("marginDepositBeyondLiqPrice");
  });

  it("flips to the red state once accrued fees eat into the deposit", () => {
    const order = makeDepositOrder({
      initialCollateralDeltaAmount: expandDecimals(2_000, 6),
      triggerPrice: expandDecimals(12_000, 30),
    });

    const withoutFees = makeFundedPosition({ liquidationPrice: expandDecimals(11_000, 30) });
    const withFees = makeFundedPosition({
      liquidationPrice: expandDecimals(11_000, 30),
      pendingBorrowingFeesUsd: expandDecimals(900, 30),
      pendingFundingFeesUsd: expandDecimals(600, 30),
    });

    expect(
      getOrderErrors({ ...depositParams, positionsInfoData: { [withoutFees.key]: withoutFees }, order }).errors
    ).toEqual([]);

    expect(
      errorKeys(getOrderErrors({ ...depositParams, positionsInfoData: { [withFees.key]: withFees }, order }))
    ).toEqual(["marginDepositInsufficient"]);
  });

  it("evaluates concurrent deposits against their own amount and trigger only", () => {
    const position = makeFundedPosition({ liquidationPrice: expandDecimals(11_000, 30) });
    const positionsInfoData = { [position.key]: position };

    // a comfortable deposit close to liquidation
    const funded = makeDepositOrder({
      key: "deposit-funded",
      initialCollateralDeltaAmount: expandDecimals(2_000, 6),
      triggerPrice: expandDecimals(12_000, 30),
    });
    // a dust deposit at a trigger that is farther from liquidation, but far too small to save the position
    const dust = makeDepositOrder({
      key: "deposit-dust",
      initialCollateralDeltaAmount: expandDecimals(1, 6),
      triggerPrice: expandDecimals(13_500, 30),
    });

    expect(getOrderErrors({ ...depositParams, positionsInfoData, order: funded }).errors).toEqual([]);
    expect(errorKeys(getOrderErrors({ ...depositParams, positionsInfoData, order: dust }))).toEqual([
      "marginDepositInsufficient",
    ]);
  });

  it("clears the red state once the trigger moves away from liquidation", () => {
    const position = makeFundedPosition({ liquidationPrice: expandDecimals(11_000, 30) });
    const positionsInfoData = { [position.key]: position };

    const nearLiquidation = makeDepositOrder({
      initialCollateralDeltaAmount: expandDecimals(1, 6),
      triggerPrice: expandDecimals(13_500, 30),
    });
    const movedAway = makeDepositOrder({
      initialCollateralDeltaAmount: expandDecimals(1, 6),
      triggerPrice: expandDecimals(16_000, 30),
    });

    expect(errorKeys(getOrderErrors({ ...depositParams, positionsInfoData, order: nearLiquidation }))).toEqual([
      "marginDepositInsufficient",
    ]);
    expect(getOrderErrors({ ...depositParams, positionsInfoData, order: movedAway }).errors).toEqual([]);
  });

  describe("short positions", () => {
    const shortDepositOrder = (overrides: Partial<PositionOrderInfo> = {}) =>
      makeDepositOrder({ isLong: false, ...overrides });

    it("returns the red state when the deposit leaves the short liquidatable at the trigger", () => {
      const position = makeFundedPosition({ isLong: false, liquidationPrice: expandDecimals(29_000, 30) });

      const result = getOrderErrors({
        ...depositParams,
        positionsInfoData: { [position.key]: position },
        order: shortDepositOrder({
          initialCollateralDeltaAmount: expandDecimals(1, 6),
          triggerPrice: expandDecimals(27_000, 30),
        }),
      });

      expect(errorKeys(result)).toEqual(["marginDepositInsufficient"]);
    });

    it("returns the yellow state when the short trigger is at or beyond the current liquidation price", () => {
      const position = makeFundedPosition({ isLong: false, liquidationPrice: expandDecimals(27_000, 30) });

      const result = getOrderErrors({
        ...depositParams,
        positionsInfoData: { [position.key]: position },
        order: shortDepositOrder({
          initialCollateralDeltaAmount: expandDecimals(2_000, 6),
          triggerPrice: expandDecimals(28_000, 30),
        }),
      });

      expect(errorKeys(result)).toEqual(["marginDepositBeyondLiqPrice"]);
      expect(result.level).toBe("warning");
    });

    it("returns no state for a short trigger a safe distance from liquidation", () => {
      const position = makeFundedPosition({ isLong: false, liquidationPrice: expandDecimals(27_000, 30) });

      const result = getOrderErrors({
        ...depositParams,
        positionsInfoData: { [position.key]: position },
        order: shortDepositOrder({
          initialCollateralDeltaAmount: expandDecimals(2_000, 6),
          triggerPrice: expandDecimals(26_000, 30),
        }),
      });

      expect(result.errors).toEqual([]);
    });
  });

  it("skips the standard increase checks that the same order would trip with a size", () => {
    const position = makeFundedPosition({ liquidationPrice: expandDecimals(11_000, 30) });
    const positionsInfoData = { [position.key]: position };

    // the position is alive at the trigger and the projected liq price sits above it,
    // which is exactly what the standard increase path reports as "resultingLiquidatable"
    const params = {
      ...depositParams,
      positionsInfoData,
      isSetAcceptablePriceImpactEnabled: true,
      nextPositionValues: nextValues(expandDecimals(13_000, 30)),
    };

    const deposit = getOrderErrors({
      ...params,
      order: makeDepositOrder({
        initialCollateralDeltaAmount: expandDecimals(2_000, 6),
        triggerPrice: expandDecimals(12_000, 30),
      }),
    });

    expect(deposit.errors).toEqual([]);

    // control: the very same inputs with a positive size do produce the standard error
    const regularIncrease = getOrderErrors({
      ...params,
      order: makeIncreaseOrder(OrderType.LimitIncrease, {
        account: ACCOUNT,
        triggerPrice: expandDecimals(12_000, 30),
      }),
    });

    expect(errorKeys(regularIncrease)).toContain("resultingLiquidatable");
  });
});
