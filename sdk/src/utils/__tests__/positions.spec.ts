import { describe, expect, it, vi, beforeEach, Mock } from "vitest";

import { MarketInfo } from "types/markets";
import { Token } from "types/tokens";
import { expandDecimals, USD_DECIMALS } from "utils/numbers";

import { bigMath } from "../bigmath";
import { getPositionFee, getPriceImpactForPosition } from "../fees";
import { getCappedPoolPnl, getMarketPnl, getPoolUsdWithoutPnl } from "../markets";
import {
  getEntryPrice,
  getLeverage,
  getLiquidationPrice,
  getPositionKey,
  getPositionNetValue,
  getPositionPendingFeesUsd,
  getPositionPnlUsd,
  getPositionValueUsd,
  parsePositionKey,
} from "../positions";
import { convertToUsd, getIsEquivalentTokens } from "../tokens";

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
  it("calculates net position value", () => {
    const result = getPositionNetValue({
      collateralUsd: 1000n,
      pendingFundingFeesUsd: 10n,
      pendingBorrowingFeesUsd: 15n,
      closingFeeUsd: 5n,
      uiFeeUsd: 20n,
      pnl: 200n,
      totalPendingImpactDeltaUsd: -100n,
      priceImpactDiffUsd: 50n,
    });
    // netValue = 1000n - (10n+15n) -5n -20n + 200n -100n + 50n = 1100n
    expect(result).toBe(1100n);
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
