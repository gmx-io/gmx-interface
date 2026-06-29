import { describe, expect, it, vi, beforeEach, Mock } from "vitest";

import { bigMath } from "utils/bigmath";
import { getPositionFee, getPriceImpactForPosition } from "utils/fees";
import { getCappedPoolPnl, getMarketPnl, getPoolUsdWithoutPnl } from "utils/markets";
import { MarketInfo } from "utils/markets/types";
import { expandDecimals, USD_DECIMALS } from "utils/numbers";
import {
  getEntryPrice,
  getLeverage,
  getLiquidationPrice,
  getMinCollateralUsdForLiquidationPrice,
  getPositionKey,
  getPositionNetValue,
  getPositionNetValueAfterAllFees,
  getPositionPendingFeesUsd,
  getPositionPnlAfterAllFees,
  getPositionPnlAfterFees,
  getPositionPnlUsd,
  getPositionValueUsd,
  parsePositionKey,
} from "utils/positions";
import { convertToUsd, getIsEquivalentTokens } from "utils/tokens";
import { Token } from "utils/tokens/types";

vi.mock("../markets", () => ({
  ...vi.importActual("../markets"),
  getMarketPnl: vi.fn(),
  getPoolUsdWithoutPnl: vi.fn(),
  getCappedPoolPnl: vi.fn(),
}));

vi.mock("../tokens", () => ({
  ...vi.importActual("../tokens"),
  convertToUsd: vi.fn(),
  getIsEquivalentTokens: vi.fn(),
}));

vi.mock("../fees", () => ({
  getPositionFee: vi.fn(),
  getPriceImpactForPosition: vi.fn(),
}));

describe("getPositionKey", () => {
  it("returns key in expected format", () => {
    expect(getPositionKey("0xabc", "0xmarket", "0xcollateral", true)).toBe("0xabc:0xmarket:0xcollateral:true");
  });
});

describe("parsePositionKey", () => {
  it("parses position key string into an object", () => {
    const result = parsePositionKey("0xabc:0xmarket:0xcollateral:false");
    expect(result).toEqual({
      account: "0xabc",
      marketAddress: "0xmarket",
      collateralAddress: "0xcollateral",
      isLong: false,
    });
  });
});

describe("getEntryPrice", () => {
  it("returns undefined if sizeInTokens <= 0", () => {
    const token = { decimals: 18 } as Token;
    expect(getEntryPrice({ sizeInUsd: 1000n, sizeInTokens: 0n, indexToken: token })).toBeUndefined();
  });

  it("returns mulDiv of sizeInUsd if sizeInTokens > 0", () => {
    const token = { decimals: 2 } as Token;
    const result = getEntryPrice({ sizeInUsd: 1000n, sizeInTokens: 100n, indexToken: token });
    expect(result).toBe(1000n);
  });
});

describe("getPositionValueUsd", () => {
  it("uses convertToUsd under the hood", () => {
    (convertToUsd as Mock).mockReturnValueOnce(5000n);
    const token = { decimals: 18 } as Token;
    const result = getPositionValueUsd({ indexToken: token, sizeInTokens: 100n, markPrice: 10n });
    expect(convertToUsd).toHaveBeenCalledWith(100n, 18, 10n);
    expect(result).toBe(5000n);
  });
});

describe("getPositionPnlUsd", () => {
  const marketInfo = { indexToken: {}, maxPositionImpactFactorForLiquidations: 2n } as MarketInfo;

  beforeEach(() => {
    (getMarketPnl as Mock).mockReturnValue(1000n);
    (getPoolUsdWithoutPnl as Mock).mockReturnValue(5000n);
    (getCappedPoolPnl as Mock).mockReturnValue(800n);
  });

  it("returns negative PnL if positionValueUsd < sizeInUsd for a long", () => {
    (convertToUsd as Mock).mockReturnValueOnce(900n); // positionValueUsd
    const result = getPositionPnlUsd({
      marketInfo,
      sizeInUsd: 1000n,
      sizeInTokens: 100n,
      markPrice: 10n,
      isLong: true,
    });
    expect(result).toBe(900n - 1000n); // -100n
  });
});

