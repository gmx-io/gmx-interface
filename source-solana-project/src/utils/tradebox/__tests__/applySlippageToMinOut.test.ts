import { BN } from '@coral-xyz/anchor';

// Mock the constants
jest.mock('@/config/constants', () => ({
  ONE_BPS: new BN(1), // 1 BPS = 0.01%
  ONE_USD: new BN(10000), // Scale factor for price calculations
}));

import { applySlippageToMinOut } from '../applySlippageToMinOut';

describe('applySlippageToMinOut', () => {
  it('should correctly apply 1% slippage to output amount', () => {
    const allowedSlippage = 100; // 1% = 100 bps
    const minOutputAmount = new BN(10000000); // 1 unit with 7 decimals

    const result = applySlippageToMinOut(allowedSlippage, minOutputAmount);

    // Expected: 10000000 * 0.99 = 9900000
    expect(result.toString()).toBe('9900000');
  });

  it('should correctly apply 0.5% slippage to output amount', () => {
    const allowedSlippage = 50; // 0.5% = 50 bps
    const minOutputAmount = new BN(20000000); // 2 units with 7 decimals

    const result = applySlippageToMinOut(allowedSlippage, minOutputAmount);

    // Expected: 20000000 * 0.995 = 19900000
    expect(result.toString()).toBe('19900000');
  });

  it('should handle zero slippage', () => {
    const allowedSlippage = 0;
    const minOutputAmount = new BN(10000000);

    const result = applySlippageToMinOut(allowedSlippage, minOutputAmount);

    // Expected: No change to amount
    expect(result.toString()).toBe('10000000');
  });

  it('should handle large numbers correctly', () => {
    const allowedSlippage = 30; // 0.3%
    const minOutputAmount = new BN('10000000000000'); // 1 million units with 7 decimals

    const result = applySlippageToMinOut(allowedSlippage, minOutputAmount);

    // Expected: 10000000000000 * 0.997 = 9970000000000
    expect(result.toString()).toBe('9970000000000');
  });
});
