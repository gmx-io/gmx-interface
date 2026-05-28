import { describe, expect, it } from "vitest";

import { BASIS_POINTS_DIVISOR_BIGINT, USD_DECIMALS } from "configs/factors";
import {
  applyFactor,
  basisPointsToFloat,
  bigintToNumber,
  BN_NEGATIVE_ONE,
  BN_ONE,
  BN_ZERO,
  expandDecimals,
  formatAmount,
  formatAmountHuman,
  formatBalanceAmount,
  formatFactor,
  formatPercentage,
  formatTokenAmount,
  formatUsdPrice,
  getBasisPoints,
  numberToBigint,
  PERCENT_PRECISION_DECIMALS,
  PRECISION,
  PRECISION_DECIMALS,
  trimZeroDecimals,
  roundWithDecimals,
  roundUpMagnitudeDivision,
  toBigNumberWithDecimals,
} from "utils/numbers";

const ONE_USD = 1000000000000000000000000000000n;

describe("numbers utils", () => {
  it("constants", () => {
    // Just to confirm they exist and have no unexpected changes
    expect(PRECISION).toBe(expandDecimals(1, 30));
    expect(BN_ZERO).toBe(0n);
    expect(BN_ONE).toBe(1n);
    expect(BN_NEGATIVE_ONE).toBe(-1n);
  });

  describe("expandDecimals", () => {
    it("multiplies by 10^decimals", () => {
      expect(expandDecimals(1, 0)).toBe(1n);
      expect(expandDecimals(1, 1)).toBe(10n);
      expect(expandDecimals(1, 2)).toBe(100n);
      expect(expandDecimals(5, 3)).toBe(5000n);
    });
    it("handles zero gracefully", () => {
      expect(expandDecimals(0, 5)).toBe(0n);
    });
  });

  describe("basisPointsToFloat", () => {
    it("converts basis points to scaled big int float using PRECISION", () => {
      const result = basisPointsToFloat(100n);
      expect(result).toBe(expandDecimals(1, 28));
    });
  });

  describe("getBasisPoints", () => {
    it("calculates basis points as (numerator * 10000) / denominator", () => {
      expect(getBasisPoints(2n, 1n)).toBe(2n * BASIS_POINTS_DIVISOR_BIGINT);
      expect(getBasisPoints(1n, 2n)).toBe(5000n);
    });

    it("rounds up if remainder != 0 and shouldRoundUp=true", () => {
      expect(getBasisPoints(7n, 3n, true)).toBe(23334n);
    });

    it("returns same result if remainder=0, even if shouldRoundUp=true", () => {
      expect(getBasisPoints(2n, 1n, true)).toBe(20000n);
    });
  });

  describe("roundUpMagnitudeDivision", () => {
    it("rounds positive numbers up", () => {
      expect(roundUpMagnitudeDivision(10n, 3n)).toBe(4n);
      expect(roundUpMagnitudeDivision(9n, 3n)).toBe(3n);
    });

    it("rounds negative numbers up in magnitude", () => {
      expect(roundUpMagnitudeDivision(-10n, 3n)).toBe(-4n);
    });
  });

  describe("applyFactor", () => {
    it("applies factor by (value * factor)/PRECISION", () => {
      const value = expandDecimals(100, 30);
      const factor = 200n;
      expect(applyFactor(value, factor)).toBe(20000n);
    });
  });

  it("bigintToNumber", () => {
    expect(bigintToNumber(0n, 30)).toEqual(0);
    expect(bigintToNumber(1n, 30)).toEqual(1e-30);
    expect(bigintToNumber(PRECISION, 30)).toEqual(1);
    expect(bigintToNumber(PRECISION * 100n, 30)).toEqual(100);
    expect(bigintToNumber(PRECISION * 2n, 30)).toEqual(2);
    expect(bigintToNumber(PRECISION / 2n, 30)).toEqual(0.5);

    expect(bigintToNumber(1123456n, 6)).toEqual(1.123456);
    expect(bigintToNumber(-1123456n, 6)).toEqual(-1.123456);
  });

  it("numberToBigint", () => {
    expect(numberToBigint(0, 30)).toEqual(0n);
    expect(numberToBigint(1e-30, 30)).toEqual(1n);
    expect(numberToBigint(-1e-30, 30)).toEqual(-1n);
    expect(numberToBigint(1, 30)).toEqual(PRECISION);
    expect(numberToBigint(100, 30)).toEqual(PRECISION * 100n);
    expect(numberToBigint(2, 30)).toEqual(PRECISION * 2n);
    expect(numberToBigint(0.5, 30)).toEqual(PRECISION / 2n);
    expect(numberToBigint(-0.5, 30)).toEqual(-PRECISION / 2n);

    expect(numberToBigint(1.1234567, 6)).toEqual(1123456n);
    expect(numberToBigint(1.12345678, 6)).toEqual(1123456n);
    expect(numberToBigint(1.123456789, 6)).toEqual(1123456n);
    expect(numberToBigint(-1.123456789, 6)).toEqual(-1123456n);
  });
});

