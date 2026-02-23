import { describe, expect, it } from "vitest";

import { getMaxAllowedLeverageByMinCollateralFactor } from "domain/synthetics/markets";
import { expandDecimals, USD_DECIMALS } from "lib/numbers";
import { mockMarketsInfoData, mockTokensData } from "sdk/test/mock";
import { bigMath } from "sdk/utils/bigmath";
import { getLeverage } from "sdk/utils/positions";
import { convertToUsd } from "sdk/utils/tokens";

import {
  clampPercentage,
  calcMaxSizeDeltaInUsdByLeverage,
  calcSizePercentage,
  calcSizeAmountByPercentage,
  calcMarginPercentage,
  calcMarginAmountByPercentage,
} from "../../trade/utils/marginFields";

const tokensData = mockTokensData();

// minCollateralFactor = 5e27 → maxAllowedLeverage = 100x (1_000_000 in basis points)
const MCF_100X = expandDecimals(5, 27);

// Fee factor 0.05% = 5e26
const FEE_FACTOR_005 = expandDecimals(5, 26);
// Fee factor 0.07% = 7e26
const FEE_FACTOR_007 = expandDecimals(7, 26);

function makeMarketInfo(overrides: Record<string, unknown> = {}) {
  const marketsInfoData = mockMarketsInfoData(tokensData, ["ETH-ETH-USDC"], {
    "ETH-ETH-USDC": {
      minCollateralFactor: MCF_100X,
      positionFeeFactorForBalanceWasImproved: FEE_FACTOR_005,
      positionFeeFactorForBalanceWasNotImproved: FEE_FACTOR_007,
      ...overrides,
    },
  });
  return marketsInfoData["ETH-ETH-USDC"];
}

const ETH_PRICE = expandDecimals(1200, 30);

// Helper: convert index token amount back to USD for leverage verification
function tokenAmountToUsd(tokenAmount: bigint, decimals: number, price: bigint): bigint {
  return convertToUsd(tokenAmount, decimals, price)!;
}

describe("clampPercentage", () => {
  it("returns 0 for NaN", () => {
    expect(clampPercentage(NaN)).toBe(0);
  });

  it("returns 0 for Infinity", () => {
    expect(clampPercentage(Infinity)).toBe(0);
    expect(clampPercentage(-Infinity)).toBe(0);
  });

  it("clamps negative values to 0", () => {
    expect(clampPercentage(-10)).toBe(0);
  });

  it("clamps values above 100 to 100", () => {
    expect(clampPercentage(150)).toBe(100);
  });

  it("passes through valid values", () => {
    expect(clampPercentage(0)).toBe(0);
    expect(clampPercentage(50)).toBe(50);
    expect(clampPercentage(100)).toBe(100);
    expect(clampPercentage(33.3)).toBe(33.3);
  });
});

