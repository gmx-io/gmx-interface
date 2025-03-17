import { describe, expect, it } from "vitest";

import { USD_DECIMALS } from "config/factors";

import { formatAmount } from "./formatting";
import { toBigNumberWithDecimals, roundBigNumberWithDecimals, PRECISION_DECIMALS } from ".";

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

describe("roundBigNumberWithDecimals", () => {
  it("should round small numbers correctly", () => {
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("0.0000001", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 0,
      })
    ).toBe(0n);
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("0.5", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 0,
      })
    ).toBe(toBigNumberWithDecimals("1", PRECISION_DECIMALS));
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("0.499", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 0,
      })
    ).toBe(0n);
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("1", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 1,
      })
    ).toBe(toBigNumberWithDecimals("1", PRECISION_DECIMALS));
  });

  it("should round numbers at specific decimal places", () => {
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("1.49", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 1,
      })
    ).toBe(toBigNumberWithDecimals("1.5", PRECISION_DECIMALS));
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("1.44", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 1,
      })
    ).toBe(toBigNumberWithDecimals("1.4", PRECISION_DECIMALS));
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("1.499", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 2,
      })
    ).toBe(toBigNumberWithDecimals("1.50", PRECISION_DECIMALS));
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("1.495", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 2,
      })
    ).toBe(toBigNumberWithDecimals("1.50", PRECISION_DECIMALS));
  });

  it("should round large numbers correctly", () => {
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("499.999999", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 5,
      })
    ).toBe(toBigNumberWithDecimals("500.00000", PRECISION_DECIMALS));
  });

  it("should handle complex rounding cases", () => {
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("0.0000000000000000000000000001", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 25,
      })
    ).toBe(0n);
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("0.4999999999999999999999999999", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 25,
      })
    ).toBe(toBigNumberWithDecimals("0.5", PRECISION_DECIMALS));
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("123.456789", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 4,
      })
    ).toBe(toBigNumberWithDecimals("123.4568", PRECISION_DECIMALS));
  });

  it("should round numbers with different token decimals correctly", () => {
    const differentTokenDecimals = [18, 5, 1, 22];
    for (const tokenDecimals of differentTokenDecimals) {
      expect(
        roundBigNumberWithDecimals(toBigNumberWithDecimals("123.456789", tokenDecimals), {
          tokenDecimals,
          displayDecimals: 4,
        })
      ).toBe(toBigNumberWithDecimals("123.4568", tokenDecimals));
    }
  });

  it("should handle edge cases", () => {
    expect(roundBigNumberWithDecimals(0n, { tokenDecimals: PRECISION_DECIMALS, displayDecimals: 10 })).toBe(0n);
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("-1.5", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 0,
      })
    ).toBe(toBigNumberWithDecimals("-2", PRECISION_DECIMALS));
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("-1.4", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 0,
      })
    ).toBe(toBigNumberWithDecimals("-1", PRECISION_DECIMALS));
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("0.0000001", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 5,
      })
    ).toBe(0n);
  });
});