describe("trimZeroDecimals", () => {
  it("large integer stays as plain string (no scientific)", () => {
    const large = "1" + "0".repeat(31);
    expect(trimZeroDecimals(large)).toBe(large);
  });

  it("negative large integer", () => {
    const largeNeg = "-" + "1" + "0".repeat(31);
    expect(trimZeroDecimals(largeNeg)).toBe(largeNeg);
  });

  it("fraction with only zero decimals trims to int", () => {
    expect(trimZeroDecimals("123.000")).toBe("123");
  });

  it("leading zeros on integer are removed", () => {
    expect(trimZeroDecimals("0000123")).toBe("123");
  });

  it("leading zeros with trailing zero decimals trims to int", () => {
    expect(trimZeroDecimals("0000123.000")).toBe("123");
  });
});

describe("toBigNumberWithDecimals", () => {
  it("should convert string to big number with decimals", () => {
    expect(toBigNumberWithDecimals("0", PRECISION_DECIMALS)).toBe(0n);
    expect(toBigNumberWithDecimals("1", PRECISION_DECIMALS)).toBe(1000000000000000000000000000000n);
    expect(toBigNumberWithDecimals("123.456", PRECISION_DECIMALS)).toBe(123456000000000000000000000000000n);
    expect(toBigNumberWithDecimals("123.456789", PRECISION_DECIMALS)).toBe(123456789000000000000000000000000n);
    expect(toBigNumberWithDecimals("-1.5", PRECISION_DECIMALS)).toBe(-1500000000000000000000000000000n);
    expect(toBigNumberWithDecimals("0.000001", PRECISION_DECIMALS)).toBe(1000000000000000000000000n);
  });

  it("should handle strings with more decimals than token decimals parameter", () => {
    expect(toBigNumberWithDecimals("0.123456789012345678901234567890", 5)).toBe(12345n);
  });

  it("should handle cases with different token decimals ", () => {
    expect(toBigNumberWithDecimals("0.1234567890123456789012345678901", 18)).toBe(123456789012345678n);
    expect(toBigNumberWithDecimals("0.12345", 5)).toBe(12345n);
    expect(toBigNumberWithDecimals("0.1", 1)).toBe(1n);
  });

  it("should be compatible with formatAmount", () => {
    expect(formatAmount(toBigNumberWithDecimals("123.456", PRECISION_DECIMALS), USD_DECIMALS, 3)).toBe("123.456");
    expect(formatAmount(toBigNumberWithDecimals("0.789", PRECISION_DECIMALS), USD_DECIMALS, 2)).toBe("0.79");
  });
});

