import { describe, expect, it } from "vitest";

import {
  formatPriceGraphYAxisTick,
  getPriceGraphYAxisDomain,
  getPriceGraphYAxisTickDecimals,
} from "./marketGraphUtils";

describe("getPriceGraphYAxisDomain", () => {
  it("pads the price range without anchoring at zero", () => {
    expect(getPriceGraphYAxisDomain([{ value: 1 }, { value: 1.1 }])).toEqual([0.99, 1.11]);
  });

  it("keeps a positive lower bound when the range is much wider than the minimum", () => {
    expect(getPriceGraphYAxisDomain([{ value: 0.1 }, { value: 10 }])).toEqual([0.0995, 10.99]);
  });

  it("adds padding for flat price series", () => {
    expect(getPriceGraphYAxisDomain([{ value: 1 }, { value: 1 }])).toEqual([0.995, 1.005]);
  });

  it("ignores zero and negative values", () => {
    expect(getPriceGraphYAxisDomain([{ value: 0 }, { value: -1 }, { value: 1 }, { value: 1.1 }])).toEqual([0.99, 1.11]);
  });

  it("ignores non-finite values", () => {
    expect(
      getPriceGraphYAxisDomain([{ value: Number.NaN }, { value: 1 }, { value: Number.POSITIVE_INFINITY }])
    ).toEqual([0.995, 1.005]);
  });

  it("returns undefined when no positive finite values are available", () => {
    expect(getPriceGraphYAxisDomain([{ value: 0 }, { value: -1 }])).toBeUndefined();
  });

  it("returns undefined when no finite values are available", () => {
    expect(getPriceGraphYAxisDomain([{ value: Number.NaN }])).toBeUndefined();
  });
});

describe("getPriceGraphYAxisTickDecimals", () => {
  it("uses two decimals for sub-dollar buckets where cents are enough", () => {
    expect(getPriceGraphYAxisTickDecimals([0.8307, 0.98616])).toBe(2);
  });

  it("uses two decimals for one-dollar buckets where cents are enough", () => {
    expect(getPriceGraphYAxisTickDecimals([1.4883213058441358, 1.8075886097496454])).toBe(2);
  });

  it("uses more decimals for very tight buckets", () => {
    expect(getPriceGraphYAxisTickDecimals([0.998, 1.002])).toBe(3);
  });

  it("uses enough decimals to keep small positive lower bounds from formatting as zero", () => {
    expect(getPriceGraphYAxisTickDecimals([0.0995, 10.99])).toBe(2);
  });

  it("uses no decimals for wide buckets without small lower bounds", () => {
    expect(getPriceGraphYAxisTickDecimals([100, 1000])).toBe(0);
  });
});

describe("formatPriceGraphYAxisTick", () => {
  it("formats price axis ticks without a dollar sign", () => {
    expect(formatPriceGraphYAxisTick(0.98616, [0.8307, 0.98616])).toBe("0.99");
  });

  it("formats tighter buckets with more precision", () => {
    expect(formatPriceGraphYAxisTick(0.9984, [0.998, 1.002])).toBe("0.998");
  });

  it("does not round small positive lower ticks to zero", () => {
    expect(formatPriceGraphYAxisTick(0.0995, [0.0995, 10.99])).toBe("0.10");
  });
});
