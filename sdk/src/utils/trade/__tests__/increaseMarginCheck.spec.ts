import { describe, expect, it } from "vitest";

import { mockMarketsInfoData, mockTokensData } from "test/mock";
import { bigMath } from "utils/bigmath";
import { capPositionImpactUsdByMaxPriceImpactFactor, getPriceImpactForPosition } from "utils/fees";
import { getMarketInfoWithOpenInterestDelta } from "utils/markets";
import { USD_DECIMALS, expandDecimals, roundUpMagnitudeDivision } from "utils/numbers";
import { convertToTokenAmount, convertToUsd } from "utils/tokens";
import {
  PositionMarginFailureReason,
  type PositionMarginStateParams,
  getIncreaseResultingPositionMarginState,
  getIsMaxLeverageMarginReason,
  getResultingPositionMarginState,
} from "utils/trade/increaseMarginCheck";

const BTC_PRICE = expandDecimals(20000, 30);

const tokensData = mockTokensData();

/** 1% min collateral factor → 100x, 0.5% for liquidation. Fees and impact off unless a test needs them. */
function buildMarket(overrides: Record<string, bigint | boolean> = {}) {
  return mockMarketsInfoData(tokensData, ["BTC-BTC-USDC"], {
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
      longInterestUsd: 0n,
      shortInterestUsd: 0n,
      longInterestInTokens: 0n,
      shortInterestInTokens: 0n,
      ...overrides,
    },
  })["BTC-BTC-USDC"];
}

const usdc = tokensData.USDC;

function usdcAmount(usd: number) {
  return convertToTokenAmount(usd10(usd), usdc.decimals, usdc.prices.minPrice)!;
}

/** USD value with 30 decimals, accepting fractional amounts. */
function usd10(usd: number) {
  return (BigInt(Math.round(usd * 100)) * expandDecimals(1, USD_DECIMALS)) / 100n;
}

function btcAmount(usd: number) {
  return convertToTokenAmount(expandDecimals(usd, USD_DECIMALS), tokensData.BTC.decimals, BTC_PRICE)!;
}

function baseParams(overrides: Partial<Parameters<typeof getResultingPositionMarginState>[0]> = {}) {
  return {
    marketInfo: buildMarket(),
    collateralToken: usdc,
    // 10 000 USD of size bought exactly at the oracle price → zero pnl
    sizeInUsd: expandDecimals(10_000, USD_DECIMALS),
    sizeInTokens: btcAmount(10_000),
    collateralAmount: usdcAmount(100),
    pendingImpactAmount: 0n,
    minCollateralUsd: expandDecimals(1, USD_DECIMALS),
    isLong: true,
    userReferralInfo: undefined,
    ...overrides,
  };
}

