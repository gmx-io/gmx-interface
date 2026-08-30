import { describe, expect, it } from "vitest";

import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { createMockPositionInfo } from "domain/testUtils/mockPositionInfo";
import { expandDecimals, PRECISION } from "lib/numbers";
import type { PositionInfo } from "sdk/utils/positions/types";

import { getIsPositionSettleable, getSettlementBlockReason, shouldPreSelectPosition } from "./utils";

const ACCOUNT = "0x1234567890123456789012345678901234567890";

// 2% min collateral factor: a $50,000 position needs $1,000 of margin to stay open
const MARKET_INFO = createMockMarketInfo(undefined, { minCollateralFactor: (PRECISION * 2n) / 100n });

const SIZE_IN_USD = expandDecimals(50000, 30);

function createPosition(overrides: Partial<PositionInfo> = {}): PositionInfo {
  const position = createMockPositionInfo({
    account: ACCOUNT,
    marketInfo: MARKET_INFO,
    sizeInUsd: SIZE_IN_USD,
    sizeInTokens: expandDecimals(25, 18),
    collateralUsd: expandDecimals(5000, 30),
  });

  return { ...position, ...overrides };
}

describe("getSettlementBlockReason", () => {
  it("does not block a position with margin above the min collateral for its size", () => {
    expect(getSettlementBlockReason(createPosition())).toBeUndefined();
  });

  it("blocks a position whose margin is below the min collateral for its size", () => {
    const position = createPosition({
      collateralUsd: expandDecimals(900, 30),
      remainingCollateralUsd: expandDecimals(900, 30),
    });

    expect(getSettlementBlockReason(position)).toBe("belowMinCollateral");
  });

  it("does not block a position just above the min collateral for its size", () => {
    const position = createPosition({
      collateralUsd: expandDecimals(1100, 30),
      remainingCollateralUsd: expandDecimals(1100, 30),
    });

    expect(getSettlementBlockReason(position)).toBeUndefined();
  });

  it("counts pending fees and unrealized pnl into the margin", () => {
    const withLosses = createPosition({
      remainingCollateralUsd: expandDecimals(1100, 30),
      pnl: -expandDecimals(300, 30),
    });
    const withProfit = createPosition({
      remainingCollateralUsd: expandDecimals(900, 30),
      pnl: expandDecimals(300, 30),
    });

    expect(getSettlementBlockReason(withLosses)).toBe("belowMinCollateral");
    expect(getSettlementBlockReason(withProfit)).toBeUndefined();
  });

  it("counts the closing fee into the margin", () => {
    const position = createPosition({
      remainingCollateralUsd: expandDecimals(1100, 30),
      closingFeeUsd: expandDecimals(200, 30),
    });

    expect(getSettlementBlockReason(position)).toBe("belowMinCollateral");
  });

  it("blocks a position whose collateral alone is below the min collateral for its size, even in profit", () => {
    const position = createPosition({
      collateralAmount: expandDecimals(900, 6),
      collateralUsd: expandDecimals(900, 30),
      remainingCollateralUsd: expandDecimals(900, 30),
      pnl: expandDecimals(300, 30),
    });

    expect(getSettlementBlockReason(position)).toBe("belowMinCollateral");
  });

  it("blocks a position whose collateral is exactly the min collateral, since the settlement withdraws 1 wei", () => {
    const exact = createPosition({
      collateralAmount: expandDecimals(1000, 6),
      collateralUsd: expandDecimals(1000, 30),
      remainingCollateralUsd: expandDecimals(1000, 30),
      pnl: expandDecimals(300, 30),
    });
    const oneWeiAbove = { ...exact, collateralAmount: expandDecimals(1000, 6) + 1n };

    expect(getSettlementBlockReason(exact)).toBe("belowMinCollateral");
    expect(getSettlementBlockReason(oneWeiAbove)).toBeUndefined();
  });

  it("holds the collateral to the open-interest-based min collateral factor when it is stricter than the market's", () => {
    // 4e-8 per dollar of long open interest: $1,000,000 on the long side makes the factor 4%, above the market's 2%
    const marketInfo = createMockMarketInfo(undefined, {
      minCollateralFactor: (PRECISION * 2n) / 100n,
      minCollateralFactorForOpenInterestLong: (PRECISION * 4n) / 100n / 1_000_000n,
      longInterestUsd: expandDecimals(1_000_000, 30),
    });
    const position = createPosition({
      marketInfo,
      collateralAmount: expandDecimals(1500, 6),
      collateralUsd: expandDecimals(1500, 30),
      remainingCollateralUsd: expandDecimals(1500, 30),
    });

    expect(getSettlementBlockReason(position)).toBe("belowMinCollateral");
    expect(getSettlementBlockReason({ ...position, marketInfo: MARKET_INFO })).toBeUndefined();
  });

  it("blocks a position with a negative margin after pending fees", () => {
    const position = createPosition({
      remainingCollateralUsd: -expandDecimals(10, 30),
      pnl: expandDecimals(5000, 30),
    });

    expect(getSettlementBlockReason(position)).toBe("negativeMargin");
  });
});

describe("getIsPositionSettleable", () => {
  it("is false for a blocked position and for a disabled market", () => {
    const disabledMarketPosition = createPosition({
      marketInfo: createMockMarketInfo(undefined, { isDisabled: true }),
    });
    const blockedPosition = createPosition({
      remainingCollateralUsd: expandDecimals(900, 30),
    });

    expect(getIsPositionSettleable(createPosition())).toBe(true);
    expect(getIsPositionSettleable(disabledMarketPosition)).toBe(false);
    expect(getIsPositionSettleable(blockedPosition)).toBe(false);
  });
});

describe("shouldPreSelectPosition", () => {
  const networkFee = expandDecimals(1, 30);

  it("pre-selects a healthy position whose accrued funding covers the network fee", () => {
    const position = createPosition({ pendingClaimableFundingFeesUsd: expandDecimals(20, 30) });

    expect(shouldPreSelectPosition(position, networkFee)).toBe(true);
  });

  it("does not pre-select a blocked position however large its accrued funding", () => {
    const belowMinCollateral = createPosition({
      pendingClaimableFundingFeesUsd: expandDecimals(20, 30),
      remainingCollateralUsd: expandDecimals(900, 30),
    });
    const negativeMargin = createPosition({
      pendingClaimableFundingFeesUsd: expandDecimals(20, 30),
      remainingCollateralUsd: -expandDecimals(10, 30),
    });

    expect(shouldPreSelectPosition(belowMinCollateral, networkFee)).toBe(false);
    expect(shouldPreSelectPosition(negativeMargin, networkFee)).toBe(false);
  });
});