describe("roundWithDecimals", () => {
  it("should round small numbers correctly", () => {
    expect(
      roundWithDecimals(toBigNumberWithDecimals("0.0000001", PRECISION_DECIMALS), {
        decimals: PRECISION_DECIMALS,
        displayDecimals: 0,
      })
    ).toBe(0n);
    expect(
      roundWithDecimals(toBigNumberWithDecimals("0.5", PRECISION_DECIMALS), {
        decimals: PRECISION_DECIMALS,
        displayDecimals: 0,
      })
    ).toBe(toBigNumberWithDecimals("1", PRECISION_DECIMALS));
    expect(
      roundWithDecimals(toBigNumberWithDecimals("0.499", PRECISION_DECIMALS), {
        decimals: PRECISION_DECIMALS,
        displayDecimals: 0,
      })
    ).toBe(0n);
    expect(
      roundWithDecimals(toBigNumberWithDecimals("1", PRECISION_DECIMALS), {
        decimals: PRECISION_DECIMALS,
        displayDecimals: 1,
      })
    ).toBe(toBigNumberWithDecimals("1", PRECISION_DECIMALS));
  });

  it("should round numbers at specific decimal places", () => {
    expect(
      roundWithDecimals(toBigNumberWithDecimals("1.49", PRECISION_DECIMALS), {
        decimals: PRECISION_DECIMALS,
        displayDecimals: 1,
      })
    ).toBe(toBigNumberWithDecimals("1.5", PRECISION_DECIMALS));
    expect(
      roundWithDecimals(toBigNumberWithDecimals("1.44", PRECISION_DECIMALS), {
        decimals: PRECISION_DECIMALS,
        displayDecimals: 1,
      })
    ).toBe(toBigNumberWithDecimals("1.4", PRECISION_DECIMALS));
    expect(
      roundWithDecimals(toBigNumberWithDecimals("1.499", PRECISION_DECIMALS), {
        decimals: PRECISION_DECIMALS,
        displayDecimals: 2,
      })
    ).toBe(toBigNumberWithDecimals("1.50", PRECISION_DECIMALS));
    expect(
      roundWithDecimals(toBigNumberWithDecimals("1.495", PRECISION_DECIMALS), {
        decimals: PRECISION_DECIMALS,
        displayDecimals: 2,
      })
    ).toBe(toBigNumberWithDecimals("1.50", PRECISION_DECIMALS));
  });

  it("should round large numbers correctly", () => {
    expect(
      roundWithDecimals(toBigNumberWithDecimals("499.999999", PRECISION_DECIMALS), {
        decimals: PRECISION_DECIMALS,
        displayDecimals: 5,
      })
    ).toBe(toBigNumberWithDecimals("500.00000", PRECISION_DECIMALS));
  });

  it("should handle complex rounding cases", () => {
    expect(
      roundWithDecimals(toBigNumberWithDecimals("0.0000000000000000000000000001", PRECISION_DECIMALS), {
        decimals: PRECISION_DECIMALS,
        displayDecimals: 25,
      })
    ).toBe(0n);
    expect(
      roundWithDecimals(toBigNumberWithDecimals("0.4999999999999999999999999999", PRECISION_DECIMALS), {
        decimals: PRECISION_DECIMALS,
        displayDecimals: 25,
      })
    ).toBe(toBigNumberWithDecimals("0.5", PRECISION_DECIMALS));
    expect(
      roundWithDecimals(toBigNumberWithDecimals("123.456789", PRECISION_DECIMALS), {
        decimals: PRECISION_DECIMALS,
        displayDecimals: 4,
      })
    ).toBe(toBigNumberWithDecimals("123.4568", PRECISION_DECIMALS));
  });

  it("should round numbers with different token decimals correctly", () => {
    const differentTokenDecimals = [18, 5, 1, 22];
    for (const tokenDecimals of differentTokenDecimals) {
      expect(
        roundWithDecimals(toBigNumberWithDecimals("123.456789", tokenDecimals), {
          decimals: tokenDecimals,
          displayDecimals: 4,
        })
      ).toBe(toBigNumberWithDecimals("123.4568", tokenDecimals));
    }
  });

  it("should handle edge cases", () => {
    expect(roundWithDecimals(0n, { decimals: PRECISION_DECIMALS, displayDecimals: 10 })).toBe(0n);
    expect(
      roundWithDecimals(toBigNumberWithDecimals("-1.5", PRECISION_DECIMALS), {
        decimals: PRECISION_DECIMALS,
        displayDecimals: 0,
      })
    ).toBe(toBigNumberWithDecimals("-2", PRECISION_DECIMALS));
    expect(
      roundWithDecimals(toBigNumberWithDecimals("-1.4", PRECISION_DECIMALS), {
        decimals: PRECISION_DECIMALS,
        displayDecimals: 0,
      })
    ).toBe(toBigNumberWithDecimals("-1", PRECISION_DECIMALS));
    expect(
      roundWithDecimals(toBigNumberWithDecimals("0.0000001", PRECISION_DECIMALS), {
        decimals: PRECISION_DECIMALS,
        displayDecimals: 5,
      })
    ).toBe(0n);
  });
});