describe("getResultingPositionMarginState", () => {
  it("passes when remaining margin equals the leverage-based minimum", () => {
    // 1% of 10 000 = 100, and the position has exactly 100 of collateral
    const state = getResultingPositionMarginState(baseParams());

    expect(state.minCollateralUsdForLeverage).toBe(expandDecimals(100, USD_DECIMALS));
    expect(state.remainingCollateralUsd).toBe(expandDecimals(100, USD_DECIMALS));
    expect(state.isLiquidatable).toBe(false);
    expect(state.reason).toBeUndefined();
  });

  it("fails with the leverage reason just below the minimum", () => {
    const state = getResultingPositionMarginState(baseParams({ collateralAmount: usdcAmount(99.99) }));

    expect(state.isLiquidatable).toBe(true);
    expect(state.reason).toBe(PositionMarginFailureReason.MinCollateralForLeverage);
  });

  it("uses the regular minCollateralFactor, not the liquidation one", () => {
    // 0.5% of 10 000 = 50, so a liquidation-factor check would pass at 60 of collateral
    const params = baseParams({ collateralAmount: usdcAmount(60) });

    expect(getResultingPositionMarginState(params).reason).toBe(PositionMarginFailureReason.MinCollateralForLeverage);
  });

  it("counts unrealized loss against the remaining margin for a long", () => {
    // bought 10 000 USD worth of BTC at 25 000 while the oracle is at 20 000 → -2 000 pnl
    const state = getResultingPositionMarginState(
      baseParams({
        sizeInTokens: convertToTokenAmount(
          expandDecimals(10_000, USD_DECIMALS),
          tokensData.BTC.decimals,
          expandDecimals(25_000, 30)
        )!,
        collateralAmount: usdcAmount(2_500),
      })
    );

    expect(state.remainingCollateralUsd).toBe(expandDecimals(500, USD_DECIMALS));
    expect(state.isLiquidatable).toBe(false);
  });

  it("counts unrealized loss against the remaining margin for a short", () => {
    // a short holding more tokens than it sold is losing when priced at the oracle max
    const state = getResultingPositionMarginState(
      baseParams({
        isLong: false,
        sizeInTokens: btcAmount(12_000),
        collateralAmount: usdcAmount(2_500),
      })
    );

    expect(state.remainingCollateralUsd).toBe(expandDecimals(500, USD_DECIMALS));
    expect(state.isLiquidatable).toBe(false);
  });

  it("reports the fixed minimum before the leverage reason", () => {
    const state = getResultingPositionMarginState(
      baseParams({
        collateralAmount: usdcAmount(0.5),
        minCollateralUsd: expandDecimals(1, USD_DECIMALS),
      })
    );

    expect(state.reason).toBe(PositionMarginFailureReason.MinCollateral);
  });

  it("reports non-positive remaining margin before the leverage reason", () => {
    const state = getResultingPositionMarginState(
      baseParams({
        collateralAmount: 0n,
        minCollateralUsd: 0n,
      })
    );

    expect(state.reason).toBe(PositionMarginFailureReason.NonPositiveRemainingMargin);
  });

  it("deducts the full-close position fee once", () => {
    // 0.5% closing fee on 10 000 = 50
    const state = getResultingPositionMarginState(
      baseParams({
        marketInfo: buildMarket({
          positionFeeFactorForBalanceWasImproved: expandDecimals(5, 27),
          positionFeeFactorForBalanceWasNotImproved: expandDecimals(5, 27),
        }),
      })
    );

    expect(state.remainingCollateralUsd).toBe(expandDecimals(50, USD_DECIMALS));
    expect(state.reason).toBe(PositionMarginFailureReason.MinCollateralForLeverage);
  });

  it("applies the pro-tier discount to the closing fee", () => {
    // 0.5% closing fee on 10 000 = 50; a 50% pro discount returns 25 of it
    const state = getResultingPositionMarginState({
      ...baseParams({
        marketInfo: buildMarket({
          positionFeeFactorForBalanceWasImproved: expandDecimals(5, 27),
          positionFeeFactorForBalanceWasNotImproved: expandDecimals(5, 27),
        }),
      }),
      proDiscountFactor: expandDecimals(5, 29),
    });

    expect(state.remainingCollateralUsd).toBe(expandDecimals(75, USD_DECIMALS));
  });

  it("takes the larger of the pro and referral discounts, not their sum", () => {
    const params = baseParams({
      marketInfo: buildMarket({
        positionFeeFactorForBalanceWasImproved: expandDecimals(5, 27),
        positionFeeFactorForBalanceWasNotImproved: expandDecimals(5, 27),
      }),
    });
    // 20% rebate × 50% trader share → a 10% referral discount, 5 of the 50 fee
    const userReferralInfo = {
      totalRebateFactor: expandDecimals(2, 29),
      discountFactor: expandDecimals(5, 29),
    } as unknown as NonNullable<PositionMarginStateParams["userReferralInfo"]>;

    // 50% pro discount (25) beats the referral 5
    const proWins = getResultingPositionMarginState({
      ...params,
      userReferralInfo,
      proDiscountFactor: expandDecimals(5, 29),
    });
    expect(proWins.remainingCollateralUsd).toBe(expandDecimals(75, USD_DECIMALS));

    // 5% pro discount (2.5) loses to the referral 5
    const referralWins = getResultingPositionMarginState({
      ...params,
      userReferralInfo,
      proDiscountFactor: expandDecimals(5, 28),
    });
    expect(referralWins.remainingCollateralUsd).toBe(expandDecimals(55, USD_DECIMALS));
  });
});

