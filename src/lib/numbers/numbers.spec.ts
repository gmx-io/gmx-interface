import { describe, expect, it } from "vitest";

import { USD_DECIMALS } from "config/factors";

import { formatAmount } from "./formatting";
import { toBigNumberWithDecimals, roundBigNumberWithDecimals } from ".";

describe("toBigNumberWithDecimals", () => {
  it("should convert string to big number with decimals", () => {
    expect(toBigNumberWithDecimals("0")).toBe(0n);
    expect(toBigNumberWithDecimals("1")).toBe(1000000000000000000000000000000n);
    expect(toBigNumberWithDecimals("123.456")).toBe(123456000000000000000000000000000n);
    expect(toBigNumberWithDecimals("123.456789")).toBe(123456789000000000000000000000000n);
    expect(toBigNumberWithDecimals("-1.5")).toBe(-1500000000000000000000000000000n);
    expect(toBigNumberWithDecimals("0.000001")).toBe(1000000000000000000000000n);
  });

  it("should handle strings with more decimals than PRECISION_DECIMALS", () => {
    expect(toBigNumberWithDecimals("0.1234567890123456789012345678901")).toBe(
      toBigNumberWithDecimals("0.123456789012345678901234567890")
    );
  });

  it("should be compatible with formatAmount", () => {
    expect(formatAmount(toBigNumberWithDecimals("123.456"), USD_DECIMALS, 3)).toBe("123.456");
    expect(formatAmount(toBigNumberWithDecimals("0.789"), USD_DECIMALS, 2)).toBe("0.79");
  });
});

describe("roundBigNumberWithDecimals", () => {
  describe("basic rounding tests", () => {
    it("should round small numbers correctly", () => {
      expect(roundBigNumberWithDecimals(toBigNumberWithDecimals("0.0000001"), 0)).toBe(0n);
      expect(roundBigNumberWithDecimals(toBigNumberWithDecimals("0.5"), 0)).toBe(toBigNumberWithDecimals("1"));
      expect(roundBigNumberWithDecimals(toBigNumberWithDecimals("0.499"), 0)).toBe(0n);
      expect(roundBigNumberWithDecimals(toBigNumberWithDecimals("1"), 1)).toBe(toBigNumberWithDecimals("1"));
    });
  });

  describe("rounding at specific decimal places", () => {
    it("should round numbers at specific decimal places", () => {
      expect(roundBigNumberWithDecimals(toBigNumberWithDecimals("1.49"), 1)).toBe(toBigNumberWithDecimals("1.5"));
      expect(roundBigNumberWithDecimals(toBigNumberWithDecimals("1.44"), 1)).toBe(toBigNumberWithDecimals("1.4"));
      expect(roundBigNumberWithDecimals(toBigNumberWithDecimals("1.499"), 2)).toBe(toBigNumberWithDecimals("1.50"));
      expect(roundBigNumberWithDecimals(toBigNumberWithDecimals("1.495"), 2)).toBe(toBigNumberWithDecimals("1.50"));
    });
  });

  describe("large number rounding", () => {
    it("should round large numbers correctly", () => {
      expect(roundBigNumberWithDecimals(toBigNumberWithDecimals("499.999999"), 5)).toBe(
        toBigNumberWithDecimals("500.00000")
      );
    });
  });

  describe("complex cases", () => {
    it("should handle complex rounding cases", () => {
      expect(roundBigNumberWithDecimals(toBigNumberWithDecimals("0.0000000000000000000000000001"), 25)).toBe(0n);
      expect(roundBigNumberWithDecimals(toBigNumberWithDecimals("0.4999999999999999999999999999"), 25)).toBe(
        toBigNumberWithDecimals("0.5000000000000000000000000000")
      );
      expect(roundBigNumberWithDecimals(toBigNumberWithDecimals("123.456789"), 4)).toBe(
        toBigNumberWithDecimals("123.4568")
      );
    });
  });

  describe("edge cases", () => {
    it("should handle edge cases", () => {
      expect(roundBigNumberWithDecimals(0n, 10)).toBe(0n);
      expect(roundBigNumberWithDecimals(toBigNumberWithDecimals("-1.5"), 0)).toBe(toBigNumberWithDecimals("-2"));
      expect(roundBigNumberWithDecimals(toBigNumberWithDecimals("-1.4"), 0)).toBe(toBigNumberWithDecimals("-1"));
      expect(roundBigNumberWithDecimals(toBigNumberWithDecimals("0.0000001"), 5)).toBe(0n);
    });
  });
});
