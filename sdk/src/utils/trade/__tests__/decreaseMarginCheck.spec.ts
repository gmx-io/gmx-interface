import { describe, expect, it } from "vitest";

import { mockMarketsInfoData, mockTokensData } from "test/mock";
import { USD_DECIMALS, expandDecimals } from "utils/numbers";
import { convertToTokenAmount } from "utils/tokens";
import {
  type DecreaseResultingPositionMarginStateParams,
  getDecreaseResultingPositionMarginState,
} from "utils/trade/decreaseMarginCheck";
import { PositionMarginFailureReason } from "utils/trade/increaseMarginCheck";

const tokensData = mockTokensData();
const usdc = tokensData.USDC;

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
      longInterestUsd: expandDecimals(1_000_000, USD_DECIMALS),
      shortInterestUsd: expandDecimals(1_000_000, USD_DECIMALS),
      longInterestInTokens: expandDecimals(50, 8),
      shortInterestInTokens: expandDecimals(50, 8),
      ...overrides,
    },
  })["BTC-BTC-USDC"];
}

/** USD value with 30 decimals, accepting fractional amounts. */
function usd(value: number) {
  return (BigInt(Math.round(value * 100)) * expandDecimals(1, USD_DECIMALS)) / 100n;
}

function usdcAmount(value: number) {
  return convertToTokenAmount(usd(value), usdc.decimals, usdc.prices.minPrice)!;
}

/** tokens of a 10 000 USD long that are worth `value` at the oracle price */
function sizeInTokensWorth(value: number) {
  return convertToTokenAmount(usd(value), tokensData.BTC.decimals, tokensData.BTC.prices.minPrice)!;
}

const LOSING_2000 = sizeInTokensWorth(8_000);
const FLAT = sizeInTokensWorth(10_000);
const PROFITABLE_2000 = sizeInTokensWorth(12_000);

type Overrides = Partial<Omit<DecreaseResultingPositionMarginStateParams, "position">> & {
  position?: Partial<DecreaseResultingPositionMarginStateParams["position"]>;
  closeShare?: number;
  realizedLossUsd?: number;
};

/**
 * A 10 000 USD long. `closeShare` closes that share of it and pays `realizedLossUsd` out of the collateral,
 * the way `getDecreasePositionAmounts` reports it in `payedRemainingCollateralAmount`.
 */
function params({ position, closeShare = 0, realizedLossUsd = 0, ...overrides }: Overrides = {}) {
  const fullPosition = {
    sizeInUsd: usd(10_000),
    sizeInTokens: LOSING_2000,
    collateralAmount: usdcAmount(2_060),
    pendingImpactAmount: 0n,
    ...position,
  };

  const closeBps = BigInt(Math.round(closeShare * 10_000));

  return {
    marketInfo: buildMarket(),
    collateralToken: usdc,
    isLong: true,
    position: fullPosition,
    sizeDeltaUsd: (fullPosition.sizeInUsd * closeBps) / 10_000n,
    sizeDeltaInTokens: (fullPosition.sizeInTokens * closeBps) / 10_000n,
    collateralDeltaAmount: 0n,
    payedRemainingCollateralAmount: usdcAmount(realizedLossUsd),
    minCollateralUsd: usd(1),
    minPositionSizeUsd: usd(1),
    userReferralInfo: undefined,
    ...overrides,
  };
}