describe("getIncreaseResultingPositionMarginState", () => {
  const marketInfo = buildMarket();
  // the contract clamps negative impact at maxPositionImpactFactorForLiquidations — 1% of size here
  const marketWithImpactCap = buildMarket({ maxPositionImpactFactorForLiquidations: expandDecimals(1, 28) });

  it("returns undefined when there is no size to validate", () => {
    expect(
      getIncreaseResultingPositionMarginState({
        marketInfo,
        collateralToken: usdc,
        isLong: true,
        existingPosition: undefined,
        sizeDeltaUsd: 0n,
        sizeDeltaInTokens: 0n,
        collateralDeltaAmount: usdcAmount(100),
        minCollateralUsd: expandDecimals(1, USD_DECIMALS),
        userReferralInfo: undefined,
      })
    ).toBeUndefined();
  });

  it("returns undefined instead of crashing when the oracle prices are zeroed", () => {
    // a delisted market reports zeroed prices while its resting orders are still rendered
    const zeroPriceTokens = mockTokensData({ BTC: { prices: { minPrice: 0n, maxPrice: 0n } } } as any);
    const zeroPriceMarket = mockMarketsInfoData(zeroPriceTokens, ["BTC-BTC-USDC"], {})["BTC-BTC-USDC"];

    expect(
      getIncreaseResultingPositionMarginState({
        marketInfo: zeroPriceMarket,
        collateralToken: zeroPriceTokens.USDC,
        isLong: true,
        existingPosition: undefined,
        sizeDeltaUsd: expandDecimals(1_000, USD_DECIMALS),
        sizeDeltaInTokens: expandDecimals(5, 6),
        collateralDeltaAmount: usdcAmount(100),
        minCollateralUsd: expandDecimals(1, USD_DECIMALS),
        userReferralInfo: undefined,
      })
    ).toBeUndefined();
  });

  it("passes for a fresh position at exactly the max leverage", () => {
    const state = getIncreaseResultingPositionMarginState({
      marketInfo,
      collateralToken: usdc,
      isLong: true,
      existingPosition: undefined,
      sizeDeltaUsd: expandDecimals(10_000, USD_DECIMALS),
      sizeDeltaInTokens: btcAmount(10_000),
      collateralDeltaAmount: usdcAmount(100),
      minCollateralUsd: expandDecimals(1, USD_DECIMALS),
      userReferralInfo: undefined,
    });

    expect(state?.isLiquidatable).toBe(false);
  });

  it("fails when an existing position's unrealized loss eats the resulting margin", () => {
    // the existing long bought at 25 000 while the oracle is at 20 000 → -2 000 pnl,
    // which the order-level max-leverage check ignores by design
    const existingPosition = {
      sizeInUsd: expandDecimals(10_000, USD_DECIMALS),
      sizeInTokens: convertToTokenAmount(
        expandDecimals(10_000, USD_DECIMALS),
        tokensData.BTC.decimals,
        expandDecimals(25_000, 30)
      )!,
      collateralAmount: usdcAmount(2_000),
      pendingImpactAmount: 0n,
    };

    const state = getIncreaseResultingPositionMarginState({
      marketInfo,
      collateralToken: usdc,
      isLong: true,
      existingPosition,
      sizeDeltaUsd: expandDecimals(10_000, USD_DECIMALS),
      sizeDeltaInTokens: btcAmount(10_000),
      collateralDeltaAmount: usdcAmount(100),
      minCollateralUsd: expandDecimals(1, USD_DECIMALS),
      userReferralInfo: undefined,
    });

    // collateral 2 100 − 2 000 of loss = 100 remaining, but 1% of 20 000 of size needs 200
    expect(state?.remainingCollateralUsd).toBe(expandDecimals(100, USD_DECIMALS));
    expect(state?.minCollateralUsdForLeverage).toBe(expandDecimals(200, USD_DECIMALS));
    expect(state?.reason).toBe(PositionMarginFailureReason.MinCollateralForLeverage);
  });

  it("carries the increase's own negative price impact into the resulting position", () => {
    // shorts dominate, so increasing a long is a same-side rebalance towards balance for the
    // close leg (positive close impact, clamped away) while the increase leg pays negative
    // impact that is stored as pending impact on the position
    const imbalancedMarket = buildMarket({
      maxPositionImpactFactorForLiquidations: expandDecimals(1, 28),
      positionImpactFactorNegative: expandDecimals(1, 22),
      positionImpactExponentFactorPositive: expandDecimals(2, 30),
      positionImpactExponentFactorNegative: expandDecimals(2, 30),
      longInterestUsd: expandDecimals(1_000_000, USD_DECIMALS),
      shortInterestUsd: expandDecimals(500_000, USD_DECIMALS),
      longInterestInTokens: btcAmount(1_000_000),
      shortInterestInTokens: btcAmount(500_000),
      useOpenInterestInTokensForBalance: false,
    });

    const run = (marketInfoForRun: typeof imbalancedMarket) =>
      getIncreaseResultingPositionMarginState({
        marketInfo: marketInfoForRun,
        collateralToken: usdc,
        isLong: true,
        existingPosition: undefined,
        sizeDeltaUsd: expandDecimals(10_000, USD_DECIMALS),
        sizeDeltaInTokens: btcAmount(10_000),
        collateralDeltaAmount: usdcAmount(150),
        minCollateralUsd: expandDecimals(1, USD_DECIMALS),
        userReferralInfo: undefined,
      });

    const withImpact = run(imbalancedMarket);
    const withoutImpact = run(marketWithImpactCap);

    expect(withoutImpact?.isLiquidatable).toBe(false);
    // the increase's negative impact reduces the remaining margin below 1% of the size
    expect(withImpact!.remainingCollateralUsd).toBeLessThan(withoutImpact!.remainingCollateralUsd);
    expect(withImpact?.reason).toBe(PositionMarginFailureReason.MinCollateralForLeverage);
  });
});

