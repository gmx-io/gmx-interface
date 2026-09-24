import { BN } from '@coral-xyz/anchor';

// Mock the constants
jest.mock('@/config/constants', () => ({
  ONE_BPS: new BN(1), // 1 BPS = 0.01%
  ONE_USD: new BN(10000), // Scale factor for price calculations
}));

import { applySlippageToPrice } from '../applySlippageToPrice';

describe('applySlippageToPrice', () => {
  const basePrice = new BN(50000000); // $5.0000000
  const slippage = 100; // 1% = 100 bps

  describe('Long positions', () => {
    const isLong = true;

    it('should increase price when increasing long position', () => {
      const isIncrease = true;
      const result = applySlippageToPrice(
        slippage,
        basePrice,
        isIncrease,
        isLong
      );
      // Expected: 5.0000000 * 1.01 = 5.0500000
      expect(result.toString()).toBe('50500000');
    });

    it('should decrease price when decreasing long position', () => {
      const isIncrease = false;
      const result = applySlippageToPrice(
        slippage,
        basePrice,
        isIncrease,
        isLong
      );
      // Expected: 5.0000000 * 0.99 = 4.9500000
      expect(result.toString()).toBe('49500000');
    });
  });

  describe('Short positions', () => {
    const isLong = false;

    it('should decrease price when increasing short position', () => {
      const isIncrease = true;
      const result = applySlippageToPrice(
        slippage,
        basePrice,
        isIncrease,
        isLong
      );
      // Expected: 5.0000000 * 0.99 = 4.9500000
      expect(result.toString()).toBe('49500000');
    });

    it('should increase price when decreasing short position', () => {
      const isIncrease = false;
      const result = applySlippageToPrice(
        slippage,
        basePrice,
        isIncrease,
        isLong
      );
      // Expected: 5.0000000 * 1.01 = 5.0500000
      expect(result.toString()).toBe('50500000');
    });
  });

  describe('Edge cases', () => {
    it('should handle zero slippage', () => {
      const result = applySlippageToPrice(0, basePrice, true, true);
      // Expected: No change to price
      expect(result.toString()).toBe(basePrice.toString());
    });

    it('should handle small slippage (0.1%)', () => {
      const smallSlippage = 10; // 0.1%
      const result = applySlippageToPrice(smallSlippage, basePrice, true, true);
      // Expected: 5.0000000 * 1.001 = 5.0050000
      expect(result.toString()).toBe('50050000');
    });

    it('should handle large numbers', () => {
      const largePrice = new BN('1000000000000'); // 100,000.0000000
      const result = applySlippageToPrice(slippage, largePrice, true, true);
      // Expected: 100000.0000000 * 1.01 = 101000.0000000
      expect(result.toString()).toBe('1010000000000');
    });
  });
});