describe("calcMaxSizeDeltaInUsdByLeverage", () => {
  it("returns undefined for zero initialCollateralUsd", () => {
    const marketInfo = makeMarketInfo();

    expect(
      calcMaxSizeDeltaInUsdByLeverage({
        marketInfo,
        initialCollateralUsd: 0n,
        markPrice: ETH_PRICE,
        toTokenDecimals: 18,
        isLong: true,
        longLiquidity: undefined,
        shortLiquidity: undefined,
      })
    ).toBeUndefined();
  });

  it("returns a positive value for new position (no existing)", () => {
    const marketInfo = makeMarketInfo();
    const collateralUsd = expandDecimals(1000, USD_DECIMALS);

    const result = calcMaxSizeDeltaInUsdByLeverage({
      marketInfo,
      initialCollateralUsd: collateralUsd,
      markPrice: ETH_PRICE,
      toTokenDecimals: 18,
      isLong: true,
      longLiquidity: undefined,
      shortLiquidity: undefined,
    });

    expect(result).toBeDefined();
    expect(result!).toBeGreaterThan(0n);
  });

  it("leverage bound produces resulting leverage close to max for new position", () => {
    // Use same fee for both improved/not-improved to avoid ambiguity
    const feeFactor = FEE_FACTOR_005;
    const marketInfo = makeMarketInfo({
      positionFeeFactorForBalanceWasImproved: feeFactor,
      positionFeeFactorForBalanceWasNotImproved: feeFactor,
    });

    const collateralUsd = expandDecimals(1000, USD_DECIMALS);
    const maxAllowedLeverage = getMaxAllowedLeverageByMinCollateralFactor(MCF_100X);

    const result = calcMaxSizeDeltaInUsdByLeverage({
      marketInfo,
      initialCollateralUsd: collateralUsd,
      markPrice: ETH_PRICE,
      toTokenDecimals: 18,
      isLong: true,
      longLiquidity: undefined,
      shortLiquidity: undefined,
    });

    expect(result).toBeDefined();

    // Convert token amount back to USD size
    const sizeDeltaUsd = tokenAmountToUsd(result!, 18, ETH_PRICE);
    // Position fee = sizeDelta * feeFactor / PRECISION
    const positionFee = bigMath.mulDiv(sizeDeltaUsd, feeFactor, expandDecimals(1, 30));
    const effectiveCollateral = collateralUsd - positionFee;

    const resultingLeverage = getLeverage({
      sizeInUsd: sizeDeltaUsd,
      collateralUsd: effectiveCollateral,
      pnl: 0n,
      pendingBorrowingFeesUsd: 0n,
      pendingFundingFeesUsd: 0n,
    });

    // Resulting leverage should be very close to max (within 1% tolerance due to rounding)
    const maxLev = BigInt(maxAllowedLeverage);
    expect(resultingLeverage).toBeDefined();
    expect(resultingLeverage!).toBeLessThanOrEqual(maxLev + maxLev / 100n);
    expect(resultingLeverage!).toBeGreaterThan(maxLev - maxLev / 100n);
  });

  it("accounts for existing position size and collateral", () => {
    const feeFactor = FEE_FACTOR_005;
    const marketInfo = makeMarketInfo({
      positionFeeFactorForBalanceWasImproved: feeFactor,
      positionFeeFactorForBalanceWasNotImproved: feeFactor,
    });

    const collateralUsd = expandDecimals(500, USD_DECIMALS);
    const maxAllowedLeverage = getMaxAllowedLeverageByMinCollateralFactor(MCF_100X);

    const existingPosition = {
      sizeInUsd: expandDecimals(50000, USD_DECIMALS),
      collateralUsd: expandDecimals(1000, USD_DECIMALS),
      pendingBorrowingFeesUsd: 0n,
      pendingFundingFeesUsd: 0n,
    };

    const result = calcMaxSizeDeltaInUsdByLeverage({
      marketInfo,
      initialCollateralUsd: collateralUsd,
      markPrice: ETH_PRICE,
      toTokenDecimals: 18,
      isLong: true,
      longLiquidity: undefined,
      shortLiquidity: undefined,
      existingPosition,
    });

    expect(result).toBeDefined();

    // Verify resulting leverage of combined position
    const sizeDeltaUsd = tokenAmountToUsd(result!, 18, ETH_PRICE);
    const positionFee = bigMath.mulDiv(sizeDeltaUsd, feeFactor, expandDecimals(1, 30));
    const collateralDeltaUsd = collateralUsd - positionFee;

    const nextSizeUsd = existingPosition.sizeInUsd + sizeDeltaUsd;
    const nextCollateralUsd = existingPosition.collateralUsd + collateralDeltaUsd;

    const resultingLeverage = getLeverage({
      sizeInUsd: nextSizeUsd,
      collateralUsd: nextCollateralUsd,
      pnl: 0n,
      pendingBorrowingFeesUsd: 0n,
      pendingFundingFeesUsd: 0n,
    });

    const maxLev = BigInt(maxAllowedLeverage);
    expect(resultingLeverage).toBeDefined();
    expect(resultingLeverage!).toBeLessThanOrEqual(maxLev + maxLev / 100n);
    expect(resultingLeverage!).toBeGreaterThan(maxLev - maxLev / 100n);
  });

  it("over-leveraged existing position reduces max size delta vs no position", () => {
    const feeFactor = FEE_FACTOR_005;
    const marketInfo = makeMarketInfo({
      positionFeeFactorForBalanceWasImproved: feeFactor,
      positionFeeFactorForBalanceWasNotImproved: feeFactor,
    });

    const collateralUsd = expandDecimals(1000, USD_DECIMALS);
    const baseParams = {
      marketInfo,
      initialCollateralUsd: collateralUsd,
      markPrice: ETH_PRICE,
      toTokenDecimals: 18,
      isLong: true,
      longLiquidity: undefined,
      shortLiquidity: undefined,
    } as const;

    const withoutPosition = calcMaxSizeDeltaInUsdByLeverage(baseParams);

    // Existing position at 110x (above 100x max) — still allows a smaller delta
    // because the new collateral provides enough room
    const withPosition = calcMaxSizeDeltaInUsdByLeverage({
      ...baseParams,
      existingPosition: {
        sizeInUsd: expandDecimals(110000, USD_DECIMALS),
        collateralUsd: expandDecimals(1000, USD_DECIMALS),
        pendingBorrowingFeesUsd: 0n,
        pendingFundingFeesUsd: 0n,
      },
    });

    expect(withoutPosition).toBeDefined();
    expect(withPosition).toBeDefined();
    expect(withPosition!).toBeLessThan(withoutPosition!);
  });

  it("under-leveraged existing position increases max size delta vs no position", () => {
    const feeFactor = FEE_FACTOR_005;
    const marketInfo = makeMarketInfo({
      positionFeeFactorForBalanceWasImproved: feeFactor,
      positionFeeFactorForBalanceWasNotImproved: feeFactor,
    });

    const collateralUsd = expandDecimals(1000, USD_DECIMALS);
    const baseParams = {
      marketInfo,
      initialCollateralUsd: collateralUsd,
      markPrice: ETH_PRICE,
      toTokenDecimals: 18,
      isLong: true,
      longLiquidity: undefined,
      shortLiquidity: undefined,
    } as const;

    const withoutPosition = calcMaxSizeDeltaInUsdByLeverage(baseParams);

    // Existing position at 50x (below 100x max) — spare collateral adds room
    const withPosition = calcMaxSizeDeltaInUsdByLeverage({
      ...baseParams,
      existingPosition: {
        sizeInUsd: expandDecimals(50000, USD_DECIMALS),
        collateralUsd: expandDecimals(1000, USD_DECIMALS),
        pendingBorrowingFeesUsd: 0n,
        pendingFundingFeesUsd: 0n,
      },
    });

    expect(withoutPosition).toBeDefined();
    expect(withPosition).toBeDefined();
    expect(withPosition!).toBeGreaterThan(withoutPosition!);
  });

  it("returns undefined when existing position already at max leverage", () => {
    const marketInfo = makeMarketInfo();
    const collateralUsd = expandDecimals(100, USD_DECIMALS);

    // Position at 100x leverage → no room to add
    const result = calcMaxSizeDeltaInUsdByLeverage({
      marketInfo,
      initialCollateralUsd: collateralUsd,
      markPrice: ETH_PRICE,
      toTokenDecimals: 18,
      isLong: true,
      longLiquidity: undefined,
      shortLiquidity: undefined,
      existingPosition: {
        sizeInUsd: expandDecimals(1_000_000, USD_DECIMALS),
        collateralUsd: expandDecimals(1000, USD_DECIMALS),
        pendingBorrowingFeesUsd: 0n,
        pendingFundingFeesUsd: 0n,
      },
    });

    expect(result).toBeUndefined();
  });

  it("pending fees reduce available room", () => {
    const feeFactor = FEE_FACTOR_005;
    const marketInfo = makeMarketInfo({
      positionFeeFactorForBalanceWasImproved: feeFactor,
      positionFeeFactorForBalanceWasNotImproved: feeFactor,
    });

    const collateralUsd = expandDecimals(1000, USD_DECIMALS);
    const existingBase = {
      sizeInUsd: expandDecimals(50000, USD_DECIMALS),
      collateralUsd: expandDecimals(1000, USD_DECIMALS),
      pendingFundingFeesUsd: 0n,
    };

    const baseParams = {
      marketInfo,
      initialCollateralUsd: collateralUsd,
      markPrice: ETH_PRICE,
      toTokenDecimals: 18,
      isLong: true,
      longLiquidity: undefined,
      shortLiquidity: undefined,
    } as const;

    const withoutFees = calcMaxSizeDeltaInUsdByLeverage({
      ...baseParams,
      existingPosition: { ...existingBase, pendingBorrowingFeesUsd: 0n },
    });

    const withFees = calcMaxSizeDeltaInUsdByLeverage({
      ...baseParams,
      existingPosition: { ...existingBase, pendingBorrowingFeesUsd: expandDecimals(200, USD_DECIMALS) },
    });

    expect(withoutFees).toBeDefined();
    expect(withFees).toBeDefined();
    expect(withFees!).toBeLessThan(withoutFees!);
  });

  it("picks liquidityBound when it is lower than leverageBound", () => {
    const marketInfo = makeMarketInfo();
    const collateralUsd = expandDecimals(1000, USD_DECIMALS);

    // Very small liquidity → should be the bound
    const smallLiquidity = expandDecimals(100, USD_DECIMALS);

    const result = calcMaxSizeDeltaInUsdByLeverage({
      marketInfo,
      initialCollateralUsd: collateralUsd,
      markPrice: ETH_PRICE,
      toTokenDecimals: 18,
      isLong: true,
      longLiquidity: smallLiquidity,
      shortLiquidity: undefined,
    });

    // liquidity = $100 → token amount = 100 * 10^30 * 10^18 / (1200 * 10^30) ≈ 0.0833 ETH
    const expectedTokens = (expandDecimals(100, USD_DECIMALS) * expandDecimals(1, 18)) / ETH_PRICE;
    expect(result).toBeDefined();
    expect(result!).toBe(expectedTokens);
  });

  it("returns leverageBound when liquidityBound is undefined", () => {
    const marketInfo = makeMarketInfo();
    const collateralUsd = expandDecimals(1000, USD_DECIMALS);

    const result = calcMaxSizeDeltaInUsdByLeverage({
      marketInfo,
      initialCollateralUsd: collateralUsd,
      markPrice: ETH_PRICE,
      toTokenDecimals: 18,
      isLong: true,
      longLiquidity: undefined,
      shortLiquidity: undefined,
    });

    expect(result).toBeDefined();
    expect(result!).toBeGreaterThan(0n);
  });

  it("uses shortLiquidity for short positions", () => {
    const marketInfo = makeMarketInfo();
    const collateralUsd = expandDecimals(1000, USD_DECIMALS);
    const smallLiquidity = expandDecimals(50, USD_DECIMALS);

    const result = calcMaxSizeDeltaInUsdByLeverage({
      marketInfo,
      initialCollateralUsd: collateralUsd,
      markPrice: ETH_PRICE,
      toTokenDecimals: 18,
      isLong: false,
      longLiquidity: expandDecimals(999999, USD_DECIMALS), // large, should be ignored
      shortLiquidity: smallLiquidity,
    });

    const expectedTokens = (expandDecimals(50, USD_DECIMALS) * expandDecimals(1, 18)) / ETH_PRICE;
    expect(result).toBeDefined();
    expect(result!).toBe(expectedTokens);
  });

  it("returns real token amount (no visual multiplier scaling)", () => {
    const feeFactor = FEE_FACTOR_005;
    const marketInfo = makeMarketInfo({
      positionFeeFactorForBalanceWasImproved: feeFactor,
      positionFeeFactorForBalanceWasNotImproved: feeFactor,
    });

    const collateralUsd = expandDecimals(1000, USD_DECIMALS);
    const result = calcMaxSizeDeltaInUsdByLeverage({
      marketInfo,
      initialCollateralUsd: collateralUsd,
      markPrice: ETH_PRICE,
      toTokenDecimals: 18,
      isLong: true,
      longLiquidity: undefined,
      shortLiquidity: undefined,
    });

    expect(result).toBeDefined();

    // Result should be in real token units (same as convertToTokenAmount output).
    // For $1000 collateral at 100x max leverage, max size ~$100k → ~83.3 ETH at $1200.
    // Verify the result is in real token scale (not multiplied by any visual multiplier).
    const sizeUsd = tokenAmountToUsd(result!, 18, ETH_PRICE);
    expect(sizeUsd).toBeLessThan(expandDecimals(100000, USD_DECIMALS));
    expect(sizeUsd).toBeGreaterThan(expandDecimals(90000, USD_DECIMALS));
  });

  it("handles zero minCollateralFactor (default 50x max)", () => {
    const marketInfo = makeMarketInfo({ minCollateralFactor: 0n });
    const collateralUsd = expandDecimals(1000, USD_DECIMALS);

    const result = calcMaxSizeDeltaInUsdByLeverage({
      marketInfo,
      initialCollateralUsd: collateralUsd,
      markPrice: ETH_PRICE,
      toTokenDecimals: 18,
      isLong: true,
      longLiquidity: undefined,
      shortLiquidity: undefined,
    });

    expect(result).toBeDefined();
    // Default is 50x. Without fees: 1000 * 50 = 50000 USD → ~41.67 ETH
    // With fees it's slightly less. Just verify it's reasonable.
    const sizeDeltaUsd = tokenAmountToUsd(result!, 18, ETH_PRICE);
    expect(sizeDeltaUsd).toBeLessThan(expandDecimals(50000, USD_DECIMALS));
    expect(sizeDeltaUsd).toBeGreaterThan(expandDecimals(45000, USD_DECIMALS));
  });
});