describe("getResultingPositionMarginState — oracle sides", () => {
  // a spread on both tokens, so picking the wrong side is visible
  const spreadTokens = mockTokensData({
    BTC: { prices: { minPrice: expandDecimals(20_000, 30), maxPrice: expandDecimals(25_000, 30) } },
    USDC: { prices: { minPrice: expandDecimals(99, 28), maxPrice: expandDecimals(101, 28) } },
  } as any);

  const spreadUsdc = spreadTokens.USDC;
  const spreadBtc = spreadTokens.BTC;

  function spreadMarket() {
    return mockMarketsInfoData(spreadTokens, ["BTC-BTC-USDC"], {
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
        // 1% of size, high enough not to clamp the impact these tests use
        maxPositionImpactFactorForLiquidations: expandDecimals(1, 28),
        longInterestUsd: 0n,
        shortInterestUsd: 0n,
        longInterestInTokens: 0n,
        shortInterestInTokens: 0n,
      },
    })["BTC-BTC-USDC"];
  }

  // bought exactly at the min price, so the pnl leg contributes nothing
  const spreadParams = {
    marketInfo: spreadMarket(),
    collateralToken: spreadUsdc,
    sizeInUsd: expandDecimals(10_000, USD_DECIMALS),
    sizeInTokens: convertToTokenAmount(
      expandDecimals(10_000, USD_DECIMALS),
      spreadBtc.decimals,
      expandDecimals(20_000, 30)
    )!,
    collateralAmount: expandDecimals(1000, spreadUsdc.decimals),
    pendingImpactAmount: 0n,
    minCollateralUsd: expandDecimals(1, USD_DECIMALS),
    isLong: true,
    userReferralInfo: undefined,
  };

  it("values the collateral at its min price", () => {
    // 1 000 USDC at 0.99, not at 1.01 or at the mid price
    expect(getResultingPositionMarginState(spreadParams).remainingCollateralUsd).toBe(
      expandDecimals(990, USD_DECIMALS)
    );
  });

  it("ignores a net-positive pending impact", () => {
    // the contract clamps the total impact at zero, so favourable impact never adds margin
    const state = getResultingPositionMarginState({
      ...spreadParams,
      pendingImpactAmount: convertToTokenAmount(
        expandDecimals(50, USD_DECIMALS),
        spreadBtc.decimals,
        expandDecimals(20_000, 30)
      )!,
    });

    expect(state.remainingCollateralUsd).toBe(expandDecimals(990, USD_DECIMALS));
  });

  it("values a negative pending impact at the index max price", () => {
    const pendingImpactAmount = -convertToTokenAmount(
      expandDecimals(50, USD_DECIMALS),
      spreadBtc.decimals,
      expandDecimals(25_000, 30)
    )!;

    const state = getResultingPositionMarginState({ ...spreadParams, pendingImpactAmount });

    const atMaxPrice = convertToUsd(pendingImpactAmount, spreadBtc.decimals, expandDecimals(25_000, 30))!;
    const atMinPrice = convertToUsd(pendingImpactAmount, spreadBtc.decimals, expandDecimals(20_000, 30))!;

    expect(state.remainingCollateralUsd).toBe(expandDecimals(990, USD_DECIMALS) + atMaxPrice);
    expect(state.remainingCollateralUsd).not.toBe(expandDecimals(990, USD_DECIMALS) + atMinPrice);
  });
});