describe("getPositionPendingFeesUsd", () => {
  it("sums up funding and borrowing fees", () => {
    expect(getPositionPendingFeesUsd({ pendingFundingFeesUsd: 10n, pendingBorrowingFeesUsd: 15n })).toBe(25n);
  });
});

describe("getPositionNetValue", () => {
  it("calculates net position value from collateral, pnl, and accrued fees only", () => {
    const result = getPositionNetValue({
      collateralUsd: 1000n,
      pendingFundingFeesUsd: 10n,
      pendingBorrowingFeesUsd: 15n,
      pnl: 200n,
    });
    // netValue = 1000n - (10n+15n) + 200n = 1175n
    expect(result).toBe(1175n);
  });

  it("returns collateral when pnl and fees are zero", () => {
    const result = getPositionNetValue({
      collateralUsd: 500n,
      pendingFundingFeesUsd: 0n,
      pendingBorrowingFeesUsd: 0n,
      pnl: 0n,
    });
    expect(result).toBe(500n);
  });

  it("handles negative pnl", () => {
    const result = getPositionNetValue({
      collateralUsd: 1000n,
      pendingFundingFeesUsd: 5n,
      pendingBorrowingFeesUsd: 5n,
      pnl: -300n,
    });
    // netValue = 1000n - 10n + (-300n) = 690n
    expect(result).toBe(690n);
  });
});

describe("getPositionPnlAfterFees", () => {
  it("subtracts only borrowing and funding fees from pnl", () => {
    const result = getPositionPnlAfterFees({
      pnl: 500n,
      pendingBorrowingFeesUsd: 30n,
      pendingFundingFeesUsd: 20n,
    });
    // pnlAfterFees = 500n - 30n - 20n = 450n
    expect(result).toBe(450n);
  });

  it("returns pnl when fees are zero", () => {
    const result = getPositionPnlAfterFees({
      pnl: 200n,
      pendingBorrowingFeesUsd: 0n,
      pendingFundingFeesUsd: 0n,
    });
    expect(result).toBe(200n);
  });

  it("handles negative pnl", () => {
    const result = getPositionPnlAfterFees({
      pnl: -100n,
      pendingBorrowingFeesUsd: 10n,
      pendingFundingFeesUsd: 5n,
    });
    // pnlAfterFees = -100n - 10n - 5n = -115n
    expect(result).toBe(-115n);
  });

  it("can return negative when fees exceed positive pnl", () => {
    const result = getPositionPnlAfterFees({
      pnl: 10n,
      pendingBorrowingFeesUsd: 50n,
      pendingFundingFeesUsd: 30n,
    });
    // pnlAfterFees = 10n - 50n - 30n = -70n
    expect(result).toBe(-70n);
  });
});

describe("getPositionNetValueAfterAllFees", () => {
  it("subtracts all fees and adds signed price impact (adverse)", () => {
    const result = getPositionNetValueAfterAllFees({
      collateralUsd: 1000n,
      pnl: 200n,
      pendingBorrowingFeesUsd: 15n,
      pendingFundingFeesUsd: 10n,
      netPriceImpactDeltaUsd: -50n,
      closingFeeUsd: 30n,
    });
    // 1000 + 200 - 15 - 10 + (-50) - 30 = 1095
    expect(result).toBe(1095n);
  });

  it("adds favorable price impact", () => {
    const result = getPositionNetValueAfterAllFees({
      collateralUsd: 1000n,
      pnl: 200n,
      pendingBorrowingFeesUsd: 0n,
      pendingFundingFeesUsd: 0n,
      netPriceImpactDeltaUsd: 25n,
      closingFeeUsd: 0n,
    });
    // 1000 + 200 + 25 = 1225
    expect(result).toBe(1225n);
  });

  it("reduces to collateral when pnl, fees, and impact are zero", () => {
    const result = getPositionNetValueAfterAllFees({
      collateralUsd: 500n,
      pnl: 0n,
      pendingBorrowingFeesUsd: 0n,
      pendingFundingFeesUsd: 0n,
      netPriceImpactDeltaUsd: 0n,
      closingFeeUsd: 0n,
    });
    expect(result).toBe(500n);
  });

  it("handles negative pnl with adverse impact", () => {
    const result = getPositionNetValueAfterAllFees({
      collateralUsd: 1000n,
      pnl: -300n,
      pendingBorrowingFeesUsd: 5n,
      pendingFundingFeesUsd: 5n,
      netPriceImpactDeltaUsd: -20n,
      closingFeeUsd: 10n,
    });
    // 1000 - 300 - 5 - 5 - 20 - 10 = 660
    expect(result).toBe(660n);
  });
});