describe("formatUsdPrice", () => {
  it("should tolerate undefined", () => {
    expect(formatUsdPrice()).toBeUndefined();
  });

  it("should return NA if negative", () => {
    expect(formatUsdPrice(-1n)).toBe("NA");
  });

  it("should calculate correct decimals if displayDecimals not passed", () =>
    // prettier-ignore
    {
    expect(formatUsdPrice(ONE_USD * 10000n)).toBe("$\u200a10,000.00");
    expect(formatUsdPrice(ONE_USD * 1000n)).toBe("$\u200a1,000.00");
    expect(formatUsdPrice(ONE_USD * 100n)).toBe("$\u200a100.000");
    expect(formatUsdPrice(ONE_USD * 10n)).toBe("$\u200a10.0000");
    expect(formatUsdPrice(ONE_USD)).toBe("$\u200a1.0000");
    expect(formatUsdPrice(ONE_USD / 10n)).toBe("$\u200a0.10000");
    expect(formatUsdPrice(ONE_USD / 100n)).toBe("$\u200a0.010000");
    expect(formatUsdPrice(ONE_USD / 1000n)).toBe("$\u200a0.0010000");
    expect(formatUsdPrice(ONE_USD / 10_000n)).toBe("$\u200a0.0001000");
    expect(formatUsdPrice(ONE_USD / 100_000n)).toBe("$\u200a0.00001000");
    expect(formatUsdPrice(ONE_USD / 1_000_000_000n)).toBe("$\u200a0.000000001");
    expect(formatUsdPrice(ONE_USD / 10_000_000_000n)).toBe("<\u00a0$\u200a0.000000001");
  });
});

describe("formatAmountHuman", () => {
  it("positive", () => {
    expect(formatAmountHuman(ONE_USD, USD_DECIMALS)).toBe("1.0");
    expect(formatAmountHuman(ONE_USD * 1000n, USD_DECIMALS)).toBe("1.0k");
    expect(formatAmountHuman(ONE_USD * 1000000n, USD_DECIMALS)).toBe("1.0m");
  });

  it("negative", () => {
    expect(formatAmountHuman(-1n * ONE_USD, USD_DECIMALS)).toBe("-1.0");
    expect(formatAmountHuman(-1n * ONE_USD * 1000n, USD_DECIMALS)).toBe("-1.0k");
    expect(formatAmountHuman(-1n * ONE_USD * 1000000n, USD_DECIMALS)).toBe("-1.0m");
  });

  it("should display dollar sign", () => {
    expect(formatAmountHuman(ONE_USD, USD_DECIMALS, true)).toBe("$\u200a1.0");
    expect(formatAmountHuman(-1n * ONE_USD, USD_DECIMALS, true)).toBe("-$\u200a1.0");
  });

  it("should display decimals", () => {
    expect(formatAmountHuman(ONE_USD * 1000n, USD_DECIMALS, false, 2)).toBe("1.00k");
    expect(formatAmountHuman(ONE_USD * 1500000n, USD_DECIMALS, false, 2)).toBe("1.50m");
    expect(formatAmountHuman(ONE_USD * 1000n, USD_DECIMALS, false, 0)).toBe("1k");
    expect(formatAmountHuman(ONE_USD * 1500000n, USD_DECIMALS, false, 0)).toBe("2m");
  });
});

