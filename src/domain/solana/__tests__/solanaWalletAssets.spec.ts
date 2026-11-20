import { describe, expect, it } from "vitest";

import { expandDecimals } from "lib/numbers";

import { getSolanaWalletAssets, type SolanaWalletToken } from "../solanaWalletAssets";

const usd = (value: number) => expandDecimals(value, 30);

const SOL: SolanaWalletToken = {
  address: "native",
  symbol: "SOL",
  iconSymbol: "SOL",
  name: "Solana",
  decimals: 9,
  isStable: undefined,
};
const USDC = { ...SOL, address: "usdc", symbol: "USDC", decimals: 6, isStable: true };
const APE = { ...SOL, address: "ape", symbol: "APE" };
const TOKENS = [SOL, USDC, APE];

const PRICES = {
  native: { minPrice: usd(100), maxPrice: usd(102) },
  usdc: { minPrice: usd(1), maxPrice: usd(1) },
};

describe("getSolanaWalletAssets", () => {
  it("values each held token at the mid price and totals them", () => {
    const result = getSolanaWalletAssets({
      tokens: TOKENS,
      balances: { native: 2_000_000_000n, usdc: 50_000_000n, ape: 0n },
      prices: PRICES,
    })!;

    expect(result.assets.map((asset) => [asset.symbol, asset.balanceUsd])).toEqual([
      ["SOL", usd(202)],
      ["USDC", usd(50)],
    ]);
    expect(result.totalUsd).toBe(usd(252));
  });

  it("keeps an unpriced holding without USD and leaves the total unknown", () => {
    const result = getSolanaWalletAssets({
      tokens: TOKENS,
      balances: { native: 1_000_000_000n, ape: 5n },
      prices: PRICES,
    })!;

    expect(result.assets.map((asset) => [asset.symbol, asset.balanceUsd])).toEqual([
      ["SOL", usd(101)],
      ["APE", undefined],
    ]);
    expect(result.totalUsd).toBeUndefined();
  });

  it("keeps amounts above Number.MAX_SAFE_INTEGER exact", () => {
    const balance = 2n ** 63n + 1n;
    const result = getSolanaWalletAssets({ tokens: TOKENS, balances: { usdc: balance }, prices: PRICES })!;

    expect(result.assets[0].balance).toBe(balance);
    expect(result.totalUsd).toBe(balance * expandDecimals(1, 24));
  });
});