describe("getIncreaseResultingPositionMarginState — open interest projection", () => {
  const impactTokens = mockTokensData();

  function impactMarket(useOpenInterestInTokensForBalance: boolean) {
    return mockMarketsInfoData(impactTokens, ["BTC-BTC-USDC"], {
      "BTC-BTC-USDC": {
        minCollateralFactor: expandDecimals(1, 28),
        minCollateralFactorForLiquidation: expandDecimals(5, 27),
        minCollateralFactorForOpenInterestLong: 0n,
        minCollateralFactorForOpenInterestShort: 0n,
        positionFeeFactorForBalanceWasImproved: 0n,
        positionFeeFactorForBalanceWasNotImproved: 0n,
        positionImpactFactorPositive: expandDecimals(5, 19),
        positionImpactFactorNegative: expandDecimals(1, 20),
        positionImpactExponentFactorPositive: expandDecimals(2, 30),
        positionImpactExponentFactorNegative: expandDecimals(2, 30),
        maxPositionImpactFactorPositive: expandDecimals(1, 29),
        maxPositionImpactFactorNegative: expandDecimals(1, 29),
        maxPositionImpactFactorForLiquidations: expandDecimals(1, 29),
        // shorts dominate, so closing the resulting long widens the imbalance and the
        // close impact is negative — a positive one would just be clamped away
        longInterestUsd: expandDecimals(100_000, USD_DECIMALS),
        shortInterestUsd: expandDecimals(2_000_000, USD_DECIMALS),
        longInterestInTokens: btcAmount(100_000),
        shortInterestInTokens: btcAmount(2_000_000),
        useOpenInterestInTokensForBalance,
      },
    })["BTC-BTC-USDC"];
  }

  const sizeDeltaUsd = expandDecimals(100_000, USD_DECIMALS);
  const sizeDeltaInTokens = btcAmount(100_000);

  it.each([false, true])(
    "validates against the market state after the order (useOpenInterestInTokensForBalance=%s)",
    (useOpenInterestInTokensForBalance) => {
      const marketInfo = impactMarket(useOpenInterestInTokensForBalance);

      const actual = getIncreaseResultingPositionMarginState({
        marketInfo,
        collateralToken: usdc,
        isLong: true,
        existingPosition: undefined,
        sizeDeltaUsd,
        sizeDeltaInTokens,
        collateralDeltaAmount: usdcAmount(5_000),
        minCollateralUsd: expandDecimals(1, USD_DECIMALS),
        userReferralInfo: undefined,
      });

      // the increase's own impact the projection stores as pending impact, replicated here:
      // computed on the pre-order market, positive side capped, converted with the contract's rounding
      const increaseImpact = getPriceImpactForPosition(marketInfo, sizeDeltaUsd, true, { sizeDeltaInTokens });
      let increaseImpactUsd = increaseImpact.priceImpactDeltaUsd;
      if (increaseImpactUsd > 0n) {
        increaseImpactUsd = capPositionImpactUsdByMaxPriceImpactFactor(marketInfo, sizeDeltaUsd, increaseImpactUsd);
      }
      const increasePendingImpactAmount =
        increaseImpactUsd > 0n
          ? convertToTokenAmount(increaseImpactUsd, tokensData.BTC.decimals, tokensData.BTC.prices.maxPrice)!
          : roundUpMagnitudeDivision(
              increaseImpactUsd * expandDecimals(1, tokensData.BTC.decimals),
              tokensData.BTC.prices.minPrice
            );

      const resultingPosition = {
        collateralToken: usdc,
        sizeInUsd: sizeDeltaUsd,
        sizeInTokens: sizeDeltaInTokens,
        collateralAmount: usdcAmount(5_000),
        pendingImpactAmount: increasePendingImpactAmount,
        minCollateralUsd: expandDecimals(1, USD_DECIMALS),
        isLong: true,
        userReferralInfo: undefined,
      };

      const expected = getResultingPositionMarginState({
        ...resultingPosition,
        marketInfo: getMarketInfoWithOpenInterestDelta({
          marketInfo,
          collateralToken: usdc,
          isLong: true,
          sizeDeltaUsd,
          sizeDeltaInTokens,
        }),
      });

      expect(actual).toEqual(expected);

      // and the projection is not a no-op: the pre-order market gives a different close impact
      const withoutProjection = getResultingPositionMarginState({ ...resultingPosition, marketInfo });

      expect(withoutProjection.remainingCollateralUsd).not.toBe(expected.remainingCollateralUsd);
    }
  );
});

/**
 * Ported from the contracts repo: `test/exchange/MarketIncreaseOrder.ts`,
 * "validates collateral amount". The market config mirrors `hardhatBaseMarketConfig`
 * from `config/markets.ts`, the numbers are the ones the contract test uses.
 *
 * A short is opened at 5 000 and the index then moves to 5 500; the second increase is
 * cancelled by the contract with `LiquidatablePosition`, and goes through once the added
 * collateral is doubled.
 */