describe("getPositionPnlAfterAllFees", () => {
  it("subtracts all fees and adds signed price impact (adverse) from pnl", () => {
    const result = getPositionPnlAfterAllFees({
      pnl: 500n,
      pendingBorrowingFeesUsd: 30n,
      pendingFundingFeesUsd: 20n,
      netPriceImpactDeltaUsd: -40n,
      closingFeeUsd: 50n,
    });
    // 500 - 30 - 20 - 40 - 50 = 360
    expect(result).toBe(360n);
  });

  it("adds favorable price impact to pnl", () => {
    const result = getPositionPnlAfterAllFees({
      pnl: 100n,
      pendingBorrowingFeesUsd: 0n,
      pendingFundingFeesUsd: 0n,
      netPriceImpactDeltaUsd: 50n,
      closingFeeUsd: 0n,
    });
    expect(result).toBe(150n);
  });

  it("returns pnl when fees and impact are zero", () => {
    const result = getPositionPnlAfterAllFees({
      pnl: 200n,
      pendingBorrowingFeesUsd: 0n,
      pendingFundingFeesUsd: 0n,
      netPriceImpactDeltaUsd: 0n,
      closingFeeUsd: 0n,
    });
    expect(result).toBe(200n);
  });

  it("handles negative pnl with adverse impact", () => {
    const result = getPositionPnlAfterAllFees({
      pnl: -100n,
      pendingBorrowingFeesUsd: 10n,
      pendingFundingFeesUsd: 5n,
      netPriceImpactDeltaUsd: -20n,
      closingFeeUsd: 30n,
    });
    // -100 - 10 - 5 - 20 - 30 = -165
    expect(result).toBe(-165n);
  });
});

describe("getLeverage", () => {
  it("returns undefined if remainingCollateralUsd <= 0", () => {
    const result = getLeverage({
      sizeInUsd: 1000n,
      collateralUsd: 100n,
      pnl: -200n,
      pendingFundingFeesUsd: 100n,
      pendingBorrowingFeesUsd: 0n,
    });
    // remainingCollateralUsd=100n +(-200n)-100n= -200n
    expect(result).toBeUndefined();
  });

  it("returns correct leverage if collateralUsd > 0", () => {
    const result = getLeverage({
      sizeInUsd: 2000n,
      collateralUsd: 1000n,
      pnl: 200n,
      pendingFundingFeesUsd: 50n,
      pendingBorrowingFeesUsd: 50n,
    });
    // remainingCollateralUsd=1000n +200n -100n=1100n
    // leverage= mulDiv(2000n, 10000n, 1100n)= (2000n*10000n)/1100n= ~18181n
    expect(result).toBe(bigMath.mulDiv(2000n, 10000n, 1100n));
  });
});

