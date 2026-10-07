import { describe, expect, it } from "vitest";

import { mockMarginCheckMarketInfo, mockTokensData, usdToToken } from "test/mock";
import { bigMath } from "utils/bigmath";
import { getBorrowingFeeRateUsd } from "utils/fees";
import { USD_DECIMALS, expandDecimals } from "utils/numbers";
import {
  PositionMarginFailureReason,
  getIncreaseResultingPositionMarginState,
  getIncreaseResultingPositionState,
  getIsMaxLeverageMarginReason,
} from "utils/trade/increaseMarginCheck";
import { getTwapIncreaseSequentialMarginState } from "utils/trade/twapIncreaseMarginCheck";
import { getTwapPartDelaysSeconds } from "utils/twap";

const tokensData = mockTokensData();
const usdc = tokensData.USDC;

function usd(amount: number) {
  return expandDecimals(amount, USD_DECIMALS);
}

/** A position of `sizeUsd` whose tokens are worth `valueUsd` at the oracle: the loss is the difference. */
function position({ sizeUsd, valueUsd, collateralUsd }: { sizeUsd: number; valueUsd: number; collateralUsd: number }) {
  return {
    sizeInUsd: usd(sizeUsd),
    sizeInTokens: usdToToken(valueUsd, tokensData.BTC),
    collateralAmount: usdToToken(collateralUsd, usdc),
    pendingImpactAmount: 0n,
  };
}

type Params = Parameters<typeof getTwapIncreaseSequentialMarginState>[0];

const HOUR = 3_600;

// parts spaced an hour apart, the first one executable now
function hourlyDelays(numberOfParts: number) {
  return getTwapPartDelaysSeconds({ hours: numberOfParts - 1, minutes: 0 }, numberOfParts);
}

// a 50x position of 10 000 on 200 of collateral, topped up by four parts of 25 each
function baseParams(overrides: Partial<Params> = {}): Params {
  const numberOfParts = overrides.numberOfParts ?? 4;

  return {
    marketInfo: mockMarginCheckMarketInfo(tokensData),
    collateralToken: usdc,
    isLong: true,
    existingPosition: position({ sizeUsd: 10_000, valueUsd: 10_000, collateralUsd: 200 }),
    numberOfParts,
    partDelaysSeconds: hourlyDelays(numberOfParts),
    partSizeDeltaUsd: usd(10_000),
    partGrossCollateralUsd: usd(25),
    pendingFeesUsd: 0n,
    uiFeeFactor: 0n,
    minCollateralUsd: usd(1),
    userReferralInfo: undefined,
    ...overrides,
  };
}