describe("calcSizePercentage", () => {
  it("returns 0 when maxSize is undefined", () => {
    expect(calcSizePercentage(1000n, undefined)).toBe(0);
  });

  it("returns 0 when maxSize is 0", () => {
    expect(calcSizePercentage(1000n, 0n)).toBe(0);
  });

  it("returns 0 when currentSize is 0", () => {
    expect(calcSizePercentage(0n, 1000n)).toBe(0);
  });

  it("returns 100 when currentSize equals maxSize", () => {
    expect(calcSizePercentage(1000n, 1000n)).toBe(100);
  });

  it("returns ~50 when currentSize is half of maxSize", () => {
    const result = calcSizePercentage(500n, 1000n);
    expect(result).toBe(50);
  });

  it("clamps to 100 when currentSize exceeds maxSize", () => {
    expect(calcSizePercentage(1500n, 1000n)).toBe(100);
  });

  it("handles large BigInt values correctly", () => {
    const max = expandDecimals(1, 30);
    const current = max / 4n;
    expect(calcSizePercentage(current, max)).toBe(25);
  });
});

describe("calcSizeAmountByPercentage", () => {
  it("returns undefined when maxSize is undefined", () => {
    expect(calcSizeAmountByPercentage(50, undefined)).toBeUndefined();
  });

  it("returns undefined when maxSize is 0", () => {
    expect(calcSizeAmountByPercentage(50, 0n)).toBeUndefined();
  });

  it("returns exact maxSize at 100%", () => {
    const maxSize = 123456789n;
    expect(calcSizeAmountByPercentage(100, maxSize)).toBe(maxSize);
  });

  it("returns half at 50%", () => {
    const maxSize = 1000n;
    expect(calcSizeAmountByPercentage(50, maxSize)).toBe(500n);
  });

  it("returns 0 at 0%", () => {
    expect(calcSizeAmountByPercentage(0, 1000n)).toBe(0n);
  });

  it("rounds percentage to nearest integer", () => {
    const maxSize = 1000n;
    // 33.7% rounds to 34%
    expect(calcSizeAmountByPercentage(33.7, maxSize)).toBe(340n);
  });

  it("clamps negative percentage to 0", () => {
    expect(calcSizeAmountByPercentage(-10, 1000n)).toBe(0n);
  });

  it("clamps percentage above 100 to return maxSize", () => {
    const maxSize = 1000n;
    expect(calcSizeAmountByPercentage(150, maxSize)).toBe(maxSize);
  });
});