describe("getLiquidationPrice", () => {
  beforeEach(() => {
    (getPositionFee as Mock).mockReturnValue({ positionFeeUsd: 50n });
    (getPriceImpactForPosition as Mock).mockReturnValue({ priceImpactDeltaUsd: -100n, balanceWasImproved: false });
    (getIsEquivalentTokens as Mock).mockReturnValue(false);
  });

  it("returns undefined if sizeInUsd <= 0 or sizeInTokens <= 0", () => {
    const marketInfo = {
      indexToken: {
        decimals: 18,
        prices: { minPrice: expandDecimals(1, USD_DECIMALS), maxPrice: expandDecimals(1, USD_DECIMALS) },
      },
    } as unknown as MarketInfo;
    expect(
      getLiquidationPrice({
        sizeInUsd: 0n,
        sizeInTokens: 100n,
        collateralAmount: 10n,
        collateralUsd: 1000n,
        collateralToken: {} as any,
        marketInfo,
        pendingFundingFeesUsd: 0n,
        pendingBorrowingFeesUsd: 0n,
        pendingImpactAmount: 0n,
        minCollateralUsd: 100n,
        isLong: true,
        userReferralInfo: undefined,
      })
    ).toBeUndefined();
    expect(
      getLiquidationPrice({
        sizeInUsd: 100n,
        sizeInTokens: 0n,
        collateralAmount: 10n,
        collateralUsd: 1000n,
        collateralToken: {} as any,
        marketInfo,
        pendingFundingFeesUsd: 0n,
        pendingBorrowingFeesUsd: 0n,
        pendingImpactAmount: 0n,
        minCollateralUsd: 100n,
        isLong: true,
        userReferralInfo: undefined,
      })
    ).toBeUndefined();
  });

  it("computes liquidation price for non-equivalent tokens and isLong=true", () => {
    (getIsEquivalentTokens as Mock).mockReturnValue(false);
    (convertToUsd as Mock).mockReturnValue(1000n);
    const marketInfo = {
      indexToken: {
        decimals: 8,
        prices: { minPrice: expandDecimals(1, USD_DECIMALS), maxPrice: expandDecimals(1, USD_DECIMALS) },
      },
      minCollateralFactorForLiquidation: 1000n, // 0.001
      maxPositionImpactFactorForLiquidations: 500n, // 0.005
      maxPositionImpactFactorPositive: 1000n, // 0.01
      maxPositionImpactFactorNegative: 1000n, // 0.01
    } as unknown as MarketInfo;

    const result = getLiquidationPrice({
      sizeInUsd: 1000n,
      sizeInTokens: 100n,
      collateralAmount: 50n, // not used if tokens not equivalent
      collateralToken: {} as any,
      collateralUsd: 400n,
      marketInfo,
      pendingFundingFeesUsd: 0n,
      pendingBorrowingFeesUsd: 0n,
      pendingImpactAmount: 0n,
      minCollateralUsd: 200n,
      isLong: true,
      userReferralInfo: undefined,
    });
    expect(result).toBeDefined();
  });
});