describe("getTwapIncreaseSequentialMarginState", () => {
  describe.each([
    { side: "long", isLong: true },
    { side: "short", isLong: false },
  ])("$side", ({ isLong }) => {
    // after part k the position holds 10 000 + k × size on 200 + k × 25 of collateral against a 1% minimum
    it.each([
      {
        name: "every part stays within the max leverage",
        partSizeUsd: 1_000,
        partDelaysSeconds: hourlyDelays(4),
        failingPartIndex: undefined,
        blocking: false,
      },
      {
        name: "a later part crosses the max leverage",
        partSizeUsd: 10_000,
        partDelaysSeconds: hourlyDelays(4),
        failingPartIndex: 1,
        blocking: false,
      },
      {
        name: "the first part crosses the max leverage",
        partSizeUsd: 20_000,
        partDelaysSeconds: hourlyDelays(4),
        failingPartIndex: 0,
        blocking: true,
      },
      {
        name: "a zero duration makes the crossing part eligible now",
        partSizeUsd: 10_000,
        partDelaysSeconds: [0, 0, 0, 0],
        failingPartIndex: 1,
        blocking: true,
      },
    ])("$name", ({ partSizeUsd, partDelaysSeconds, failingPartIndex, blocking }) => {
      const state = getTwapIncreaseSequentialMarginState(
        baseParams({ isLong, partSizeDeltaUsd: usd(partSizeUsd), partDelaysSeconds })
      )!;

      expect(state.failingPartIndex).toBe(failingPartIndex);
      expect(state.isFailingPartEligibleNow).toBe(blocking);
      expect(state.marginState.isLiquidatable).toBe(failingPartIndex !== undefined);

      if (failingPartIndex !== undefined) {
        expect(getIsMaxLeverageMarginReason(state.marginState.reason)).toBe(true);
      }
    });
  });

  it("settles the existing position's pending fees once, with the first part", () => {
    // 500 of collateral plus 100 deposited across the parts, less 40 of pending fees, leaves 560 whatever the split
    const remaining = [1, 2, 4].map(
      (numberOfParts) =>
        getTwapIncreaseSequentialMarginState(
          baseParams({
            existingPosition: position({ sizeUsd: 10_000, valueUsd: 10_000, collateralUsd: 500 }),
            numberOfParts,
            partSizeDeltaUsd: usd(4_000 / numberOfParts),
            partGrossCollateralUsd: usd(100 / numberOfParts),
            pendingFeesUsd: usd(40),
          })
        )!.marginState.remainingCollateralUsd
    );

    expect(remaining).toEqual([usd(560), usd(560), usd(560)]);
  });

  it("charges every part the open interest left by the parts before it", () => {
    // 1e-8 of min collateral per usd of long open interest: 1% at the 1M already open
    const marketInfo = mockMarginCheckMarketInfo(tokensData, {
      minCollateralFactorForOpenInterestLong: expandDecimals(1, 22),
      longInterestUsd: usd(1_000_000),
      longInterestInTokens: usdToToken(1_000_000, tokensData.BTC),
    });
    const part = {
      sizeDeltaUsd: usd(250_000),
      sizeDeltaInTokens: usdToToken(250_000, tokensData.BTC),
      collateralDeltaAmount: usdToToken(4_000, usdc),
    };

    const state = getTwapIncreaseSequentialMarginState(
      baseParams({
        marketInfo,
        existingPosition: undefined,
        partSizeDeltaUsd: part.sizeDeltaUsd,
        partGrossCollateralUsd: usd(4_000),
      })
    )!;

    // parts 1 and 2 clear 1.25% and 1.5% of their cumulative size; part 3 needs 1.75% of 750 000 = 13 125 on 12 000
    expect(state.failingPartIndex).toBe(2);
    expect(state.marginState.reason).toBe(PositionMarginFailureReason.InsufficientCollateralUsd);

    const standalone = getIncreaseResultingPositionMarginState({
      marketInfo,
      collateralToken: usdc,
      isLong: true,
      existingPosition: undefined,
      ...part,
      minCollateralUsd: usd(1),
      userReferralInfo: undefined,
    });

    expect(standalone?.isLiquidatable).toBe(false);
  });

  it("counts the existing position's unrealized loss against the remaining margin of later parts", () => {
    // four parts of 5 000 on 25 of collateral each; 2 350 of loss on 2 500 of collateral
    const parts = { partSizeDeltaUsd: usd(5_000), partGrossCollateralUsd: usd(25) };
    const flat = getTwapIncreaseSequentialMarginState(
      baseParams({ ...parts, existingPosition: position({ sizeUsd: 10_000, valueUsd: 10_000, collateralUsd: 2_500 }) })
    )!;
    const losing = getTwapIncreaseSequentialMarginState(
      baseParams({ ...parts, existingPosition: position({ sizeUsd: 10_000, valueUsd: 7_650, collateralUsd: 2_500 }) })
    )!;

    expect(flat.failingPartIndex).toBeUndefined();
    // 150 + 25 × k of remaining margin against 1% of 10 000 + 5 000 × k: the third part is the first short of it
    expect(losing.failingPartIndex).toBe(2);
    expect(losing.marginState.reason).toBe(PositionMarginFailureReason.MinCollateralForLeverage);
  });

  it("carries each part's price impact into the next part without double counting", () => {
    const marketInfo = mockMarginCheckMarketInfo(tokensData, {
      positionImpactFactorPositive: expandDecimals(5, 22),
      positionImpactFactorNegative: expandDecimals(1, 23),
      maxPositionImpactFactorNegative: expandDecimals(1, 28),
      maxPositionImpactFactorForLiquidations: expandDecimals(1, 28),
    });
    const parts = { existingPosition: undefined, partSizeDeltaUsd: usd(50_000), partGrossCollateralUsd: usd(5_000) };

    const split = getTwapIncreaseSequentialMarginState(baseParams({ ...parts, marketInfo }))!;
    const noImpact = getTwapIncreaseSequentialMarginState(baseParams(parts))!;
    const aggregate = getIncreaseResultingPositionState({
      marketInfo,
      collateralToken: usdc,
      isLong: true,
      existingPosition: undefined,
      sizeDeltaUsd: usd(200_000),
      sizeDeltaInTokens: usdToToken(200_000, tokensData.BTC),
      collateralDeltaAmount: usdToToken(20_000, usdc),
      minCollateralUsd: usd(1),
      userReferralInfo: undefined,
    })!;

    expect(aggregate.position.pendingImpactAmount).toBeLessThan(0n);
    expect(split.marginState.remainingCollateralUsd).toBeLessThan(noImpact.marginState.remainingCollateralUsd);
    // the impact of four steps through the same open interest telescopes to the one-shot impact, up to rounding
    expect(
      bigMath.abs(split.marginState.remainingCollateralUsd - aggregate.marginState.remainingCollateralUsd)
    ).toBeLessThan(expandDecimals(1, 28));
  });
});