describe("formatBalanceAmount", () => {
  const NBSP = "\u00a0";

  it("should display balance amount", () =>
    // prettier-ignore
    {
    expect(formatBalanceAmount(ONE_USD * 1000n, USD_DECIMALS)).toBe("1,000.00");
    expect(formatBalanceAmount(0n, USD_DECIMALS)).toBe("-");
    expect(formatBalanceAmount(0n, USD_DECIMALS, undefined, { showZero: true })).toBe("0.0000");
    expect(formatBalanceAmount(ONE_USD * 1n, USD_DECIMALS)).toBe("1.0000");
    expect(formatBalanceAmount(ONE_USD / 10n, USD_DECIMALS)).toBe("0.10000");
    expect(formatBalanceAmount(ONE_USD / 100n, USD_DECIMALS)).toBe("0.010000");
    expect(formatBalanceAmount(ONE_USD / 1_000n, USD_DECIMALS)).toBe("0.0010000");
    expect(formatBalanceAmount(ONE_USD / 10_000n, USD_DECIMALS)).toBe("0.0001000");
    expect(formatBalanceAmount(ONE_USD / 100_000n, USD_DECIMALS)).toBe("0.00001000");
    expect(formatBalanceAmount(ONE_USD / 1_000_000n, USD_DECIMALS)).toBe("0.000001000");
    expect(formatBalanceAmount(ONE_USD / 10_000_000n, USD_DECIMALS)).toBe("0.000000100");
    expect(formatBalanceAmount(ONE_USD / 100_000_000n, USD_DECIMALS)).toBe("0.000000010");
    expect(formatBalanceAmount(ONE_USD / 1_000_000_000n, USD_DECIMALS)).toBe("1.00e-9");
    expect(formatBalanceAmount(ONE_USD / 1_000_000_000_000n, USD_DECIMALS)).toBe("1.00e-12");
    expect(formatBalanceAmount(ONE_USD * -1n, USD_DECIMALS)).toBe("-1.0000");
  });

  it("should display balance amount with symbol", () => {
    expect(formatBalanceAmount(ONE_USD, USD_DECIMALS, "USDC")).toBe(`1.0000${NBSP}USDC`);

    expect(formatBalanceAmount(0n, USD_DECIMALS, "USDC", { showZero: true })).toBe(`0.0000${NBSP}USDC`);
    expect(formatBalanceAmount(0n, USD_DECIMALS, "USDC", { showZero: false })).toBe("-");
  });

  it("should display balance of stable token correctly", () =>
    // prettier-ignore
    {
    expect(formatBalanceAmount(ONE_USD, USD_DECIMALS, undefined, { isStable: true })).toBe("1.00");
    expect(formatBalanceAmount(ONE_USD / 10n, USD_DECIMALS, undefined, { isStable: true })).toBe("0.10");
    expect(formatBalanceAmount(ONE_USD / 100n, USD_DECIMALS, undefined, { isStable: true })).toBe("0.010");
    expect(formatBalanceAmount(ONE_USD / 1_000n, USD_DECIMALS, undefined, { isStable: true })).toBe("0.0010");
    expect(formatBalanceAmount(ONE_USD / 10_000n, USD_DECIMALS, undefined, { isStable: true })).toBe("0.00010");
    expect(formatBalanceAmount(ONE_USD / 100_000n, USD_DECIMALS, undefined, { isStable: true })).toBe("0.000010");
    expect(formatBalanceAmount(ONE_USD / 1_000_000n, USD_DECIMALS, undefined, { isStable: true })).toBe("0.0000010");
    expect(formatBalanceAmount(ONE_USD / 10_000_000n, USD_DECIMALS, undefined, { isStable: true })).toBe("0.00000010");
    expect(formatBalanceAmount(ONE_USD / 100_000_000n, USD_DECIMALS, undefined, { isStable: true })).toBe("0.000000010");
    expect(formatBalanceAmount(ONE_USD / 1_000_000_000n, USD_DECIMALS, undefined, { isStable: true })).toBe("1.00e-9");
    expect(formatBalanceAmount(0n, USD_DECIMALS, undefined, { isStable: true, showZero: true })).toBe("0.00");
    expect(formatBalanceAmount(ONE_USD, USD_DECIMALS, undefined, { isStable: true, signed: true })).toBe("+1.00");
    expect(formatBalanceAmount(-ONE_USD, USD_DECIMALS, undefined, { isStable: true, signed: true })).toBe("-1.00");
    expect(formatBalanceAmount(0n, USD_DECIMALS, undefined, { isStable: true, showZero: false })).toBe("-");
  });
});

describe("formatFactor", () => {
  it("should format factor", () => {
    expect(formatFactor(0n)).toBe("0");
    expect(formatFactor(1n)).toBe("0.000000000000000000000000000001");
    expect(formatFactor(1000n)).toBe("0.000000000000000000000000001");
    expect(formatFactor(1000000n)).toBe("0.000000000000000000000001");
    expect(formatFactor(1000000000n)).toBe("0.000000000000000000001");
    expect(formatFactor(1000000000000n)).toBe("0.000000000000000001");
    expect(formatFactor(1000000000000000n)).toBe("0.000000000000001");
    expect(formatFactor(1000000000000000000n)).toBe("0.000000000001");
    expect(formatFactor(1000000000000000000000n)).toBe("0.000000001");
    expect(formatFactor(1000000000000000000000000n)).toBe("0.000001");
    expect(formatFactor(1000000000000000000000000000n)).toBe("0.001");
    expect(formatFactor(1000000000000000000000000000000n)).toBe("1");
  });
});

