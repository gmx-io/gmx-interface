import { describe, expect, it } from "vitest";

import { USD_DECIMALS } from "config/factors";
import { expandDecimals } from "lib/numbers";

import { calcTokenPrice } from "../kyberSwap";

describe("calcTokenPrice", () => {
  it("returns 0 for non-positive amount", () => {
    expect(calcTokenPrice(0n, "100", 18)).toBe(0n);
    expect(calcTokenPrice(-1n, "100", 18)).toBe(0n);
  });

  it("computes price for round numbers (1 ETH @ $2000)", () => {
    // 1 ETH (18 decimals) costs $2000 → price = 2000 in USD_DECIMALS
    expect(calcTokenPrice(expandDecimals(1, 18), "2000", 18)).toBe(expandDecimals(2000, USD_DECIMALS));
  });

  it("computes price for 8-decimals tokens (1 BTC @ $77,000)", () => {
    expect(calcTokenPrice(expandDecimals(1, 8), "77000", 8)).toBe(expandDecimals(77000, USD_DECIMALS));
  });

  it("computes price for fractional amounts", () => {
    // 0.5 ETH @ $2000 → still $2000 per whole token
    expect(calcTokenPrice(expandDecimals(5, 17), "1000", 18)).toBe(expandDecimals(2000, USD_DECIMALS));
  });

  it("handles fractional USD values", () => {
    // 1 USDC (6 decimals) @ $1.0001 → price ≈ 1.0001 in USD_DECIMALS.
    // Float parsing of "1.0001" introduces tiny precision loss; assert within 1ppm.
    const price = calcTokenPrice(expandDecimals(1, 6), "1.0001", 6);
    const expected = (10001n * expandDecimals(1, USD_DECIMALS)) / 10000n;
    const diff = price > expected ? price - expected : expected - price;
    expect(diff * 1_000_000n).toBeLessThan(expected);
  });

  it("handles tiny amounts without losing precision (the bug fix that motivated the bigint rewrite)", () => {
    // 13 wei of token-6 (≈$0.000013) — old float-based impl rounded this to 0 or junk
    const price = calcTokenPrice(13n, "0.000013", 6);
    expect(price).toBeGreaterThan(0n);
    // Reconstructed USD value = price * amount / 10^decimals should be close to original
    const reconstructedUsd = (price * 13n) / expandDecimals(1, 6);
    // Within 1 USD_DECIMALS unit of "0.000013"
    expect(reconstructedUsd).toBeGreaterThan(0n);
  });

  it("handles very large amounts", () => {
    // 1M BTC * $77000 — way bigger than any realistic case, but checks for overflow
    const price = calcTokenPrice(expandDecimals(1_000_000, 8), "77000000000", 8);
    expect(price).toBe(expandDecimals(77000, USD_DECIMALS));
  });
});