describe("calcMarginPercentage", () => {
  it("returns 0 when balance is undefined", () => {
    expect(calcMarginPercentage("100", undefined, 6)).toBe(0);
  });

  it("returns 0 when balance is 0", () => {
    expect(calcMarginPercentage("100", 0n, 6)).toBe(0);
  });

  it("returns 0 for empty input string", () => {
    expect(calcMarginPercentage("", 1000000n, 6)).toBe(0);
  });

  it("returns 0 for '0' input", () => {
    expect(calcMarginPercentage("0", 1000000n, 6)).toBe(0);
  });

  it("returns 100 when input equals full balance", () => {
    // USDC: 6 decimals, balance = 1000 USDC = 1_000_000_000 (10^9 / 10^3... wait)
    // Actually 1000 USDC = 1000 * 10^6 = 1_000_000_000
    const balance = 1000000000n; // 1000 USDC
    expect(calcMarginPercentage("1000", balance, 6)).toBe(100);
  });

  it("returns ~50 for half balance", () => {
    const balance = 1000000000n; // 1000 USDC
    expect(calcMarginPercentage("500", balance, 6)).toBe(50);
  });

  it("clamps to 100 when input exceeds balance", () => {
    const balance = 1000000000n; // 1000 USDC
    expect(calcMarginPercentage("2000", balance, 6)).toBe(100);
  });

  it("handles ETH decimals (18)", () => {
    const balance = expandDecimals(10, 18); // 10 ETH
    expect(calcMarginPercentage("5", balance, 18)).toBe(50);
  });
});