describe("contract parity — MarketIncreaseOrder «validates collateral amount»", () => {
  const ETH_PRICE = expandDecimals(5_500, 30);

  const hardhatTokens = mockTokensData({
    ETH: { prices: { minPrice: ETH_PRICE, maxPrice: ETH_PRICE } },
  } as any);

  const hardhatUsdc = hardhatTokens.USDC;

  // hardhatBaseMarketConfig: 1% min collateral factor, 1% for liquidation,
  // no open-interest scaling, 1% cap on the liquidation impact; the test sets 0.05% position fee
  const marketInfo = mockMarketsInfoData(hardhatTokens, ["ETH-ETH-USDC"], {
    "ETH-ETH-USDC": {
      minCollateralFactor: expandDecimals(1, 28),
      minCollateralFactorForLiquidation: expandDecimals(1, 28),
      minCollateralFactorForOpenInterestLong: 0n,
      minCollateralFactorForOpenInterestShort: 0n,
      positionFeeFactorForBalanceWasImproved: expandDecimals(5, 26),
      positionFeeFactorForBalanceWasNotImproved: expandDecimals(5, 26),
      positionImpactFactorPositive: 0n,
      positionImpactFactorNegative: 0n,
      maxPositionImpactFactorPositive: 0n,
      maxPositionImpactFactorNegative: 0n,
      maxPositionImpactFactorForLiquidations: expandDecimals(1, 28),
      longInterestUsd: 0n,
      shortInterestUsd: 0n,
      longInterestInTokens: 0n,
      shortInterestInTokens: 0n,
    },
  })["ETH-ETH-USDC"];

  const sizeDeltaUsd = expandDecimals(20_000, USD_DECIMALS);
  // the first order sold 20 000 USD worth of ETH at 5 000
  const existingPosition = {
    sizeInUsd: sizeDeltaUsd,
    sizeInTokens: expandDecimals(4, 18),
    collateralAmount: expandDecimals(990, 6), // 1 000 USDC less the 0.05% position fee
    pendingImpactAmount: 0n,
  };

  function runIncrease(collateralDeltaAmount: bigint) {
    return getIncreaseResultingPositionMarginState({
      marketInfo,
      collateralToken: hardhatUsdc,
      isLong: false,
      existingPosition,
      sizeDeltaUsd,
      sizeDeltaInTokens: convertToTokenAmount(sizeDeltaUsd, 18, ETH_PRICE)!,
      collateralDeltaAmount,
      minCollateralUsd: expandDecimals(1, USD_DECIMALS),
      userReferralInfo: undefined,
    });
  }

  /** The contract compares in 30-decimal USD; a cent of tolerance absorbs token-level rounding. */
  const ONE_CENT = expandDecimals(1, USD_DECIMALS) / 100n;

  it("rejects the second increase the contract cancels", () => {
    // 1 000 USDC added, less the 0.05% fee
    const state = runIncrease(expandDecimals(990, 6));

    // collateral 1 980, unrealized loss 2 000, closing fee 20 → the margin goes negative
    expect(state?.remainingCollateralUsd).toBeLessThan(0n);
    expect(bigMath.abs(state!.remainingCollateralUsd - -expandDecimals(40, USD_DECIMALS))).toBeLessThan(ONE_CENT);
    expect(state?.isLiquidatable).toBe(true);
    // the fixed minimum is checked before the leverage one, so this is the reason the contract reports
    expect(state?.reason).toBe(PositionMarginFailureReason.MinCollateral);
  });

  it("accepts the same increase with doubled collateral", () => {
    // 2 000 USDC added, less the 0.05% fee
    const state = runIncrease(expandDecimals(1_990, 6));

    expect(bigMath.abs(state!.remainingCollateralUsd - expandDecimals(960, USD_DECIMALS))).toBeLessThan(ONE_CENT);
    expect(state?.minCollateralUsdForLeverage).toBe(expandDecimals(400, USD_DECIMALS));
    expect(state?.isLiquidatable).toBe(false);
    expect(state?.reason).toBeUndefined();
  });
});