describe("getDecreaseResultingPositionMarginState — partial close", () => {
  // collateral 2 060 with a 2 000 loss leaves 60 of margin: under the 1% regular minimum of the full
  // position (100), above its 0.5% liquidation minimum (50)

  it("rejects a partial close whose remainder stays above max leverage", () => {
    const state = getDecreaseResultingPositionMarginState(params({ closeShare: 0.25, realizedLossUsd: 500 }));

    expect(state?.isLiquidatable).toBe(true);
    expect(state?.reason).toBe(PositionMarginFailureReason.MinCollateralForLeverage);
    expect(state?.remainingCollateralUsd).toBe(usd(60));
    expect(state?.minCollateralUsdForLeverage).toBe(usd(75));
  });

  it("passes when the remaining margin equals the leverage-based minimum", () => {
    const state = getDecreaseResultingPositionMarginState(params({ closeShare: 0.4, realizedLossUsd: 800 }));

    expect(state?.remainingCollateralUsd).toBe(usd(60));
    expect(state?.minCollateralUsdForLeverage).toBe(usd(60));
    expect(state?.isLiquidatable).toBe(false);
  });

  it("passes once a larger part is closed", () => {
    const state = getDecreaseResultingPositionMarginState(params({ closeShare: 0.5, realizedLossUsd: 1_000 }));

    expect(state?.isLiquidatable).toBe(false);
  });

  it("never validates a full close", () => {
    expect(getDecreaseResultingPositionMarginState(params({ closeShare: 1, realizedLossUsd: 2_000 }))).toBeUndefined();
  });

  it("counts the costs paid out of the collateral against the remainder", () => {
    // closing 50% passes with 60 of margin against a 50 minimum; 10.01 of fees on the closed part tips it over
    const state = getDecreaseResultingPositionMarginState(params({ closeShare: 0.5, realizedLossUsd: 1_010.01 }));

    expect(state?.reason).toBe(PositionMarginFailureReason.MinCollateralForLeverage);
  });

  it("charges the closing fee of the remainder", () => {
    // 0.2% of the remaining 5 000 = 10 → 60 - 10 = 50, exactly the minimum; one more cent of loss fails
    const marketInfo = buildMarket({
      positionFeeFactorForBalanceWasImproved: expandDecimals(2, 27),
      positionFeeFactorForBalanceWasNotImproved: expandDecimals(2, 27),
    });

    expect(
      getDecreaseResultingPositionMarginState(params({ marketInfo, closeShare: 0.5, realizedLossUsd: 1_000 }))
        ?.isLiquidatable
    ).toBe(false);
    expect(
      getDecreaseResultingPositionMarginState(params({ marketInfo, closeShare: 0.5, realizedLossUsd: 1_000.01 }))
        ?.reason
    ).toBe(PositionMarginFailureReason.MinCollateralForLeverage);
  });

  it("does not apply the fixed minimum to the remainder", () => {
    // remainder: 60 of margin, 50 leverage minimum; a 61 USD fixed minimum is only checked after an increase
    const state = getDecreaseResultingPositionMarginState(
      params({
        closeShare: 0.5,
        realizedLossUsd: 1_000,
        position: { collateralAmount: usdcAmount(2_061) },
        minCollateralUsd: usd(61),
        marketInfo: buildMarket({
          positionFeeFactorForBalanceWasImproved: expandDecimals(2, 26),
          positionFeeFactorForBalanceWasNotImproved: expandDecimals(2, 26),
        }),
      })
    );

    expect(state?.remainingCollateralUsd).toBe(usd(60));
    expect(state?.isLiquidatable).toBe(false);
  });

  it("returns a non-positive remaining margin as its own reason", () => {
    const state = getDecreaseResultingPositionMarginState(
      params({ closeShare: 0.25, realizedLossUsd: 500, position: { collateralAmount: usdcAmount(2_002) } })
    );

    // 2 of margin: over the 1 USD fixed minimum, so the contract keeps the close partial
    expect(state?.reason).toBe(PositionMarginFailureReason.MinCollateralForLeverage);

    const underwater = getDecreaseResultingPositionMarginState(
      params({
        closeShare: 0.25,
        realizedLossUsd: 503,
        position: { collateralAmount: usdcAmount(2_002) },
      })
    );

    expect(underwater?.reason).toBe(PositionMarginFailureReason.NonPositiveRemainingMargin);
  });

  it("validates nothing when the contract turns the order into a full close", () => {
    // estimated remainder: 2 000.5 - 500 of collateral and -1 500 of pnl → 0.5, under the 1 USD fixed minimum
    expect(
      getDecreaseResultingPositionMarginState(
        params({ closeShare: 0.25, realizedLossUsd: 500, position: { collateralAmount: usdcAmount(2_000.5) } })
      )
    ).toBeUndefined();

    expect(
      getDecreaseResultingPositionMarginState(
        params({ closeShare: 0.5, realizedLossUsd: 1_000, minPositionSizeUsd: usd(5_001) })
      )
    ).toBeUndefined();
  });
});

