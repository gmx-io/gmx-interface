import {
  PRECISION,
  BN_ZERO,
  BN_ONE,
  BN_NEGATIVE_ONE,
  expandDecimals,
  basisPointsToFloat,
  getBasisPoints,
  roundUpMagnitudeDivision,
  applyFactor,
} from "./numbers";
import { BASIS_POINTS_DIVISOR_BIGINT } from "configs/factors";

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

    it.only("rounds up if remainder != 0 and shouldRoundUp=true", () => {
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
});