describe("getIncreaseResultingPositionMarginState — open-interest min collateral gate", () => {
  // 2e-8 multiplier: with 1 000 000 of post-order side OI the OI-scaled factor is 2%,
  // above the 1% market minCollateralFactor
  const OI_MULTIPLIER = expandDecimals(2, 22);

  function gateArgs(collateralUsd: number, marketOverrides: Record<string, bigint | boolean> = {}) {
    return {
      marketInfo: buildMarket({
        minCollateralFactorForOpenInterestLong: OI_MULTIPLIER,
        longInterestUsd: expandDecimals(990_000, USD_DECIMALS),
        ...marketOverrides,
      }),
      collateralToken: usdc,
      isLong: true,
      existingPosition: undefined,
      sizeDeltaUsd: expandDecimals(10_000, USD_DECIMALS),
      sizeDeltaInTokens: btcAmount(10_000),
      collateralDeltaAmount: usdcAmount(collateralUsd),
      minCollateralUsd: expandDecimals(1, USD_DECIMALS),
      userReferralInfo: undefined,
    };
  }

  it("fails with its own reason when the OI-scaled factor exceeds the market one", () => {
    // post-order OI 1 000 000 → factor 2%, threshold 200; the plain leverage gate (1% → 100) passes
    const state = getIncreaseResultingPositionMarginState(gateArgs(150));

    expect(state?.isLiquidatable).toBe(true);
    expect(state?.reason).toBe(PositionMarginFailureReason.InsufficientCollateralUsd);
    expect(getIsMaxLeverageMarginReason(state?.reason)).toBe(true);
    expect(state?.remainingCollateralUsd).toBe(expandDecimals(150, USD_DECIMALS));
    expect(state?.minCollateralUsdForLeverage).toBe(expandDecimals(200, USD_DECIMALS));
  });

  it("passes at exact equality with the threshold", () => {
    expect(getIncreaseResultingPositionMarginState(gateArgs(200))?.isLiquidatable).toBe(false);
  });

  it("evaluates the factor against the post-order open interest", () => {
    // pre-order OI would give 1.98% → 198 and let 199 pass; post-order 2% → 200 rejects it
    const state = getIncreaseResultingPositionMarginState(gateArgs(199));

    expect(state?.reason).toBe(PositionMarginFailureReason.InsufficientCollateralUsd);
  });

  it("takes precedence over the leverage reason when both fail", () => {
    expect(getIncreaseResultingPositionMarginState(gateArgs(50))?.reason).toBe(
      PositionMarginFailureReason.InsufficientCollateralUsd
    );
  });

  it("falls back to the market factor when the multiplier contribution is smaller", () => {
    // 10 000 of post-order OI → OI factor 0.02%, the 1% market factor governs → 150 passes
    const state = getIncreaseResultingPositionMarginState(gateArgs(150, { longInterestUsd: 0n }));

    expect(state?.isLiquidatable).toBe(false);
  });
});

