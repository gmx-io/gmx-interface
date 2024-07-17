import { formatUsdPrice } from "./utils";

const ONE_USD = 1000000000000000000000000000000n;

describe("formatUsdPrice", () => {
  it("should return nothing if undefined or negative", () => {
    expect(formatUsdPrice(undefined)).toBe(undefined);
    expect(formatUsdPrice(-1n)).toBe(undefined);
  });

  it("should respect displayDecimals formatted price", () => {
    expect(
      formatUsdPrice(ONE_USD, {
        displayDecimals: 0,
      })
    ).toBe("$1");
    expect(
      formatUsdPrice(ONE_USD, {
        displayDecimals: 2,
      })
    ).toBe("$1.00");
    expect(
      formatUsdPrice(ONE_USD, {
        displayDecimals: 4,
      })
    ).toBe("$1.0000");
  });

  it("should calculate correct decimals if displayDecimals not passed", () => {
    expect(formatUsdPrice(ONE_USD)).toBe("$1.0000");
    expect(formatUsdPrice(ONE_USD * 10000n)).toBe("$10,000.00");
    expect(formatUsdPrice(ONE_USD * 1000n)).toBe("$1,000.000");
    expect(formatUsdPrice(ONE_USD * 100n)).toBe("$100.000");
    expect(formatUsdPrice(ONE_USD * 10n)).toBe("$10.0000");
    expect(formatUsdPrice(ONE_USD / 10n)).toBe("$0.100000");
    expect(formatUsdPrice(ONE_USD / 1000n)).toBe("< $0.0100000");
  });
});
