import { describe, expect, it } from "vitest";

import type { Token } from "sdk/utils/tokens/types";

import { createTokenSortSequenceComparator } from "./utils";

const WETH: Token = {
  name: "Wrapped Ethereum",
  symbol: "WETH",
  decimals: 18,
  address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  isWrapped: true,
};

const ETH: Token = {
  name: "Ethereum",
  symbol: "ETH",
  decimals: 18,
  address: "0x0000000000000000000000000000000000000000",
  wrappedAddress: WETH.address,
  isNative: true,
};

const BTC: Token = { name: "Bitcoin", symbol: "BTC", decimals: 8, address: "0x2f2a" };
const USDC: Token = { name: "USD Coin", symbol: "USDC", decimals: 6, address: "0xaf88", isStable: true };

// Reachable only through an external aggregator, so they are absent from the liquidity sequence
const ZRO: Token = { name: "LayerZero", symbol: "ZRO", decimals: 18, address: "0x6985" };
const AAVE: Token = { name: "Aave", symbol: "AAVE", decimals: 18, address: "0xba5D" };

const SORT_SEQUENCE = [WETH.address, BTC.address, USDC.address];

function sortSymbols(tokens: Token[], sortSequence?: string[]) {
  return tokens
    .slice()
    .sort(createTokenSortSequenceComparator(sortSequence))
    .map((token) => token.symbol);
}

describe("createTokenSortSequenceComparator", () => {
  it("keeps the sequence order for ranked tokens", () => {
    expect(sortSymbols([USDC, WETH, BTC], SORT_SEQUENCE)).toEqual(["WETH", "BTC", "USDC"]);
  });

  it("puts tokens missing from the sequence after ranked ones, alphabetically", () => {
    expect(sortSymbols([ZRO, AAVE, USDC, WETH], SORT_SEQUENCE)).toEqual(["WETH", "USDC", "AAVE", "ZRO"]);
  });

  it("does not depend on the input order", () => {
    const sorted = sortSymbols([USDC, ZRO, WETH, AAVE, BTC], SORT_SEQUENCE);

    expect(sorted).toEqual(sortSymbols([AAVE, BTC, USDC, ZRO, WETH], SORT_SEQUENCE));
    expect(sorted).toEqual(["WETH", "BTC", "USDC", "AAVE", "ZRO"]);
  });

  it("ranks the native token through its wrapped representation", () => {
    expect(sortSymbols([USDC, ETH, ZRO], SORT_SEQUENCE)).toEqual(["ETH", "USDC", "ZRO"]);
    // native and wrapped share a rank and stay next to each other at the top
    expect(sortSymbols([USDC, WETH, ETH], SORT_SEQUENCE)).toEqual(["ETH", "WETH", "USDC"]);
  });

  it("keeps the input order when there is no sequence to rank by", () => {
    expect(sortSymbols([USDC, ZRO, WETH], undefined)).toEqual(["USDC", "ZRO", "WETH"]);
  });
});
