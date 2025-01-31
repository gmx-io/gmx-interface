import { applySlippageToMinOut, applySlippageToPrice } from "../trade";

describe("applySlippageToPrice", () => {
  it("applies positive slippage if getShouldUseMaxPrice is true", () => {
    // isIncrease=true and isLong=true => getShouldUseMaxPrice => true
    const allowedSlippage = 100; // 1%
    const price = 1000n;
    const result = applySlippageToPrice(allowedSlippage, price, true, true);
    // expected: price * (10000+100)/10000 = 1000n * 10100n / 10000n = 1010n
    expect(result).toBe(1010n);
  });

  it("applies negative slippage if getShouldUseMaxPrice is false", () => {
    // isIncrease=true or isLong=false => getShouldUseMaxPrice => false
    const allowedSlippage = 100; // 1%
    const price = 1000n;
    const result = applySlippageToPrice(allowedSlippage, price, true, false);
    // expected: price * (10000-100)/10000 = 1000n * 9900n / 10000n = 990n
    expect(result).toBe(990n);
  });
});

describe("applySlippageToMinOut", () => {
  it("reduces minOutputAmount by allowed slippage", () => {
    const allowedSlippage = 100; // 1%
    const minOutputAmount = 10_000n;
    const result = applySlippageToMinOut(allowedSlippage, minOutputAmount);
    // expected: minOut * (10000 - 100) / 10000 = 10_000n * 9900n / 10000n = 9900n
    expect(result).toBe(9900n);
  });

  it("does nothing if slippage is zero", () => {
    const allowedSlippage = 0;
    const minOutputAmount = 10_000n;
    const result = applySlippageToMinOut(allowedSlippage, minOutputAmount);
    // expected: 10_000n * (10000 - 0) / 10000n = 10_000n
    expect(result).toBe(10_000n);
  });
});