describe("getTwapIncreaseSequentialMarginState — the market's max allowed leverage", () => {
  // 0.5% for both factors: the contract accepts up to 200x, the ui caps an order's resulting position at 100x
  const capOnlyMarket = mockMarginCheckMarketInfo(tokensData, { minCollateralFactor: expandDecimals(5, 27) });

  it.each(
    [
      {
        name: "a fresh position's first part at 150x",
        existingPosition: undefined,
        partSizeUsd: 3_750,
        failingPartIndex: 0,
        isFailingPartEligibleNow: true,
      },
      {
        // 30 800 of size on 300 of collateral after the fourth part: 102.7x
        name: "the last part on a 50x position",
        existingPosition: position({ sizeUsd: 10_000, valueUsd: 10_000, collateralUsd: 200 }),
        partSizeUsd: 5_200,
        failingPartIndex: 3,
        isFailingPartEligibleNow: false,
      },
    ].flatMap((row) => [
      { ...row, side: "long", isLong: true },
      { ...row, side: "short", isLong: false },
    ])
  )(
    "fails $name ($side) that the contract would accept",
    ({ existingPosition, partSizeUsd, isLong, failingPartIndex, isFailingPartEligibleNow }) => {
      const state = getTwapIncreaseSequentialMarginState(
        baseParams({ marketInfo: capOnlyMarket, isLong, existingPosition, partSizeDeltaUsd: usd(partSizeUsd) })
      )!;

      expect(state).toMatchObject({ failingPartIndex, isFailingPartEligibleNow });
      expect(state.marginState.reason).toBe(PositionMarginFailureReason.MaxAllowedLeverage);
      expect(getIsMaxLeverageMarginReason(state.marginState.reason)).toBe(true);
      expect(state.contractMarginState.isLiquidatable).toBe(false);
    }
  );
});