describe("getDecreaseResultingPositionMarginState — keep-leverage collateral withdrawal", () => {
  const flat = { sizeInTokens: FLAT, collateralAmount: usdcAmount(200) };

  it("withdraws the collateral when the preliminary gate passes", () => {
    // remaining size 5 000 → 50 required without pnl; 200 - 150 = 50
    const state = getDecreaseResultingPositionMarginState(
      params({ closeShare: 0.5, position: flat, collateralDeltaAmount: usdcAmount(150) })
    );

    expect(state?.remainingCollateralUsd).toBe(usd(50));
    expect(state?.isLiquidatable).toBe(false);
  });

  it("keeps the collateral in the position when the preliminary gate fails", () => {
    const state = getDecreaseResultingPositionMarginState(
      params({ closeShare: 0.5, position: flat, collateralDeltaAmount: usdcAmount(150.01) })
    );

    expect(state?.remainingCollateralUsd).toBe(usd(200));
    expect(state?.isLiquidatable).toBe(false);
  });

  it("evaluates the open-interest factor on the open interest left after the close", () => {
    // 2% at 1 000 000 of open interest; closing 5 000 leaves 995 000 → 1.99% → 99.5 on the remaining 5 000
    const marketInfo = buildMarket({ minCollateralFactorForOpenInterestLong: expandDecimals(2, 22) });

    expect(
      getDecreaseResultingPositionMarginState(
        params({ marketInfo, closeShare: 0.5, position: flat, collateralDeltaAmount: usdcAmount(100.5) })
      )?.remainingCollateralUsd
    ).toBe(usd(99.5));

    expect(
      getDecreaseResultingPositionMarginState(
        params({ marketInfo, closeShare: 0.5, position: flat, collateralDeltaAmount: usdcAmount(100.51) })
      )?.remainingCollateralUsd
    ).toBe(usd(200));
  });
});

describe("getDecreaseResultingPositionMarginState — withdrawal", () => {
  it("passes up to the leverage-based minimum with pnl and fails past it", () => {
    // 2 200 of collateral and a 2 000 loss: 200 of margin against a 100 minimum
    const position = { collateralAmount: usdcAmount(2_200) };

    const atThreshold = getDecreaseResultingPositionMarginState(
      params({ position, collateralDeltaAmount: usdcAmount(100) })
    );
    const pastThreshold = getDecreaseResultingPositionMarginState(
      params({ position, collateralDeltaAmount: usdcAmount(100.01) })
    );

    expect(atThreshold?.remainingCollateralUsd).toBe(usd(100));
    expect(atThreshold?.isLiquidatable).toBe(false);
    expect(pastThreshold?.reason).toBe(PositionMarginFailureReason.MinCollateralForLeverage);
  });

  it("uses the regular factor where the liquidation one would still pass", () => {
    // 60 of margin left: above the 0.5% liquidation minimum (50), under the 1% regular one (100)
    const state = getDecreaseResultingPositionMarginState(
      params({ position: { collateralAmount: usdcAmount(2_200) }, collateralDeltaAmount: usdcAmount(140) })
    );

    expect(state?.remainingCollateralUsd).toBe(usd(60));
    expect(state?.minCollateralUsdForLeverage).toBe(usd(100));
    expect(state?.isLiquidatable).toBe(true);
  });

  it("settles pending fees out of the collateral before the final validation", () => {
    const state = getDecreaseResultingPositionMarginState(
      params({
        position: { collateralAmount: usdcAmount(2_200) },
        collateralDeltaAmount: usdcAmount(95),
        payedRemainingCollateralAmount: usdcAmount(5.01),
      })
    );

    expect(state?.reason).toBe(PositionMarginFailureReason.MinCollateralForLeverage);
  });

  it("reverts at the preliminary gate, which ignores pnl", () => {
    // profitable by 2 000, but 150 - 50.01 of collateral is under the 100 the gate requires without pnl
    const position = { sizeInTokens: PROFITABLE_2000, collateralAmount: usdcAmount(150) };

    expect(
      getDecreaseResultingPositionMarginState(params({ position, collateralDeltaAmount: usdcAmount(50) }))
        ?.isLiquidatable
    ).toBe(false);

    const state = getDecreaseResultingPositionMarginState(
      params({ position, collateralDeltaAmount: usdcAmount(50.01) })
    );

    expect(state?.reason).toBe(PositionMarginFailureReason.UnableToWithdrawCollateral);
    expect(state?.remainingCollateralUsd).toBe(usd(99.99));
    expect(state?.minCollateralUsdForLeverage).toBe(usd(100));
  });

  it("reverts at the preliminary gate when collateral with pnl falls under the fixed minimum", () => {
    const state = getDecreaseResultingPositionMarginState(
      params({
        position: { collateralAmount: usdcAmount(2_200) },
        collateralDeltaAmount: usdcAmount(50),
        minCollateralUsd: usd(150.01),
      })
    );

    expect(state?.reason).toBe(PositionMarginFailureReason.UnableToWithdrawCollateral);
  });
});
