import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { mockPositionInfo } from "domain/synthetics/testUtils/mocks";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { USDC_ADDRESS } from "domain/testUtils/mockTokens";
import { expandDecimals } from "lib/numbers";

import { getPositionOffHoursLiqRisk, isTradeboxOffHoursLiqRisk } from "./offHoursLiqRisk";

const GOLD = "0x0Df2BE76F517BCF0000AbfFcB6344B3b2aC4Cc4f";
const ACCOUNT = "0x1111111111111111111111111111111111111111";
const MIN_COLLATERAL_USD = expandDecimals(1, 30); // $1
const SIZE_USD = expandDecimals(20_000, 30); // $20k @ $2000 mark

function offHoursMarket() {
  return {
    ...createMockMarketInfo(),
    marketTokenAddress: GOLD,
    borrowingFactorPerSecondForLongs: expandDecimals(14, 21),
    borrowingFactorPerSecondForShorts: expandDecimals(14, 21),
  };
}

function nonOffHoursMarket() {
  return {
    ...createMockMarketInfo(),
    borrowingFactorPerSecondForLongs: expandDecimals(14, 21),
    borrowingFactorPerSecondForShorts: expandDecimals(14, 21),
  };
}

function goldLong(marketInfo: ReturnType<typeof offHoursMarket>, collateralUsd: bigint) {
  return mockPositionInfo(
    {
      marketInfo,
      collateralTokenAddress: USDC_ADDRESS,
      account: ACCOUNT,
      isLong: true,
      sizeInUsd: SIZE_USD,
      collateralUsd,
    },
    { netValue: collateralUsd }
  );
}

describe("getPositionOffHoursLiqRisk", () => {
  it("does not warn for a well-collateralized position (still safe off-hours)", () => {
    const { showWarning } = getPositionOffHoursLiqRisk({
      chainId: ARBITRUM,
      position: goldLong(offHoursMarket(), expandDecimals(10_000, 30)),
      minCollateralUsd: MIN_COLLATERAL_USD,
      userReferralInfo: undefined,
    });
    expect(showWarning).toBe(false);
  });

  it("warns when the off-hours config pushes time-to-liquidation into the zone while on-hours is safe", () => {
    const result = getPositionOffHoursLiqRisk({
      chainId: ARBITRUM,
      position: goldLong(offHoursMarket(), expandDecimals(800, 30)),
      minCollateralUsd: MIN_COLLATERAL_USD,
      userReferralInfo: undefined,
    });
    expect(result.showWarning).toBe(true);
    expect(result.offHoursLiqPrice).toBeDefined();
  });

  it("warns at high leverage even when the on-hours config is already at risk", () => {
    const { showWarning } = getPositionOffHoursLiqRisk({
      chainId: ARBITRUM,
      position: goldLong(offHoursMarket(), expandDecimals(300, 30)),
      minCollateralUsd: MIN_COLLATERAL_USD,
      userReferralInfo: undefined,
    });
    expect(showWarning).toBe(true);
  });

  it("returns no warning for non-off-hours markets", () => {
    const { showWarning } = getPositionOffHoursLiqRisk({
      chainId: ARBITRUM,
      position: goldLong(nonOffHoursMarket(), expandDecimals(800, 30)),
      minCollateralUsd: MIN_COLLATERAL_USD,
      userReferralInfo: undefined,
    });
    expect(showWarning).toBe(false);
  });
});

describe("isTradeboxOffHoursLiqRisk", () => {
  it("warns when the resulting off-hours position enters the liquidation-risk zone", () => {
    expect(
      isTradeboxOffHoursLiqRisk({
        chainId: ARBITRUM,
        marketInfo: offHoursMarket(),
        isLong: true,
        nextSizeInUsd: SIZE_USD,
        nextCollateralUsd: expandDecimals(800, 30),
        minCollateralUsd: MIN_COLLATERAL_USD,
      })
    ).toBe(true);
  });

  it("warns at high leverage where the on-hours config is also at risk", () => {
    expect(
      isTradeboxOffHoursLiqRisk({
        chainId: ARBITRUM,
        marketInfo: offHoursMarket(),
        isLong: true,
        nextSizeInUsd: SIZE_USD,
        nextCollateralUsd: expandDecimals(300, 30),
        minCollateralUsd: MIN_COLLATERAL_USD,
      })
    ).toBe(true);
  });

  it("does not warn for a well-collateralized resulting position", () => {
    expect(
      isTradeboxOffHoursLiqRisk({
        chainId: ARBITRUM,
        marketInfo: offHoursMarket(),
        isLong: true,
        nextSizeInUsd: SIZE_USD,
        nextCollateralUsd: expandDecimals(10_000, 30),
        minCollateralUsd: MIN_COLLATERAL_USD,
      })
    ).toBe(false);
  });

  it("does not warn for non-off-hours markets", () => {
    expect(
      isTradeboxOffHoursLiqRisk({
        chainId: ARBITRUM,
        marketInfo: nonOffHoursMarket(),
        isLong: true,
        nextSizeInUsd: SIZE_USD,
        nextCollateralUsd: expandDecimals(800, 30),
        minCollateralUsd: MIN_COLLATERAL_USD,
      })
    ).toBe(false);
  });
});