describe("formatPercentage", () => {
  it("should format a basic percentage", () => {
    expect(formatPercentage(100n, { displayDecimals: 4 })).toBe("1.0000%");
    expect(formatPercentage(2500n)).toBe("25.00%");
    expect(formatPercentage(123456n)).toBe("1234.56%");
  });

  it("should handle undefined input with fallbackToZero", () => {
    expect(formatPercentage(undefined, { fallbackToZero: true })).toBe("0.00%");
  });

  it("should display signed percentage", () => {
    expect(formatPercentage(100n, { signed: true })).toBe("+\u200a1.00%");
    expect(formatPercentage(-100n, { signed: true })).toBe("-\u200a1.00%");
  });

  it("should format with different displayDecimals", () => {
    expect(formatPercentage(100n, { displayDecimals: 2 })).toBe("1.00%");
    expect(formatPercentage(123456n, { displayDecimals: 1 })).toBe("1234.6%");
  });

  it("should handle basis points (bps) formatting", () => {
    expect(
      formatPercentage(toBigNumberWithDecimals("1", PERCENT_PRECISION_DECIMALS), { bps: false, displayDecimals: 4 })
    ).toBe("1.0000%");
    expect(
      formatPercentage(toBigNumberWithDecimals("0.999", PERCENT_PRECISION_DECIMALS), { bps: false, displayDecimals: 5 })
    ).toBe("0.99900%");
  });
});