describe("calcMarginAmountByPercentage", () => {
  it("returns full balance at 100% (no decimal truncation)", () => {
    // 1000.123456 USDC
    const balance = 1000123456n;
    const result = calcMarginAmountByPercentage(100, balance, 6, undefined, true);
    expect(result).toBe("1000.123456");
  });

  it("returns zero amount at 0%", () => {
    const balance = 1000000000n; // 1000 USDC
    const result = calcMarginAmountByPercentage(0, balance, 6, undefined, true);
    expect(result).toBe("0");
  });

  it("returns half balance at 50%", () => {
    const balance = 1000000000n; // 1000 USDC
    const result = calcMarginAmountByPercentage(50, balance, 6, undefined, true);
    // 50% of 1000 USDC = 500 USDC = 500000000
    expect(result).toBe("500");
  });

  it("handles ETH decimals (18) at 100%", () => {
    const balance = expandDecimals(10, 18); // 10 ETH
    const result = calcMarginAmountByPercentage(100, balance, 18, undefined, false);
    expect(result).toBe("10");
  });

  it("formats partial percentages with limited decimals", () => {
    const balance = 1000000000n; // 1000 USDC
    const result = calcMarginAmountByPercentage(33, balance, 6, undefined, true);
    // 33% of 1000 USDC = 330 USDC
    expect(result).toBe("330");
  });

  it("does not throw on NaN percentage", () => {
    const balance = 1000000000n;
    expect(() => calcMarginAmountByPercentage(NaN, balance, 6, undefined, true)).not.toThrow();
    expect(calcMarginAmountByPercentage(NaN, balance, 6, undefined, true)).toBe("0");
  });

  it("does not throw on Infinity percentage", () => {
    const balance = 1000000000n;
    expect(() => calcMarginAmountByPercentage(Infinity, balance, 6, undefined, true)).not.toThrow();
  });

  it("does not throw on fractional percentage", () => {
    const balance = 1000000000n;
    expect(() => calcMarginAmountByPercentage(33.7, balance, 6, undefined, true)).not.toThrow();
    // 33.7 rounds to 34 → 34% of 1000 = 340
    expect(calcMarginAmountByPercentage(33.7, balance, 6, undefined, true)).toBe("340");
  });

  it("clamps negative percentage to 0", () => {
    const balance = 1000000000n;
    expect(calcMarginAmountByPercentage(-10, balance, 6, undefined, true)).toBe("0");
  });

  it("clamps percentage above 100 to full balance", () => {
    const balance = 1000000000n;
    const result = calcMarginAmountByPercentage(150, balance, 6, undefined, true);
    expect(result).toBe("1000");
  });
});