describe("getTwapIncreaseSequentialMarginState — fees accrued between the parts PRO-4134", () => {
  // 2e-8 of borrowing per second: 1 h on 10 000 of size costs 0.72
  const borrowingMarket = mockMarginCheckMarketInfo(tokensData, {
    borrowingFactorPerSecondForLongs: expandDecimals(2, 22),
    borrowingFactorPerSecondForShorts: expandDecimals(2, 22),
  });
  // four parts of 7 500 on 25 each: the second part lands exactly on the 1% minimum (250 on 25 000)
  const edgeParts = { partSizeDeltaUsd: usd(7_500), partGrossCollateralUsd: usd(25) };

  it("settles the borrowing accrued since the previous part at the snapshot rate", () => {
    const parts = { existingPosition: undefined, partSizeDeltaUsd: usd(5_000), partGrossCollateralUsd: usd(500) };
    const noDelay = getTwapIncreaseSequentialMarginState(
      baseParams({ ...parts, marketInfo: borrowingMarket, partDelaysSeconds: [0, 0, 0, 0] })
    )!;
    const hourly = getTwapIncreaseSequentialMarginState(baseParams({ ...parts, marketInfo: borrowingMarket }))!;

    // parts 2–4 each pay an hour of borrowing on the size the previous parts left: 5 000, 10 000, 15 000
    const accruedUsd = [5_000, 10_000, 15_000].reduce(
      (sum, sizeUsd) => sum + getBorrowingFeeRateUsd(borrowingMarket, true, usd(sizeUsd), BigInt(HOUR)),
      0n
    );

    expect(accruedUsd).toBe(usd(216) / 100n);
    expect(noDelay.marginState.remainingCollateralUsd - hourly.marginState.remainingCollateralUsd).toBe(accruedUsd);
  });

  it("fails a later part that passes at the snapshot once the borrowing before it is settled", () => {
    const atSnapshot = getTwapIncreaseSequentialMarginState(
      baseParams({ ...edgeParts, marketInfo: borrowingMarket, partDelaysSeconds: [0, 0, 0, 0] })
    )!;
    const hourly = getTwapIncreaseSequentialMarginState(baseParams({ ...edgeParts, marketInfo: borrowingMarket }))!;

    expect(atSnapshot.failingPartIndex).toBe(2);
    expect(hourly).toMatchObject({ failingPartIndex: 1, isFailingPartEligibleNow: false });
    // 1.26 of borrowing on 17 500 pushes the part past both the 100x cap and the contract's 1% minimum
    expect(getIsMaxLeverageMarginReason(hourly.marginState.reason)).toBe(true);
    expect(hourly.contractMarginState.isLiquidatable).toBe(true);
    expect(getIsMaxLeverageMarginReason(hourly.contractMarginState.reason)).toBe(true);
  });

  it("charges the existing position for the wait before a first part that is not executable yet", () => {
    const delays = hourlyDelays(4);
    const now = getTwapIncreaseSequentialMarginState(baseParams({ ...edgeParts, marketInfo: borrowingMarket }))!;
    const inAnHour = getTwapIncreaseSequentialMarginState(
      baseParams({ ...edgeParts, marketInfo: borrowingMarket, partDelaysSeconds: delays.map((d) => d + HOUR) })
    )!;

    expect(inAnHour.isFailingPartEligibleNow).toBe(false);
    expect(now.marginState.remainingCollateralUsd - inAnHour.marginState.remainingCollateralUsd).toBe(
      getBorrowingFeeRateUsd(borrowingMarket, true, usd(10_000), BigInt(HOUR))
    );
  });

  it("settles funding only for the side that pays it", () => {
    // longs pay 1e-8 per second; the market needs open interest on both sides to split the funding
    const fundingMarket = (longsPayShorts: boolean) =>
      mockMarginCheckMarketInfo(tokensData, {
        fundingFactorPerSecond: expandDecimals(1, 22),
        longsPayShorts,
        longInterestUsd: usd(1_000_000),
        shortInterestUsd: usd(1_000_000),
        longInterestInTokens: usdToToken(1_000_000, tokensData.BTC),
        shortInterestInTokens: usdToToken(1_000_000, tokensData.BTC),
      });
    const parts = { existingPosition: undefined, partSizeDeltaUsd: usd(5_000), partGrossCollateralUsd: usd(500) };
    const remaining = (longsPayShorts: boolean) =>
      getTwapIncreaseSequentialMarginState(baseParams({ ...parts, marketInfo: fundingMarket(longsPayShorts) }))!
        .marginState.remainingCollateralUsd;

    // paying: an hour on 5 000 + 10 000 + 15 000 at 1e-8/s = 1.08; receiving: nothing leaves the collateral
    expect(remaining(false) - remaining(true)).toBe(usd(108) / 100n);
    expect(remaining(false)).toBe(
      getTwapIncreaseSequentialMarginState(baseParams(parts))!.marginState.remainingCollateralUsd
    );
  });
});

describe("getTwapPartDelaysSeconds", () => {
  it.each([
    { duration: { hours: 10, minutes: 0 }, numberOfParts: 5, delays: [0, 9_000, 18_000, 27_000, 36_000] },
    { duration: { hours: 0, minutes: 0 }, numberOfParts: 5, delays: [0, 0, 0, 0, 0] },
    { duration: { hours: 10, minutes: 0 }, numberOfParts: 1, delays: [0] },
  ])("$duration.hours h over $numberOfParts parts", ({ duration, numberOfParts, delays }) => {
    expect(getTwapPartDelaysSeconds(duration, numberOfParts)).toEqual(delays);
  });
});