describe("getIncreaseResultingPositionMarginState — evaluation at the trigger price", () => {
  const marketInfo = buildMarket();
  const minCollateralUsd = expandDecimals(1, USD_DECIMALS);

  // existing long opened at the current price (20 000): flat pnl at current prices
  const existingPosition = {
    sizeInUsd: expandDecimals(1_000, USD_DECIMALS),
    sizeInTokens: btcAmount(1_000),
    collateralAmount: usdcAmount(60),
    pendingImpactAmount: 0n,
  };

  /** Rounding loss of converting `usd` into whole token units at `price` and back. */
  function tokenConversionDust(usd: bigint, price: bigint) {
    const tokens = convertToTokenAmount(usd, tokensData.BTC.decimals, price)!;
    return usd - convertToUsd(tokens, tokensData.BTC.decimals, price)!;
  }

  // the order enters at the trigger, so its own tokens have zero pnl at that price
  function increaseAt(triggerPrice: bigint, indexPriceForEvaluation: bigint | undefined) {
    const sizeDeltaUsd = expandDecimals(4_000, USD_DECIMALS);

    return getIncreaseResultingPositionMarginState({
      marketInfo,
      collateralToken: usdc,
      isLong: true,
      existingPosition,
      sizeDeltaUsd,
      sizeDeltaInTokens: convertToTokenAmount(sizeDeltaUsd, tokensData.BTC.decimals, triggerPrice)!,
      collateralDeltaAmount: usdcAmount(10),
      minCollateralUsd,
      userReferralInfo: undefined,
      indexPriceForEvaluation,
    });
  }

  it("a limit below the market is unhealthy at its trigger while looking healthy at current prices", () => {
    const triggerPrice = expandDecimals(18_000, USD_DECIMALS); // −10%

    // current-price evaluation values the trigger-priced tokens at 20 000 → fake instant profit
    const atCurrent = increaseAt(triggerPrice, undefined);
    expect(atCurrent?.isLiquidatable).toBe(false);

    // at the trigger the existing position loses 10% → 100 of loss against 70 of margin
    const atTrigger = increaseAt(triggerPrice, triggerPrice);
    expect(atTrigger?.isLiquidatable).toBe(true);
    // the new tokens are flat at the trigger up to the token-conversion dust
    expect(atTrigger?.remainingCollateralUsd).toBe(
      -expandDecimals(30, USD_DECIMALS) - tokenConversionDust(expandDecimals(4_000, USD_DECIMALS), triggerPrice)
    );
    // remaining is below the absolute minimum, so the reason is not about leverage
    expect(atTrigger?.reason).toBe(PositionMarginFailureReason.MinCollateral);
  });

  it("a stop above the market is healthy at its trigger while looking liquidatable at current prices", () => {
    const triggerPrice = expandDecimals(22_000, USD_DECIMALS); // +10%

    // current-price evaluation books an instant 10% loss on the trigger-priced tokens
    const atCurrent = increaseAt(triggerPrice, undefined);
    expect(atCurrent?.isLiquidatable).toBe(true);

    // at the trigger the new tokens are flat and the existing position is in profit
    const atTrigger = increaseAt(triggerPrice, triggerPrice);
    expect(atTrigger?.isLiquidatable).toBe(false);
    // 70 of margin + 100 of existing profit, minus the token-conversion dust of the new tokens
    expect(atTrigger?.remainingCollateralUsd).toBe(
      expandDecimals(170, USD_DECIMALS) - tokenConversionDust(expandDecimals(4_000, USD_DECIMALS), triggerPrice)
    );
  });

  it("values an index-token collateral at the evaluation price too", () => {
    const triggerPrice = expandDecimals(18_000, USD_DECIMALS);
    const sizeDeltaUsd = expandDecimals(1_000, USD_DECIMALS);

    const state = getIncreaseResultingPositionMarginState({
      marketInfo,
      collateralToken: tokensData.BTC,
      isLong: true,
      existingPosition: undefined,
      sizeDeltaUsd,
      sizeDeltaInTokens: convertToTokenAmount(sizeDeltaUsd, tokensData.BTC.decimals, triggerPrice)!,
      // 0.005 BTC of collateral: 100 USD at the current price, 90 USD at the trigger
      collateralDeltaAmount: btcAmount(100),
      minCollateralUsd,
      userReferralInfo: undefined,
      indexPriceForEvaluation: triggerPrice,
    });

    expect(state?.remainingCollateralUsd).toBe(
      expandDecimals(90, USD_DECIMALS) - tokenConversionDust(sizeDeltaUsd, triggerPrice)
    );
  });

  it("overrides the price of a synthetic-equivalent collateral too", () => {
    // a synthetic BTC index (different address, same symbol) paired with a "WBTC"-style
    // collateral: equivalence goes through getIsEquivalentTokens, not through addresses
    const syntheticTokens = mockTokensData({
      BTCSYN: {
        address: "BTCSYN",
        name: "Bitcoin (synthetic)",
        symbol: "BTC",
        decimals: 8,
        isSynthetic: true,
        prices: { minPrice: BTC_PRICE, maxPrice: BTC_PRICE },
      },
      WBTC: {
        address: "WBTC",
        name: "Wrapped Bitcoin",
        symbol: "BTC",
        decimals: 8,
        prices: { minPrice: BTC_PRICE, maxPrice: BTC_PRICE },
      },
    } as any);

    const syntheticMarket = mockMarketsInfoData(syntheticTokens, ["BTCSYN-WBTC-USDC"], {
      "BTCSYN-WBTC-USDC": {
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
        longInterestUsd: 0n,
        shortInterestUsd: 0n,
        longInterestInTokens: 0n,
        shortInterestInTokens: 0n,
      },
    })["BTCSYN-WBTC-USDC"];

    const triggerPrice = expandDecimals(18_000, USD_DECIMALS);
    const sizeDeltaUsd = expandDecimals(1_000, USD_DECIMALS);
    const wbtc = syntheticMarket.longToken;
    const collateralDeltaAmount = convertToTokenAmount(expandDecimals(100, USD_DECIMALS), wbtc.decimals, BTC_PRICE)!;

    const state = getIncreaseResultingPositionMarginState({
      marketInfo: syntheticMarket,
      collateralToken: wbtc,
      isLong: true,
      existingPosition: undefined,
      sizeDeltaUsd,
      sizeDeltaInTokens: convertToTokenAmount(sizeDeltaUsd, syntheticMarket.indexToken.decimals, triggerPrice)!,
      // 100 USD of collateral at the current 20 000, worth 90 USD at the 18 000 trigger
      collateralDeltaAmount,
      minCollateralUsd,
      userReferralInfo: undefined,
      indexPriceForEvaluation: triggerPrice,
    });

    // the collateral is valued at the trigger (~90 USD), not at the current price (~100 USD)
    expect(state!.remainingCollateralUsd).toBeLessThanOrEqual(expandDecimals(90, USD_DECIMALS));
    expect(state!.remainingCollateralUsd).toBeGreaterThan(expandDecimals(89, USD_DECIMALS));
  });
});
