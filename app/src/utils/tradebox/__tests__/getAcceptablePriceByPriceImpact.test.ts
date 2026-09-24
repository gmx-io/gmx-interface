import { BN } from '@coral-xyz/anchor';

// Create actual BN instances for mocking
const mockBnZero = new BN(0);
const mockBnOne = new BN(1);
const mockBnNegOne = new BN(-1);

// Mock modules before imports
jest.mock('@/config/constants', () => ({
  get BN_ZERO() {
    return mockBnZero;
  },
  get BN_ONE() {
    return mockBnOne;
  },
  get BN_NEG_ONE() {
    return mockBnNegOne;
  },
}));

jest.mock('@/utils/legacy/common', () => ({
  getBasisPoints: (value: BN, total: BN) => {
    // Convert BN to numbers for calculation
    const valueNum = value.toNumber();
    const totalNum = total.toNumber();
    // Calculate basis points: (value / total) * 10000
    return Math.round((valueNum / totalNum) * 10000);
  },
}));

import { getAcceptablePriceByPriceImpact } from '../getAcceptablePriceByPriceImpact';

describe('getAcceptablePriceByPriceImpact', () => {
  describe('Edge cases', () => {
    it('should return index price when size delta is zero', () => {
      const indexPrice = new BN(1000);
      const result = getAcceptablePriceByPriceImpact({
        isIncrease: true,
        isLong: true,
        indexPrice,
        sizeDeltaUsd: mockBnZero,
        priceImpactDeltaUsd: new BN(100),
      });

      expect(result.acceptablePrice.eq(indexPrice)).toBe(true);
      expect(result.acceptablePriceDeltaBps).toBe(0);
      expect(result.priceDelta.eq(mockBnZero)).toBe(true);
    });

    it('should return index price when index price is zero', () => {
      const result = getAcceptablePriceByPriceImpact({
        isIncrease: true,
        isLong: true,
        indexPrice: mockBnZero,
        sizeDeltaUsd: new BN(1000),
        priceImpactDeltaUsd: new BN(100),
      });

      expect(result.acceptablePrice.eq(mockBnZero)).toBe(true);
      expect(result.acceptablePriceDeltaBps).toBe(0);
      expect(result.priceDelta.eq(mockBnZero)).toBe(true);
    });
  });

  describe('Long positions', () => {
    it('should calculate acceptable price for long increase', () => {
      const indexPrice = new BN(1000);
      const sizeDeltaUsd = new BN(10000);
      const priceImpactDeltaUsd = new BN(100);

      const result = getAcceptablePriceByPriceImpact({
        isIncrease: true,
        isLong: true,
        indexPrice,
        sizeDeltaUsd,
        priceImpactDeltaUsd,
      });

      // For long increase, price impact should be subtracted
      // acceptablePrice = indexPrice * (sizeDelta - priceImpact) / sizeDelta
      // 1000 * (10000 - 100) / 10000 = 990
      expect(result.acceptablePrice.eq(new BN(990))).toBe(true);
      expect(result.acceptablePriceDeltaBps).toBe(100); // (1000 - 990) / 990 * 10000
    });

    it('should calculate acceptable price for long decrease', () => {
      const indexPrice = new BN(1000);
      const sizeDeltaUsd = new BN(10000);
      const priceImpactDeltaUsd = new BN(100);

      const result = getAcceptablePriceByPriceImpact({
        isIncrease: false,
        isLong: true,
        indexPrice,
        sizeDeltaUsd,
        priceImpactDeltaUsd,
      });

      // For long decrease, price impact should be added
      // acceptablePrice = indexPrice * (sizeDelta + priceImpact) / sizeDelta
      // 1000 * (10000 + 100) / 10000 = 1010
      expect(result.acceptablePrice.eq(new BN(1010))).toBe(true);
      expect(result.acceptablePriceDeltaBps).toBe(100); // (1000 - 1010) / 1010 * 10000
    });
  });

  describe('Short positions', () => {
    it('should calculate acceptable price for short increase', () => {
      const indexPrice = new BN(1000);
      const sizeDeltaUsd = new BN(10000);
      const priceImpactDeltaUsd = new BN(100);

      const result = getAcceptablePriceByPriceImpact({
        isIncrease: true,
        isLong: false,
        indexPrice,
        sizeDeltaUsd,
        priceImpactDeltaUsd,
      });

      // For short increase, price impact should be added
      // acceptablePrice = indexPrice * (sizeDelta + priceImpact) / sizeDelta
      // 1000 * (10000 + 100) / 10000 = 1010
      expect(result.acceptablePrice.eq(new BN(1010))).toBe(true);
      expect(result.acceptablePriceDeltaBps).toBe(100); // (1000 - 1010) / 1010 * 10000
    });

    it('should calculate acceptable price for short decrease', () => {
      const indexPrice = new BN(1000);
      const sizeDeltaUsd = new BN(10000);
      const priceImpactDeltaUsd = new BN(100);

      const result = getAcceptablePriceByPriceImpact({
        isIncrease: false,
        isLong: false,
        indexPrice,
        sizeDeltaUsd,
        priceImpactDeltaUsd,
      });

      // For short decrease, price impact should be subtracted
      // acceptablePrice = indexPrice * (sizeDelta - priceImpact) / sizeDelta
      // 1000 * (10000 - 100) / 10000 = 990
      expect(result.acceptablePrice.eq(new BN(990))).toBe(true);
      expect(result.acceptablePriceDeltaBps).toBe(100); // (1000 - 990) / 990 * 10000
    });
  });

  describe('Price impact scenarios', () => {
    it('should handle negative price impact', () => {
      const indexPrice = new BN(1000);
      const sizeDeltaUsd = new BN(10000);
      const priceImpactDeltaUsd = new BN(-100);

      const result = getAcceptablePriceByPriceImpact({
        isIncrease: true,
        isLong: true,
        indexPrice,
        sizeDeltaUsd,
        priceImpactDeltaUsd,
      });

      // For long increase with negative price impact
      // acceptablePrice = indexPrice * (sizeDelta - (-priceImpact)) / sizeDelta
      // 1000 * (10000 - (-100)) / 10000 = 1010
      expect(result.acceptablePrice.eq(new BN(1010))).toBe(true);
      expect(result.acceptablePriceDeltaBps).toBe(-100);
    });

    it('should handle large price impacts', () => {
      const indexPrice = new BN(1000);
      const sizeDeltaUsd = new BN(10000);
      const priceImpactDeltaUsd = new BN(5000); // 50% impact

      const result = getAcceptablePriceByPriceImpact({
        isIncrease: true,
        isLong: true,
        indexPrice,
        sizeDeltaUsd,
        priceImpactDeltaUsd,
      });

      // For long increase with 50% price impact
      // acceptablePrice = indexPrice * (sizeDelta - priceImpact) / sizeDelta
      // 1000 * (10000 - 5000) / 10000 = 500
      expect(result.acceptablePrice.eq(new BN(500))).toBe(true);
      expect(result.acceptablePriceDeltaBps).toBe(5000); // (1000 - 500) / 500 * 10000
    });
  });
});
