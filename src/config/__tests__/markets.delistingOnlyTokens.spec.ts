import { zeroAddress } from "viem";
import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { collectDelistingOnlyTokenAddresses, getDelistingOnlyTokenAddresses } from "config/markets";

const WETH = "0xweth";
const USDC = "0xusdc";
const DAI = "0xdai";
const TON = "0xton";
const X = "0xx";

const market = (
  marketTokenAddress: string,
  indexTokenAddress: string,
  longTokenAddress: string,
  shortTokenAddress: string
) => ({
  marketTokenAddress,
  indexTokenAddress,
  longTokenAddress,
  shortTokenAddress,
});

describe("collectDelistingOnlyTokenAddresses", () => {
  const markets = [
    market("0xethMarket", WETH, WETH, USDC),
    market("0xtonMarket", TON, WETH, USDC),
    market("0xxMarket", X, X, USDC),
    market("0xswapOnlyMarket", zeroAddress, USDC, DAI),
  ];
  const delistingMarkets = new Set(["0xtonMarket", "0xxMarket", "0xswapOnlyMarket"]);

  it("returns tokens used by delisting markets only", () => {
    const result = collectDelistingOnlyTokenAddresses({
      markets,
      isDelistingMarket: (marketTokenAddress) => delistingMarkets.has(marketTokenAddress),
    });

    expect(result).toEqual(new Set([TON, X, DAI]));
  });

  it("returns nothing when there are no delisting markets", () => {
    const result = collectDelistingOnlyTokenAddresses({ markets, isDelistingMarket: () => false });

    expect(result.size).toBe(0);
  });
});

describe("getDelistingOnlyTokenAddresses", () => {
  it("never contains collaterals of live markets and is memoized per chain", () => {
    const result = getDelistingOnlyTokenAddresses(ARBITRUM);

    // WETH and USDC on Arbitrum
    expect(result.has("0x82aF49447D8a07e3bd95BD0d56f35241523fBab1")).toBe(false);
    expect(result.has("0xaf88d065e77c8cC2239327C5EDb3A432268e5831")).toBe(false);
    expect(result.has(zeroAddress)).toBe(false);
    expect(getDelistingOnlyTokenAddresses(ARBITRUM)).toBe(result);
  });
});