describe("getMinCollateralUsdForLiquidationPrice", () => {
  // Tiny factor magnitudes here round to 0n under PRECISION=1e30 — keeping them this way
  // lets us assert exact integer results. One test below uses realistic factors to lock in
  // that the priceImpact cap also works at scale.
  const marketInfo = {
    indexToken: {
      decimals: 8,
      prices: { minPrice: expandDecimals(1, USD_DECIMALS), maxPrice: expandDecimals(1, USD_DECIMALS) },
    },
    minCollateralFactorForLiquidation: 1000n,
    maxPositionImpactFactorForLiquidations: 500n,
    maxPositionImpactFactorPositive: 1000n,
    maxPositionImpactFactorNegative: 1000n,
  } as unknown as MarketInfo;

  beforeEach(() => {
    (getPositionFee as Mock).mockReturnValue({ positionFeeUsd: 50n });
    (getPriceImpactForPosition as Mock).mockReturnValue({ priceImpactDeltaUsd: -100n, balanceWasImproved: false });
    (convertToUsd as Mock).mockReturnValue(0n);
  });

  it("returns 0 when sizeInUsd <= 0", () => {
    const result = getMinCollateralUsdForLiquidationPrice({
      sizeInUsd: 0n,
      sizeInTokens: 100n,
      marketInfo,
      pendingImpactAmount: 0n,
      minCollateralUsd: 200n,
      pnl: 0n,
      isLong: true,
      userReferralInfo: undefined,
    });
    expect(result).toBe(0n);
  });

  it("returns 0 when sizeInTokens <= 0", () => {
    const result = getMinCollateralUsdForLiquidationPrice({
      sizeInUsd: 1000n,
      sizeInTokens: 0n,
      marketInfo,
      pendingImpactAmount: 0n,
      minCollateralUsd: 200n,
      pnl: 0n,
      isLong: true,
      userReferralInfo: undefined,
    });
    expect(result).toBe(0n);
  });

  it("returns liquidationCollateralUsd - pnl - priceImpactDeltaUsd + closingFeeUsd for a profitable position", () => {
    const result = getMinCollateralUsdForLiquidationPrice({
      sizeInUsd: 1000n,
      sizeInTokens: 100n,
      marketInfo,
      pendingImpactAmount: 0n,
      minCollateralUsd: 200n,
      pnl: 500n,
      isLong: true,
      userReferralInfo: undefined,
    });
    expect(result).toBe(-250n);
  });

  it("returns a larger value for a losing position than a profitable one", () => {
    const losing = getMinCollateralUsdForLiquidationPrice({
      sizeInUsd: 1000n,
      sizeInTokens: 100n,
      marketInfo,
      pendingImpactAmount: 0n,
      minCollateralUsd: 200n,
      pnl: -300n,
      isLong: true,
      userReferralInfo: undefined,
    });
    const profitable = getMinCollateralUsdForLiquidationPrice({
      sizeInUsd: 1000n,
      sizeInTokens: 100n,
      marketInfo,
      pendingImpactAmount: 0n,
      minCollateralUsd: 200n,
      pnl: 300n,
      isLong: true,
      userReferralInfo: undefined,
    });
    expect(losing).toBeGreaterThan(profitable);
    expect(losing).toBe(550n);
    expect(profitable).toBe(-50n);
  });

  it("uses minCollateralUsd when it exceeds the factor-based liquidation collateral", () => {
    const result = getMinCollateralUsdForLiquidationPrice({
      sizeInUsd: 1000n,
      sizeInTokens: 100n,
      marketInfo,
      pendingImpactAmount: 0n,
      minCollateralUsd: 500n,
      pnl: 0n,
      isLong: true,
      userReferralInfo: undefined,
    });
    expect(result).toBe(550n);
  });

  it("includes pendingImpactUsd in priceImpactDeltaUsd", () => {
    (convertToUsd as Mock).mockReturnValueOnce(-30n);
    const result = getMinCollateralUsdForLiquidationPrice({
      sizeInUsd: 1000n,
      sizeInTokens: 100n,
      marketInfo,
      pendingImpactAmount: -100n,
      minCollateralUsd: 200n,
      pnl: 0n,
      isLong: true,
      userReferralInfo: undefined,
    });
    expect(result).toBe(250n);
  });

  it("uses realistic factors so priceImpactDeltaUsd is not capped to zero", () => {
    const realisticMarketInfo = {
      indexToken: {
        decimals: 8,
        prices: { minPrice: expandDecimals(1, USD_DECIMALS), maxPrice: expandDecimals(1, USD_DECIMALS) },
      },
      minCollateralFactorForLiquidation: 1000n,
      maxPositionImpactFactorForLiquidations: expandDecimals(1, 28),
      maxPositionImpactFactorPositive: 1000n,
      maxPositionImpactFactorNegative: 1000n,
    } as unknown as MarketInfo;

    const sizeInUsd = expandDecimals(1000, USD_DECIMALS);
    (getPositionFee as Mock).mockReturnValueOnce({ positionFeeUsd: expandDecimals(5, USD_DECIMALS) });
    (getPriceImpactForPosition as Mock).mockReturnValueOnce({
      priceImpactDeltaUsd: -expandDecimals(20, USD_DECIMALS),
      balanceWasImproved: false,
    });

    const result = getMinCollateralUsdForLiquidationPrice({
      sizeInUsd,
      sizeInTokens: 100n,
      marketInfo: realisticMarketInfo,
      pendingImpactAmount: 0n,
      minCollateralUsd: expandDecimals(100, USD_DECIMALS),
      pnl: expandDecimals(50, USD_DECIMALS),
      isLong: true,
      userReferralInfo: undefined,
    });
    expect(result).toBe(expandDecimals(65, USD_DECIMALS));
  });

  it("works for short positions identically", () => {
    const long = getMinCollateralUsdForLiquidationPrice({
      sizeInUsd: 1000n,
      sizeInTokens: 100n,
      marketInfo,
      pendingImpactAmount: 0n,
      minCollateralUsd: 200n,
      pnl: 200n,
      isLong: true,
      userReferralInfo: undefined,
    });
    const short = getMinCollateralUsdForLiquidationPrice({
      sizeInUsd: 1000n,
      sizeInTokens: 100n,
      marketInfo,
      pendingImpactAmount: 0n,
      minCollateralUsd: 200n,
      pnl: 200n,
      isLong: false,
      userReferralInfo: undefined,
    });
    expect(short).toBe(long);
  });
});
