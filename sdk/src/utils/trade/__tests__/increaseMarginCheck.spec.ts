import { describe, expect, it } from "vitest";

import { mockMarketsInfoData, mockTokensData } from "test/mock";
import { getMarketInfoWithOpenInterestDelta } from "utils/markets";
import { USD_DECIMALS, expandDecimals } from "utils/numbers";
import { convertToTokenAmount, convertToTokenAmountForIncrease, convertToUsd } from "utils/tokens";
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
  // linear impact (exponent 1) keeps every leg a round number:
  // a crossover pays factorNegative on the side it lands on and earns factorPositive on the side it leaves
  function impactMarket(useOpenInterestInTokensForBalance: boolean) {
    return buildMarket({
      positionImpactFactorPositive: expandDecimals(1, 27), // 0.1%
      positionImpactFactorNegative: expandDecimals(3, 27), // 0.3%
      positionImpactExponentFactorPositive: expandDecimals(1, 30),
      positionImpactExponentFactorNegative: expandDecimals(1, 30),
      maxPositionImpactFactorPositive: expandDecimals(1, 29),
      maxPositionImpactFactorNegative: expandDecimals(1, 29),
      maxPositionImpactFactorForLiquidations: expandDecimals(1, 29),
      // longs 50 000 (all USDC-collateralised) vs shorts 100 000
      longInterestUsd: expandDecimals(50_000, USD_DECIMALS),
      shortInterestUsd: expandDecimals(100_000, USD_DECIMALS),
      longInterestInTokens: btcAmount(50_000),
      shortInterestInTokens: btcAmount(100_000),
      longInterestUsdUsingLongToken: 0n,
      longInterestInTokensUsingLongToken: 0n,
      longInterestUsdUsingShortToken: expandDecimals(50_000, USD_DECIMALS),
      longInterestInTokensUsingShortToken: btcAmount(50_000),
      useOpenInterestInTokensForBalance,
    });
  }

  const sizeDeltaUsd = expandDecimals(100_000, USD_DECIMALS);
  const sizeDeltaInTokens = btcAmount(100_000);

  it.each([false, true])(
    "validates against the market state after the order (useOpenInterestInTokensForBalance=%s)",
    (useOpenInterestInTokensForBalance) => {
      const marketInfo = impactMarket(useOpenInterestInTokensForBalance);

      const state = getIncreaseResultingPositionMarginState({
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

      // increase: longs 50 000 → 150 000 crosses the 100 000 of shorts, 50 000 on each side:
      // +0.1% × 50 000 − 0.3% × 50 000 = −100 → pending impact −100 / 20 000 = −0.005 BTC
      // close on the projected market: 150 000 → 50 000 crosses back, again −100
      // total −200, under the 10% liquidation cap → 5 000 − 200
      expect(state?.remainingCollateralUsd).toBe(expandDecimals(4_800, USD_DECIMALS));
      expect(state?.isLiquidatable).toBe(false);

      // on the pre-order market the close would run 50 000 → 0 on the shorts' side: −0.3% × 50 000 = −150
      const withoutProjection = getResultingPositionMarginState({
        marketInfo,
        collateralToken: usdc,
        sizeInUsd: sizeDeltaUsd,
        sizeInTokens: sizeDeltaInTokens,
        collateralAmount: usdcAmount(5_000),
        pendingImpactAmount: -500_000n,
        minCollateralUsd: expandDecimals(1, USD_DECIMALS),
        isLong: true,
        userReferralInfo: undefined,
      });

      expect(withoutProjection.remainingCollateralUsd).toBe(expandDecimals(4_750, USD_DECIMALS));

      const projected = getMarketInfoWithOpenInterestDelta({
        marketInfo,
        collateralToken: usdc,
        isLong: true,
        sizeDeltaUsd,
        sizeDeltaInTokens,
      });

      expect(projected).toMatchObject({
        longInterestUsd: expandDecimals(150_000, USD_DECIMALS),
        longInterestInTokens: 750_000_000n,
        longInterestUsdUsingShortToken: expandDecimals(150_000, USD_DECIMALS),
        longInterestInTokensUsingShortToken: 750_000_000n,
        shortInterestUsd: expandDecimals(100_000, USD_DECIMALS),
      });
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

  // a short's size in tokens rounds up, as the contract does: 20 000 / 5 500 = 3.6363…63 → …64 wei
  const sizeDeltaInTokens = convertToTokenAmountForIncrease(sizeDeltaUsd, 18, ETH_PRICE, false)!;

  // that extra wei is worth 5 500 × 1e-18 = 5.5e-15 USD; valued at 5 500 the 3.6363…64 ETH come to
  // 20 000 + 2e-15 USD, so the loss carries 2e-15 USD of round-up dust
  const ROUND_UP_DUST = 2n * expandDecimals(1, 15);

  function runIncrease(collateralDeltaAmount: bigint) {
    return getIncreaseResultingPositionMarginState({
      marketInfo,
      collateralToken: hardhatUsdc,
      isLong: false,
      existingPosition,
      sizeDeltaUsd,
      sizeDeltaInTokens,
      collateralDeltaAmount,
      minCollateralUsd: expandDecimals(1, USD_DECIMALS),
      userReferralInfo: undefined,
    });
  }

  it("sizes the short's tokens with the contract's round-up", () => {
    expect(sizeDeltaInTokens).toBe(3_636_363_636_363_636_364n);
  });

  it("rejects the second increase the contract cancels", () => {
    // 1 000 USDC added, less the 0.05% fee
    const state = runIncrease(expandDecimals(990, 6));

    // collateral 1 980, unrealized loss 2 000, closing fee 20 → the margin goes negative
    expect(state?.remainingCollateralUsd).toBe(-expandDecimals(40, USD_DECIMALS) - ROUND_UP_DUST);
    expect(state?.isLiquidatable).toBe(true);
    // the fixed minimum is checked before the leverage one, so this is the reason the contract reports
    expect(state?.reason).toBe(PositionMarginFailureReason.MinCollateral);
  });

  it("accepts the same increase with doubled collateral", () => {
    // 2 000 USDC added, less the 0.05% fee
    const state = runIncrease(expandDecimals(1_990, 6));

    // collateral 2 980, unrealized loss 2 000, closing fee 20
    expect(state?.remainingCollateralUsd).toBe(expandDecimals(960, USD_DECIMALS) - ROUND_UP_DUST);
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

describe("pool pnl cap — profitable position while the cap binds, min < max", () => {
  const spreadTokens = mockTokensData({
    BTC: { prices: { minPrice: expandDecimals(20_000, 30), maxPrice: expandDecimals(20_400, 30) } },
    USDC: { prices: { minPrice: expandDecimals(99, 28), maxPrice: expandDecimals(101, 28) } },
  } as any);

  const spreadUsdc = spreadTokens.USDC;
  const spreadBtc = spreadTokens.BTC;

  function cappedMarket(overrides: Record<string, bigint | boolean>) {
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
        maxPositionImpactFactorForLiquidations: 0n,
        // traders may take at most 10% of the pool
        maxPnlFactorForTradersLong: expandDecimals(1, 29),
        maxPnlFactorForTradersShort: expandDecimals(1, 29),
        ...overrides,
      },
    })["BTC-BTC-USDC"];
  }

  it.each([
    {
      side: "long",
      isLong: true,
      // 10 BTC pool at the 20 000 min price = 200 000 → max pnl 20 000;
      // 5 BTC of long OI opened for 62 000: at the maximising 20 400 the pool owes 102 000 − 62 000 = 40 000,
      // at 20 000 only 38 000
      marketInfo: cappedMarket({
        longPoolAmount: expandDecimals(10, 8),
        longInterestUsd: expandDecimals(62_000, USD_DECIMALS),
        longInterestInTokens: expandDecimals(5, 8),
        longInterestUsdUsingLongToken: 0n,
        longInterestInTokensUsingLongToken: 0n,
        longInterestUsdUsingShortToken: expandDecimals(62_000, USD_DECIMALS),
        longInterestInTokensUsingShortToken: expandDecimals(5, 8),
      }),
      // 10 000 bought at 16 000 = 0.625 BTC, worth 12 500 at the 20 000 min price → +2 500 raw
      sizeInTokens: 62_500_000n,
      rawPnlUsd: expandDecimals(2_500, USD_DECIMALS),
      // 2 500 × 20 000 / 40 000
      cappedPnlUsd: expandDecimals(1_250, USD_DECIMALS),
      // 2 500 × 20 000 / 38 000 — the cap ratio at the minimising price
      cappedAtMinimisingPriceUsd: (expandDecimals(2_500, USD_DECIMALS) * 20_000n) / 38_000n,
    },
    {
      side: "short",
      isLong: false,
      // 200 000 USDC pool at 0.99 = 198 000 → max pnl 19 800;
      // 5 BTC of short OI sold for 139 600: at the maximising 20 000 the pool owes 139 600 − 100 000 = 39 600,
      // at 20 400 only 37 600
      marketInfo: cappedMarket({
        shortPoolAmount: expandDecimals(200_000, 6),
        shortInterestUsd: expandDecimals(139_600, USD_DECIMALS),
        shortInterestInTokens: expandDecimals(5, 8),
        shortInterestUsdUsingLongToken: 0n,
        shortInterestInTokensUsingLongToken: 0n,
        shortInterestUsdUsingShortToken: expandDecimals(139_600, USD_DECIMALS),
        shortInterestInTokensUsingShortToken: expandDecimals(5, 8),
      }),
      // 10 000 sold at 25 000 = 0.4 BTC, bought back for 8 160 at the 20 400 max price → +1 840 raw
      sizeInTokens: 40_000_000n,
      rawPnlUsd: expandDecimals(1_840, USD_DECIMALS),
      // 1 840 × 19 800 / 39 600
      cappedPnlUsd: expandDecimals(920, USD_DECIMALS),
      // 1 840 × 19 800 / 37 600
      cappedAtMinimisingPriceUsd: (expandDecimals(1_840, USD_DECIMALS) * 19_800n) / 37_600n,
    },
  ])(
    "scales a $side's profit by the pool cap taken at the price that maximises the pool's pnl",
    ({ isLong, marketInfo, sizeInTokens, rawPnlUsd, cappedPnlUsd, cappedAtMinimisingPriceUsd }) => {
      const state = getResultingPositionMarginState({
        marketInfo,
        collateralToken: spreadUsdc,
        sizeInUsd: expandDecimals(10_000, USD_DECIMALS),
        sizeInTokens,
        // 1 000 USDC at 0.99
        collateralAmount: expandDecimals(1_000, spreadUsdc.decimals),
        pendingImpactAmount: 0n,
        minCollateralUsd: expandDecimals(1, USD_DECIMALS),
        isLong,
        userReferralInfo: undefined,
      });

      const collateralUsd = expandDecimals(990, USD_DECIMALS);

      expect(state.remainingCollateralUsd).toBe(collateralUsd + cappedPnlUsd);
      expect(state.remainingCollateralUsd).not.toBe(collateralUsd + cappedAtMinimisingPriceUsd);
      expect(state.remainingCollateralUsd).not.toBe(collateralUsd + rawPnlUsd);
      expect(state.isLiquidatable).toBe(false);
      expect(spreadBtc.prices.minPrice).toBeLessThan(spreadBtc.prices.maxPrice);
    }
  );
});

describe("getIncreaseResultingPositionMarginState — collateral delta and impact clamp", () => {
  const marketInfo = buildMarket();
  const minCollateralUsd = expandDecimals(1, USD_DECIMALS);

  // 10 000 of size opened at the oracle price with 1 000 USDC
  const existingPosition = {
    sizeInUsd: expandDecimals(10_000, USD_DECIMALS),
    sizeInTokens: btcAmount(10_000),
    collateralAmount: usdcAmount(1_000),
    pendingImpactAmount: 0n,
  };

  function sizeOnlyIncrease(collateralDeltaAmount: bigint) {
    return getIncreaseResultingPositionMarginState({
      marketInfo,
      collateralToken: usdc,
      isLong: true,
      existingPosition,
      sizeDeltaUsd: expandDecimals(10_000, USD_DECIMALS),
      sizeDeltaInTokens: btcAmount(10_000),
      collateralDeltaAmount,
      minCollateralUsd,
      userReferralInfo: undefined,
    });
  }

  it("a negative collateralDeltaAmount is paid from the existing collateral", () => {
    // 1 000 − 50, flat pnl, no fees
    const state = sizeOnlyIncrease(-usdcAmount(50));

    expect(state?.remainingCollateralUsd).toBe(expandDecimals(950, USD_DECIMALS));
    expect(state?.isLiquidatable).toBe(false);
  });

  it("clamps the collateral at zero when the fees exceed it", () => {
    // 1 000 − 1 100 → 0; the open-interest gate runs first and sees no collateral against
    // 1% of the 20 000 of resulting size, so its reason wins over MinCollateral
    const state = sizeOnlyIncrease(-usdcAmount(1_100));

    expect(state?.remainingCollateralUsd).toBe(0n);
    expect(state?.isLiquidatable).toBe(true);
    expect(state?.reason).toBe(PositionMarginFailureReason.InsufficientCollateralUsd);
  });

  it("the summed negative impact is clamped by maxPositionImpactFactorForLiquidations after the pending impact is added", () => {
    // linear impact, shorts 30 000 vs longs 10 000: closing the 10 000 long widens the gap by 10 000
    // → exit impact −2% × 10 000 = −200
    const impactMarket = (maxPositionImpactFactorForLiquidations: bigint) =>
      buildMarket({
        positionImpactFactorNegative: expandDecimals(2, 28),
        positionImpactExponentFactorPositive: expandDecimals(1, 30),
        positionImpactExponentFactorNegative: expandDecimals(1, 30),
        maxPositionImpactFactorNegative: expandDecimals(1, 29),
        maxPositionImpactFactorForLiquidations,
        longInterestUsd: expandDecimals(10_000, USD_DECIMALS),
        shortInterestUsd: expandDecimals(30_000, USD_DECIMALS),
        longInterestInTokens: btcAmount(10_000),
        shortInterestInTokens: btcAmount(30_000),
        useOpenInterestInTokensForBalance: false,
      });

    const run = (maxPositionImpactFactorForLiquidations: bigint) =>
      getResultingPositionMarginState({
        marketInfo: impactMarket(maxPositionImpactFactorForLiquidations),
        collateralToken: usdc,
        sizeInUsd: expandDecimals(10_000, USD_DECIMALS),
        sizeInTokens: btcAmount(10_000),
        collateralAmount: usdcAmount(1_000),
        // −300 USD at the 20 000 index price = −0.015 BTC
        pendingImpactAmount: -1_500_000n,
        minCollateralUsd,
        isLong: true,
        userReferralInfo: undefined,
      });

    // −300 − 200 = −500, clamped at 1% of 10 000 → 1 000 − 100
    expect(run(expandDecimals(1, 28)).remainingCollateralUsd).toBe(expandDecimals(900, USD_DECIMALS));
    // with a 10% cap the whole −500 goes through
    expect(run(expandDecimals(1, 29)).remainingCollateralUsd).toBe(expandDecimals(500, USD_DECIMALS));
  });
});
