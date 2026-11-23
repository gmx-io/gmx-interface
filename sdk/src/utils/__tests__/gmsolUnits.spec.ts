import { describe, expect, it } from "vitest";

import {
  APP_TO_GMSOL_USD_DIVISOR,
  appContractPriceToGmsolUnitPrice,
  appTokenPriceToGmsolUnitPrice,
  appUsdToGmsolUsd,
  gmsolUnitPriceToAppTokenPrice,
  gmsolUsdToAppUsd,
  toGmsolTokenAmount,
  U128_MAX,
  U64_MAX,
} from "utils/gmsol";
import { convertToContractPrice } from "utils/tokens";

const D = APP_TO_GMSOL_USD_DIVISOR; // 10^10

describe("gmsol units", () => {
  // Whole-token price (USD × 10^30) / 10^(decimals + 10) = unit price (USD × 10^20 per smallest unit).
  it.each([
    // USDC $1.0001: 10001·10^26 / 10^16 = 10001·10^10
    { decimals: 6, price: 10001n * 10n ** 26n, unitPrice: 100_010_000_000_000n },
    // BTC $97,123.45: 9712345·10^28 / 10^18 = 9712345·10^10
    { decimals: 8, price: 9712345n * 10n ** 28n, unitPrice: 97_123_450_000_000_000n },
    // SOL $150.25: 15025·10^28 / 10^19 = 15025·10^9
    { decimals: 9, price: 15025n * 10n ** 28n, unitPrice: 15_025_000_000_000n },
    // ETH $3,456.78: 345678·10^28 / 10^28 = 345678
    { decimals: 18, price: 345678n * 10n ** 28n, unitPrice: 345_678n },
    // $10^9 at 24 decimals: 10^39 / 10^34 = 10^5
    { decimals: 24, price: 10n ** 39n, unitPrice: 100_000n },
    { decimals: 9, price: 0n, unitPrice: 0n },
  ])("converts a whole-token price at $decimals decimals", ({ decimals, price, unitPrice }) => {
    expect(appTokenPriceToGmsolUnitPrice({ price, decimals, rounding: "floor" })).toBe(unitPrice);
    expect(appTokenPriceToGmsolUnitPrice({ price, decimals, rounding: "ceil" })).toBe(unitPrice);
    expect(gmsolUnitPriceToAppTokenPrice({ unitPrice, decimals })).toBe(price);
    // Same result through the app contract price (USD × 10^30 per smallest unit).
    expect(appContractPriceToGmsolUnitPrice(convertToContractPrice(price, decimals), "floor")).toBe(unitPrice);
  });

  // Around a multiple k·divisor: floor gives k-1, k, k; ceil gives k, k, k+1.
  it.each([
    { name: "usd", divisor: D, convert: (v: bigint, r: "floor" | "ceil") => appUsdToGmsolUsd(v, r) },
    {
      name: "contract price",
      divisor: D,
      convert: (v: bigint, r: "floor" | "ceil") => appContractPriceToGmsolUnitPrice(v, r),
    },
    ...[6, 8, 9, 18, 24].map((decimals) => ({
      name: `token price, ${decimals} decimals`,
      divisor: 10n ** BigInt(decimals) * D,
      convert: (v: bigint, r: "floor" | "ceil") => appTokenPriceToGmsolUnitPrice({ price: v, decimals, rounding: r }),
    })),
  ])("rounds at the boundary: $name", ({ divisor, convert }) => {
    const k = 7n;

    expect(convert(k * divisor - 1n, "floor")).toBe(k - 1n);
    expect(convert(k * divisor - 1n, "ceil")).toBe(k);
    expect(convert(k * divisor, "floor")).toBe(k);
    expect(convert(k * divisor, "ceil")).toBe(k);
    expect(convert(k * divisor + 1n, "floor")).toBe(k);
    expect(convert(k * divisor + 1n, "ceil")).toBe(k + 1n);
    // Smallest representable input.
    expect(convert(divisor, "floor")).toBe(1n);
  });

  it("rounds a ceil price once, unlike the flooring contract price", () => {
    // 7 unit prices plus 1 at 9 decimals: the contract price floors away the extra 1 before the ceil.
    const decimals = 9;
    const price = 7n * 10n ** BigInt(decimals) * D + 1n;

    expect(appTokenPriceToGmsolUnitPrice({ price, decimals, rounding: "ceil" })).toBe(8n);
    expect(appContractPriceToGmsolUnitPrice(convertToContractPrice(price, decimals), "ceil")).toBe(7n);
  });

  it("converts USD values exactly and at the u128 limit", () => {
    // $1,000,000 size: 10^36 / 10^10 = 10^26
    expect(appUsdToGmsolUsd(10n ** 36n, "floor")).toBe(10n ** 26n);
    expect(gmsolUsdToAppUsd(10n ** 26n)).toBe(10n ** 36n);
    expect(appUsdToGmsolUsd(0n, "ceil")).toBe(0n);

    expect(appUsdToGmsolUsd(U128_MAX * D, "floor")).toBe(U128_MAX);
    expect(appUsdToGmsolUsd(U128_MAX * D + D - 1n, "floor")).toBe(U128_MAX);
    expect(() => appUsdToGmsolUsd(U128_MAX * D + 1n, "ceil")).toThrow(RangeError);
    expect(() => appUsdToGmsolUsd((U128_MAX + 1n) * D, "floor")).toThrow(RangeError);
    expect(gmsolUsdToAppUsd(U128_MAX)).toBe(U128_MAX * D);
    expect(() => gmsolUsdToAppUsd(U128_MAX + 1n)).toThrow(RangeError);
    expect(() => gmsolUnitPriceToAppTokenPrice({ unitPrice: U128_MAX + 1n, decimals: 9 })).toThrow(RangeError);
  });

  it("checks token amounts against u64", () => {
    expect(toGmsolTokenAmount(0n)).toBe(0n);
    expect(toGmsolTokenAmount(1_500_000_000n)).toBe(1_500_000_000n); // 1.5 SOL in lamports
    expect(toGmsolTokenAmount(U64_MAX)).toBe(U64_MAX);
    expect(() => toGmsolTokenAmount(U64_MAX + 1n)).toThrow(RangeError);
  });

  it.each([
    ["negative usd", () => appUsdToGmsolUsd(-1n, "floor")],
    ["negative gmsol usd", () => gmsolUsdToAppUsd(-1n)],
    ["negative amount", () => toGmsolTokenAmount(-1n)],
    ["negative price", () => appTokenPriceToGmsolUnitPrice({ price: -1n, decimals: 9, rounding: "floor" })],
    ["number input", () => appUsdToGmsolUsd(1e30 as unknown as bigint, "floor")],
    ["number amount", () => toGmsolTokenAmount(1 as unknown as bigint)],
    ["unknown rounding", () => appUsdToGmsolUsd(D, "round" as "floor")],
    [
      "fractional decimals",
      () => appTokenPriceToGmsolUnitPrice({ price: 10n ** 30n, decimals: 8.5, rounding: "floor" }),
    ],
    ["negative decimals", () => gmsolUnitPriceToAppTokenPrice({ unitPrice: 1n, decimals: -1 })],
    ["decimals above 30", () => appTokenPriceToGmsolUnitPrice({ price: 10n ** 50n, decimals: 31, rounding: "floor" })],
    // $0.0001 at 24 decimals: 10^26 / 10^34 floors to 0, so no gmsol unit price exists.
    [
      "price below one unit price",
      () => appTokenPriceToGmsolUnitPrice({ price: 10n ** 26n, decimals: 24, rounding: "ceil" }),
    ],
    ["usd below one gmsol unit", () => appUsdToGmsolUsd(D - 1n, "ceil")],
  ])("rejects %s", (_, convert) => {
    expect(convert).toThrow(RangeError);
  });
});
