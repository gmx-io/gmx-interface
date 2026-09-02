import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { mockPositionInfo } from "domain/synthetics/testUtils/mocks";
import { expandDecimals } from "lib/numbers";
import { mockMarketsInfoData, mockTokensData } from "sdk/test/mock";
import { convertToTokenAmount } from "sdk/utils/tokens";
import { PositionMarginFailureReason } from "sdk/utils/trade/increaseMarginCheck";

import { NextPositionValues } from "../../trade";
import { OrderType, PositionOrderInfo } from "../types";
import { getOrderErrors, getOrderIncreaseResultingPositionMarginState } from "../utils";

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

  /** 10k BTC position at $20k with $3k USDC margin: liq ≈ $14.2k long, $25.8k short. */
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

  it("reports an orphaned deposit and skips the standard increase checks when no position matches", () => {
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
    expect(errorKeys(result)).toEqual(["marginDepositNoPosition"]);
    expect(result.level).toBe("error");
  });

  it("reports an orphaned deposit when the account has no positions at all", () => {
    const result = getOrderErrors({
      ...depositParams,
      positionsInfoData: {},
      order: makeDepositOrder(),
    });

    expect(errorKeys(result)).toEqual(["marginDepositNoPosition"]);
    expect(result.level).toBe("error");
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

    const funded = makeDepositOrder({
      key: "deposit-funded",
      initialCollateralDeltaAmount: expandDecimals(2_000, 6),
      triggerPrice: expandDecimals(12_000, 30),
    });
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

    // exactly the state the standard increase path reports as "resultingLiquidatable"
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

    // control: the same inputs with a positive size do produce the standard error
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

describe("getOrderErrors — position liquidated before the trigger price", () => {
  const shortPositionKey = `0x1111111111111111111111111111111111111111:${marketInfo.marketTokenAddress}:USDC:false`;
  const longPositionKey = `0x1111111111111111111111111111111111111111:${marketInfo.marketTokenAddress}:USDC:true`;

  function makePosition(key: string, isLong: boolean, liquidationPrice: bigint) {
    return {
      key,
      isLong,
      sizeInUsd: expandDecimals(20_000, 30),
      collateralUsd: expandDecimals(2_000, 30),
      liquidationPrice,
    } as any;
  }

  const hasFreshPositionWarning = (result: ReturnType<typeof getOrderErrors>) =>
    result.errors.some((e) => e.key === "liquidatedBeforeTrigger" && e.level === "warning");

  it("warns for a long Limit Increase when the liq price is above the trigger price", () => {
    const result = getOrderErrors({
      ...baseParams,
      positionsInfoData: { [longPositionKey]: makePosition(longPositionKey, true, expandDecimals(55_000, 30)) },
      order: makeIncreaseOrder(OrderType.LimitIncrease),
    });

    expect(hasFreshPositionWarning(result)).toBe(true);
  });

  it("does not warn for a long Limit Increase when the position survives at the trigger price", () => {
    const result = getOrderErrors({
      ...baseParams,
      positionsInfoData: { [longPositionKey]: makePosition(longPositionKey, true, expandDecimals(45_000, 30)) },
      order: makeIncreaseOrder(OrderType.LimitIncrease),
    });

    expect(hasFreshPositionWarning(result)).toBe(false);
  });

  it("warns for a short Limit Increase when the liq price is below the trigger price", () => {
    const result = getOrderErrors({
      ...baseParams,
      positionsInfoData: { [shortPositionKey]: makePosition(shortPositionKey, false, expandDecimals(45_000, 30)) },
      order: makeIncreaseOrder(OrderType.LimitIncrease, { isLong: false }),
    });

    expect(hasFreshPositionWarning(result)).toBe(true);
  });

  it("does not warn for a short Limit Increase when the position survives at the trigger price", () => {
    const result = getOrderErrors({
      ...baseParams,
      positionsInfoData: { [shortPositionKey]: makePosition(shortPositionKey, false, expandDecimals(55_000, 30)) },
      order: makeIncreaseOrder(OrderType.LimitIncrease, { isLong: false }),
    });

    expect(hasFreshPositionWarning(result)).toBe(false);
  });

  it("does not warn without an existing position", () => {
    const result = getOrderErrors({
      ...baseParams,
      order: makeIncreaseOrder(OrderType.LimitIncrease),
    });

    expect(hasFreshPositionWarning(result)).toBe(false);
  });
});

describe("getOrderErrors — resulting position margin, end-to-end from order + position state", () => {
  const maxLeverageErrors = (result: ReturnType<typeof getOrderErrors>) =>
    result.errors.filter((e) => e.key === "maxLeverage");

  const minCollateralUsd = expandDecimals(1, 30);
  const currentPrice = expandDecimals(20_000, 30); // the mock BTC oracle price

  // fees and impact are zeroed so the scenarios are exact; 1% min collateral factor → 100x
  const cleanMarketsInfoData = mockMarketsInfoData(tokensData, ["BTC-BTC-USDC"], {
    "BTC-BTC-USDC": {
      minCollateralFactor: expandDecimals(1, 28),
      minCollateralFactorForLiquidation: expandDecimals(5, 27),
      minCollateralFactorForOpenInterestLong: 0n,
      minCollateralFactorForOpenInterestShort: 0n,
      positionFeeFactorForBalanceWasImproved: 0n,
      positionFeeFactorForBalanceWasNotImproved: 0n,
      positionImpactFactorPositive: 0n,
      positionImpactFactorNegative: 0n,
      maxPositionImpactFactorPositive: 0n,
      maxPositionImpactFactorNegative: 0n,
      maxPositionImpactFactorForLiquidations: 0n,
    },
  });
  const cleanMarketInfo = cleanMarketsInfoData["BTC-BTC-USDC"];

  function makeCleanOrder(orderType: OrderType, overrides: Partial<PositionOrderInfo> = {}) {
    return makeIncreaseOrder(orderType, {
      marketInfo: cleanMarketInfo,
      marketAddress: cleanMarketInfo.marketTokenAddress,
      indexToken: cleanMarketInfo.indexToken,
      ...overrides,
    });
  }

  /** A long opened exactly at the current oracle price: flat pnl now, ±pnl at any other price. */
  function makeFlatPosition(p: { sizeUsd: number; collateralUsd: number }) {
    const sizeInUsd = expandDecimals(p.sizeUsd, 30);
    return {
      key: "position-key",
      marketInfo: cleanMarketInfo,
      indexToken: cleanMarketInfo.indexToken,
      collateralToken: tokensData.USDC,
      isLong: true,
      sizeInUsd,
      sizeInTokens: convertToTokenAmount(sizeInUsd, cleanMarketInfo.indexToken.decimals, currentPrice)!,
      collateralUsd: expandDecimals(p.collateralUsd, 30),
      collateralAmount: convertToTokenAmount(expandDecimals(p.collateralUsd, 30), tokensData.USDC.decimals, expandDecimals(1, 30))!,
      pendingImpactAmount: 0n,
      pendingBorrowingFeesUsd: 0n,
      pendingFundingFeesUsd: 0n,
    } as any;
  }

  // the full production chain: order + position + market → projection at the evaluation
  // price → contract margin check → order error mark; no hand-made intermediate state
  function runOrderErrors(order: PositionOrderInfo, position?: any) {
    // the same key composition isOrderForPosition matches on, so the order-level check
    // sees the position exactly like in production
    const positionsInfoData = position
      ? {
          [`${order.account}:${order.marketAddress}:${order.targetCollateralToken.address}:${order.isLong}`]: {
            ...position,
            key: `${order.account}:${order.marketAddress}:${order.targetCollateralToken.address}:${order.isLong}`,
          },
        }
      : {};

    return getOrderErrors({
      ...baseParams,
      marketsInfoData: cleanMarketsInfoData,
      positionsInfoData,
      order,
      resultingPositionMarginState: getOrderIncreaseResultingPositionMarginState({
        order,
        position,
        triggerPrice: order.triggerPrice,
        sizeDeltaUsd: order.sizeDeltaUsd,
        findSwapPath: (() => undefined) as any,
        uiFeeFactor: 0n,
        chainId: ARBITRUM,
        marketsInfoData: cleanMarketsInfoData,
        isSetAcceptablePriceImpactEnabled: false,
        minCollateralUsd,
        userReferralInfo: undefined,
      }),
    });
  }

  // 10 USDC of added margin on 4 000 of added size: passes or fails purely on the
  // existing position's pnl at the evaluation price
  const restingBelowMarket = makeCleanOrder(OrderType.LimitIncrease, {
    triggerPrice: expandDecimals(18_000, 30), // −10% from the market
    sizeDeltaUsd: expandDecimals(4_000, 30),
    initialCollateralDeltaAmount: expandDecimals(10, 6),
  });

  const restingAboveMarket = makeCleanOrder(OrderType.StopIncrease, {
    triggerPrice: expandDecimals(22_000, 30), // +10% from the market
    sizeDeltaUsd: expandDecimals(4_000, 30),
    initialCollateralDeltaAmount: expandDecimals(10, 6),
  });

  it("flags a limit below the market whose position loses enough at the trigger (any failure reason)", () => {
    // at the trigger the position loses 100 against 70 of total margin → remaining < 0,
    // which is a "min collateral" failure, not a leverage one — it must still be flagged;
    // at the current price the same order looks healthy (the trigger-priced tokens would
    // show fake instant profit), so this also locks in the trigger-price evaluation
    const result = runOrderErrors(restingBelowMarket, makeFlatPosition({ sizeUsd: 1_000, collateralUsd: 60 }));

    expect(maxLeverageErrors(result)).toHaveLength(1);
    expect(maxLeverageErrors(result)[0].level).toBe("error");
  });

  it("does not flag a stop above the market whose position is healthy at the trigger", () => {
    // at the trigger the position is in profit; evaluating at the current price instead
    // would book a fake 10% loss on the trigger-priced tokens and flag a healthy order
    const result = runOrderErrors(restingAboveMarket, makeFlatPosition({ sizeUsd: 1_000, collateralUsd: 60 }));

    expect(maxLeverageErrors(result)).toHaveLength(0);
  });

  it("does not flag a healthy long limit whose trigger the market has already crossed", () => {
    // the market fell through the trigger, so the keeper can execute right now; the order is
    // still sized at 21 000, and evaluating those tokens at the current 20 000 would book a
    // phantom 190 of loss against 200 of margin and block a 20x order
    const executableNow = makeCleanOrder(OrderType.LimitIncrease, {
      triggerPrice: expandDecimals(21_000, 30),
      sizeDeltaUsd: expandDecimals(4_000, 30),
      initialCollateralDeltaAmount: expandDecimals(200, 6),
    });

    const result = runOrderErrors(executableNow);

    expect(maxLeverageErrors(result)).toHaveLength(0);
  });

  it("does not flag a resting order with sufficient margin", () => {
    const wellMargined = makeCleanOrder(OrderType.LimitIncrease, {
      triggerPrice: expandDecimals(18_000, 30),
      sizeDeltaUsd: expandDecimals(4_000, 30),
      initialCollateralDeltaAmount: expandDecimals(600, 6),
    });

    const result = runOrderErrors(wellMargined, makeFlatPosition({ sizeUsd: 1_000, collateralUsd: 60 }));

    expect(maxLeverageErrors(result)).toHaveLength(0);
  });

  it("suppresses the liq-price heuristic when the precise margin prediction already warns", () => {
    const position = makeFlatPosition({ sizeUsd: 1_000, collateralUsd: 60 });

    // nextLiqPrice beyond the trigger fires the liq-price heuristic on its own
    const withHeuristic = getOrderErrors({
      ...baseParams,
      marketsInfoData: cleanMarketsInfoData,
      order: restingBelowMarket,
      nextPositionValues: { nextLiqPrice: expandDecimals(19_000, 30) } as NextPositionValues,
      resultingPositionMarginState: getOrderIncreaseResultingPositionMarginState({
        order: restingBelowMarket,
        position,
        triggerPrice: restingBelowMarket.triggerPrice,
        sizeDeltaUsd: restingBelowMarket.sizeDeltaUsd,
        findSwapPath: (() => undefined) as any,
        uiFeeFactor: 0n,
        chainId: ARBITRUM,
        marketsInfoData: cleanMarketsInfoData,
        isSetAcceptablePriceImpactEnabled: false,
        minCollateralUsd,
        userReferralInfo: undefined,
      }),
    });

    // the precise prediction fails → only its message shows, the heuristic one is hidden
    expect(maxLeverageErrors(withHeuristic)).toHaveLength(1);
    expect(withHeuristic.errors.filter((e) => e.key === "resultingLiquidatable")).toHaveLength(0);
  });

  it("reports a single deduplicated entry when both checks fail", () => {
    // 10 000 000 of size on 1 000 of margin trips the order-level check and the
    // resulting-position check at once
    const overLeveraged = makeCleanOrder(OrderType.LimitIncrease, {
      triggerPrice: expandDecimals(18_000, 30),
      sizeDeltaUsd: expandDecimals(10_000_000, 30),
      initialCollateralDeltaAmount: expandDecimals(1_000, 6),
    });

    const both = runOrderErrors(overLeveraged);

    expect(maxLeverageErrors(both)).toHaveLength(1);
    expect(maxLeverageErrors(both)[0].level).toBe("error");
  });
});

describe("getOrderIncreaseResultingPositionMarginState", () => {
  const triggerPrice = expandDecimals(20_000, 30);

  const baseArgs = {
    position: undefined,
    triggerPrice,
    sizeDeltaUsd: expandDecimals(10_000, 30),
    findSwapPath: (() => undefined) as any,
    uiFeeFactor: 0n,
    chainId: ARBITRUM,
    marketsInfoData,
    isSetAcceptablePriceImpactEnabled: false,
    minCollateralUsd: expandDecimals(1, 30),
    userReferralInfo: undefined,
  };

  function makeLosingPosition(sizeInUsd: bigint, valueAtOracle: bigint, collateralUsd: bigint) {
    return {
      key: "position-key",
      marketInfo,
      indexToken: marketInfo.indexToken,
      collateralToken: tokensData.USDC,
      isLong: true,
      sizeInUsd,
      sizeInTokens: convertToTokenAmount(valueAtOracle, marketInfo.indexToken.decimals, triggerPrice)!,
      collateralUsd,
      collateralAmount: convertToTokenAmount(collateralUsd, tokensData.USDC.decimals, expandDecimals(1, 30))!,
      pendingImpactAmount: 0n,
      pendingBorrowingFeesUsd: 0n,
      pendingFundingFeesUsd: 0n,
    } as any;
  }

  it("returns undefined without a usable trigger price", () => {
    expect(
      getOrderIncreaseResultingPositionMarginState({
        ...baseArgs,
        order: makeIncreaseOrder(OrderType.LimitIncrease),
        triggerPrice: 0n,
      })
    ).toBeUndefined();
  });

  it("returns undefined for a decrease order", () => {
    expect(
      getOrderIncreaseResultingPositionMarginState({
        ...baseArgs,
        order: makeIncreaseOrder(OrderType.LimitDecrease),
      })
    ).toBeUndefined();
  });

  it("passes for a healthy standalone order", () => {
    const state = getOrderIncreaseResultingPositionMarginState({
      ...baseArgs,
      order: makeIncreaseOrder(OrderType.LimitIncrease, { triggerPrice }),
    });

    expect(state?.isLiquidatable).toBe(false);
  });

  it("fails when the existing position's loss eats the resulting margin", () => {
    const state = getOrderIncreaseResultingPositionMarginState({
      ...baseArgs,
      order: makeIncreaseOrder(OrderType.LimitIncrease, { triggerPrice }),
      // 100 000 of size now worth 99 000 → 1 000 of loss against 1 300 of margin: the raw-collateral
      // sufficiency gate passes (1 300 > 1 100 the resulting 110 000 of size needs), while the
      // pnl-aware validation is left with ~300
      position: makeLosingPosition(expandDecimals(100_000, 30), expandDecimals(99_000, 30), expandDecimals(300, 30)),
    });

    expect(state?.reason).toBe(PositionMarginFailureReason.MinCollateralForLeverage);
  });

  it("projects onto a fresh position when the existing one is liquidated before the trigger", () => {
    const doomed = makeLosingPosition(
      expandDecimals(100_000, 30),
      expandDecimals(99_000, 30),
      expandDecimals(100, 30)
    );
    doomed.liquidationPrice = expandDecimals(21_000, 30);

    const state = getOrderIncreaseResultingPositionMarginState({
      ...baseArgs,
      order: makeIncreaseOrder(OrderType.LimitIncrease, { triggerPrice }),
      position: doomed,
    });
    const fresh = getOrderIncreaseResultingPositionMarginState({
      ...baseArgs,
      order: makeIncreaseOrder(OrderType.LimitIncrease, { triggerPrice }),
      position: undefined,
    });

    expect(state?.isLiquidatable).toBe(false);
    expect(state).toEqual(fresh);
  });

  it("charges the ui fee factor snapshotted on the order, not the live one", () => {
    const order = makeIncreaseOrder(OrderType.LimitIncrease, {
      triggerPrice,
      uiFeeFactor: expandDecimals(1, 28),
    } as any);

    const noFee = getOrderIncreaseResultingPositionMarginState({
      ...baseArgs,
      order: makeIncreaseOrder(OrderType.LimitIncrease, { triggerPrice }),
      uiFeeFactor: 0n,
    });

    // the order carries the factor, the live one is zero → the fee must still be charged
    const orderFactor = getOrderIncreaseResultingPositionMarginState({ ...baseArgs, order, uiFeeFactor: 0n });

    // the order carries an explicit zero → the live factor must be ignored
    const orderZeroFactor = getOrderIncreaseResultingPositionMarginState({
      ...baseArgs,
      order: makeIncreaseOrder(OrderType.LimitIncrease, { triggerPrice, uiFeeFactor: 0n } as any),
      uiFeeFactor: expandDecimals(1, 28),
    });

    expect(orderFactor!.remainingCollateralUsd).toBeLessThan(noFee!.remainingCollateralUsd);
    expect(orderZeroFactor!.remainingCollateralUsd).toBe(noFee!.remainingCollateralUsd);
  });
});

describe("getOrderIncreaseResultingPositionMarginState — degraded inputs never become a violation", () => {
  const triggerPrice = expandDecimals(18_000, 30);

  function makeSwapCollateralOrder(initialCollateralToken: PositionOrderInfo["initialCollateralToken"]) {
    const isSameToken = initialCollateralToken.address === tokensData.USDC.address;

    return makeIncreaseOrder(OrderType.LimitIncrease, {
      initialCollateralToken,
      initialCollateralTokenAddress: initialCollateralToken.address,
      targetCollateralToken: tokensData.USDC,
      swapPath: isSameToken ? [] : ["0xswapMarket"],
      triggerPrice,
      sizeDeltaUsd: expandDecimals(1_000, 30),
      // 500 USD of margin on 1 000 of size — healthy at a 1% min collateral factor
      initialCollateralDeltaAmount: isSameToken
        ? expandDecimals(500, 6)
        : convertToTokenAmount(
            expandDecimals(500, 30),
            initialCollateralToken.decimals,
            initialCollateralToken.prices.minPrice
          )!,
    });
  }

  function runProjection(order: PositionOrderInfo) {
    return getOrderIncreaseResultingPositionMarginState({
      order,
      position: undefined,
      triggerPrice,
      sizeDeltaUsd: order.sizeDeltaUsd,
      // no route: what `makeSelectFindSwapPath` returns while markets load or a route is gone
      findSwapPath: (() => undefined) as any,
      uiFeeFactor: 0n,
      chainId: ARBITRUM,
      marketsInfoData,
      isSetAcceptablePriceImpactEnabled: false,
      minCollateralUsd: expandDecimals(1, 30),
      userReferralInfo: undefined,
    });
  }

  it("projects a same-token deposit without a route and finds it healthy", () => {
    expect(runProjection(makeSwapCollateralOrder(tokensData.USDC))?.isLiquidatable).toBe(false);
  });

  it("gives up instead of reading an unroutable swap deposit as an empty one", () => {
    // the swap yields nothing, so the deposit cannot be valued — the healthy order must not be flagged
    expect(runProjection(makeSwapCollateralOrder(tokensData.ETH))).toBeUndefined();
  });
});