describe("formatTokenAmount", () => {
  const TOKEN_DECIMALS = 18;
  const ONE_TOKEN = expandDecimals(1, TOKEN_DECIMALS);
  const NBSP = "\u00a0";

  it("should return undefined for undefined amount without fallbackToZero", () => {
    expect(formatTokenAmount(undefined, TOKEN_DECIMALS)).toBeUndefined();
    expect(formatTokenAmount(undefined, TOKEN_DECIMALS, "ETH")).toBeUndefined();
  });

  it("should return zero with fallbackToZero", () => {
    expect(formatTokenAmount(undefined, TOKEN_DECIMALS, undefined, { fallbackToZero: true })).toBe("0.0000");
    expect(formatTokenAmount(undefined, TOKEN_DECIMALS, "ETH", { fallbackToZero: true })).toBe(`0.0000${NBSP}ETH`);
  });

  it("should format token amount with symbol", () => {
    expect(formatTokenAmount(ONE_TOKEN, TOKEN_DECIMALS, "ETH")).toBe(`1.0000${NBSP}ETH`);
    expect(formatTokenAmount(ONE_TOKEN * 100n, TOKEN_DECIMALS, "ETH")).toBe(`100.000${NBSP}ETH`);
  });

  it("should format token amount without symbol", () => {
    expect(formatTokenAmount(ONE_TOKEN, TOKEN_DECIMALS)).toBe("1.0000");
    expect(formatTokenAmount(ONE_TOKEN * 1000n, TOKEN_DECIMALS)).toBe("1000.00");
  });

  it("should adjust decimals based on amount magnitude (non-stable)", () =>
    // prettier-ignore
    {
    expect(formatTokenAmount(ONE_TOKEN * 1000n, TOKEN_DECIMALS)).toBe("1000.00");
    expect(formatTokenAmount(ONE_TOKEN * 100n, TOKEN_DECIMALS)).toBe("100.000");
    expect(formatTokenAmount(ONE_TOKEN * 10n, TOKEN_DECIMALS)).toBe("10.0000");
    expect(formatTokenAmount(ONE_TOKEN, TOKEN_DECIMALS)).toBe("1.0000");
    expect(formatTokenAmount(ONE_TOKEN / 10n, TOKEN_DECIMALS)).toBe("0.10000");
    expect(formatTokenAmount(ONE_TOKEN / 100n, TOKEN_DECIMALS)).toBe("0.010000");
    expect(formatTokenAmount(ONE_TOKEN / 1000n, TOKEN_DECIMALS)).toBe("0.0010000");
    expect(formatTokenAmount(ONE_TOKEN / 10000n, TOKEN_DECIMALS)).toBe("0.0001000");
  });

  it("should adjust decimals based on amount magnitude (stable)", () =>
    // prettier-ignore
    {
    expect(formatTokenAmount(ONE_TOKEN * 1000n, TOKEN_DECIMALS, undefined, { isStable: true })).toBe("1000.00");
    expect(formatTokenAmount(ONE_TOKEN * 100n, TOKEN_DECIMALS, undefined, { isStable: true })).toBe("100.00");
    expect(formatTokenAmount(ONE_TOKEN * 10n, TOKEN_DECIMALS, undefined, { isStable: true })).toBe("10.00");
    expect(formatTokenAmount(ONE_TOKEN, TOKEN_DECIMALS, undefined, { isStable: true })).toBe("1.00");
    expect(formatTokenAmount(ONE_TOKEN / 10n, TOKEN_DECIMALS, undefined, { isStable: true })).toBe("0.10");
    expect(formatTokenAmount(ONE_TOKEN / 100n, TOKEN_DECIMALS, undefined, { isStable: true })).toBe("0.010");
    expect(formatTokenAmount(ONE_TOKEN / 1000n, TOKEN_DECIMALS, undefined, { isStable: true })).toBe("0.0010");
    expect(formatTokenAmount(ONE_TOKEN / 10000n, TOKEN_DECIMALS, undefined, { isStable: true })).toBe("0.00010");
  });

  it("should respect explicit displayDecimals override", () => {
    expect(formatTokenAmount(ONE_TOKEN, TOKEN_DECIMALS, undefined, { displayDecimals: 2 })).toBe("1.00");
    expect(formatTokenAmount(ONE_TOKEN, TOKEN_DECIMALS, undefined, { displayDecimals: 6 })).toBe("1.000000");
    expect(formatTokenAmount(ONE_TOKEN / 10n, TOKEN_DECIMALS, undefined, { displayDecimals: 2 })).toBe("0.10");
  });

  it("should format with commas when useCommas is true", () => {
    expect(formatTokenAmount(ONE_TOKEN * 1000000n, TOKEN_DECIMALS, undefined, { useCommas: true })).toBe(
      "1,000,000.00"
    );
    expect(formatTokenAmount(ONE_TOKEN * 123456n, TOKEN_DECIMALS, "ETH", { useCommas: true })).toBe(
      `123,456.00${NBSP}ETH`
    );
  });

  it("should show all significant digits with showAllSignificant", () => {
    const preciseAmount = ONE_TOKEN + ONE_TOKEN / 123456789n;
    expect(formatTokenAmount(preciseAmount, TOKEN_DECIMALS, undefined, { showAllSignificant: true })).not.toContain(
      "..."
    );
  });

  it("should display plus sign for positive values with displayPlus", () => {
    expect(formatTokenAmount(ONE_TOKEN, TOKEN_DECIMALS, undefined, { displayPlus: true })).toBe("+1.0000");
    expect(formatTokenAmount(-ONE_TOKEN, TOKEN_DECIMALS, undefined, { displayPlus: true })).toBe("-1.0000");
  });

  it("should handle negative amounts", () => {
    expect(formatTokenAmount(-ONE_TOKEN, TOKEN_DECIMALS)).toBe("-1.0000");
    expect(formatTokenAmount(-ONE_TOKEN * 100n, TOKEN_DECIMALS, "ETH")).toBe(`-100.000${NBSP}ETH`);
  });

  it("should handle zero amount", () => {
    expect(formatTokenAmount(0n, TOKEN_DECIMALS)).toBe("0.00");
    expect(formatTokenAmount(0n, TOKEN_DECIMALS, "ETH")).toBe(`0.00${NBSP}ETH`);
    expect(formatTokenAmount(0n, TOKEN_DECIMALS, undefined, { isStable: true })).toBe("0.00");
  });

  it("should handle maxThreshold", () => {
    const result = formatTokenAmount(ONE_TOKEN * 10000000000n, TOKEN_DECIMALS, undefined, {
      maxThreshold: "1000000000",
    });
    expect(result).toContain(">");
  });

  it("should handle minThreshold", () => {
    const result = formatTokenAmount(ONE_TOKEN / 1000000000n, TOKEN_DECIMALS, undefined, {
      minThreshold: "0.00000001",
    });
    expect(result).toContain("<");
  });
});
