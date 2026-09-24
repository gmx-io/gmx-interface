import { BN } from '@coral-xyz/anchor';
import { substractMaxLeverageSlippage } from '../substractMaxLeverageSlippage';

// Mock the toBN function from gmsol
jest.mock('gmsol', () => ({
  toBN: (n: number) => new BN(n),
}));

describe('substractMaxLeverageSlippage', () => {
  it('should correctly calculate 99% of the input number', () => {
    const input = new BN(100);
    const result = substractMaxLeverageSlippage(input);
    expect(result.toString()).toBe('99');
  });

  it('should handle large numbers', () => {
    const input = new BN(1000000); // 1 million
    const result = substractMaxLeverageSlippage(input);
    expect(result.toString()).toBe('990000');
  });

  it('should handle small numbers with rounding down', () => {
    // For 10, 99% would be 9.9, but it should round down to 9
    const input = new BN(10);
    const result = substractMaxLeverageSlippage(input);
    expect(result.toString()).toBe('9');
  });

  it('should handle zero', () => {
    const input = new BN(0);
    const result = substractMaxLeverageSlippage(input);
    expect(result.toString()).toBe('0');
  });

  it('should handle numbers that are not perfectly divisible', () => {
    // For 1000, 99% would be 990
    // For 999, 99% would be 989.01, should round down to 989
    const input1 = new BN(1000);
    const input2 = new BN(999);

    expect(substractMaxLeverageSlippage(input1).toString()).toBe('990');
    expect(substractMaxLeverageSlippage(input2).toString()).toBe('989');
  });

  it('should handle max safe BN values', () => {
    // Using a large but safe number
    const input = new BN(2).pow(new BN(64)).sub(new BN(1)); // 2^64 - 1
    const result = substractMaxLeverageSlippage(input);

    // Result should be input * 99 / 100
    const expected = input.mul(new BN(99)).div(new BN(100));
    expect(result.toString()).toBe(expected.toString());
  });
});
