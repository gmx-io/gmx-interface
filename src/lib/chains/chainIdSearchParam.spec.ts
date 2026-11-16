import { describe, expect, it } from "vitest";

import {
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  MEGAETH,
  SOURCE_BASE_MAINNET,
  SOURCE_BSC_MAINNET,
  SOURCE_ETHEREUM_MAINNET,
  SOURCE_SEPOLIA,
} from "config/chains";

import { getChainIdFromSearchParam, getSettlementChainIdForSelectedChain } from "./chainIdSearchParam";

describe("getChainIdFromSearchParam", () => {
  it("accepts every network the homepage links to", () => {
    for (const chainId of [
      ARBITRUM,
      AVALANCHE,
      MEGAETH,
      SOURCE_BASE_MAINNET,
      SOURCE_BSC_MAINNET,
      SOURCE_ETHEREUM_MAINNET,
    ]) {
      expect(getChainIdFromSearchParam(String(chainId))).toBe(chainId);
    }
  });

  it("rejects a missing or malformed value", () => {
    expect(getChainIdFromSearchParam(undefined)).toBeUndefined();
    expect(getChainIdFromSearchParam("")).toBeUndefined();
    expect(getChainIdFromSearchParam("abc")).toBeUndefined();
    expect(getChainIdFromSearchParam("42161.5")).toBeUndefined();
    expect(getChainIdFromSearchParam("99999999999999999999")).toBeUndefined();
  });

  it("rejects networks the app cannot select", () => {
    // Polygon, retired Botanix, a negative id
    expect(getChainIdFromSearchParam("137")).toBeUndefined();
    expect(getChainIdFromSearchParam("3637")).toBeUndefined();
    expect(getChainIdFromSearchParam("-1")).toBeUndefined();
  });
});

describe("getSettlementChainIdForSelectedChain", () => {
  it("keeps the settlement chain for a contracts chain", () => {
    expect(getSettlementChainIdForSelectedChain(MEGAETH, AVALANCHE)).toBe(AVALANCHE);
    expect(getSettlementChainIdForSelectedChain(ARBITRUM, AVALANCHE)).toBe(AVALANCHE);
  });

  it("keeps the settlement chain a source chain can settle on", () => {
    expect(getSettlementChainIdForSelectedChain(SOURCE_BASE_MAINNET, AVALANCHE)).toBe(AVALANCHE);
    expect(getSettlementChainIdForSelectedChain(SOURCE_ETHEREUM_MAINNET, ARBITRUM)).toBe(ARBITRUM);
  });

  it("falls back to the default settlement chain when the source chain cannot settle on the current one", () => {
    expect(getSettlementChainIdForSelectedChain(SOURCE_ETHEREUM_MAINNET, AVALANCHE)).toBe(ARBITRUM);
    expect(getSettlementChainIdForSelectedChain(SOURCE_SEPOLIA, ARBITRUM)).toBe(ARBITRUM_SEPOLIA);
  });
});
