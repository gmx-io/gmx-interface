import { zeroAddress } from "viem";
import { describe, expect, it } from "vitest";

import { ARBITRUM, SOURCE_BASE_MAINNET } from "../chainIds";
import {
  getMultichainTokenGroups,
  getStargatePoolAddress,
  resolveStargatePool,
} from "../multichainTokens";

const groups = getMultichainTokenGroups({ includeTestnets: true });

describe("multichainTokens / resolveStargatePool", () => {
  it("resolves USDC by symbol on Arbitrum (settlement)", () => {
    const entry = resolveStargatePool(groups, { chainId: ARBITRUM, tokenSymbol: "USDC" });
    expect(entry?.symbol).toBe("USDC");
    expect(entry?.address.toLowerCase()).toBe("0xaf88d065e77c8cc2239327c5edb3a432268e5831");
    expect(entry?.stargate.toLowerCase()).toBe("0xe8cdf27acd73a434d661c84887215f7598e7d0d3");
  });

  it("resolves USDC by symbol on Base (source)", () => {
    const entry = resolveStargatePool(groups, { chainId: SOURCE_BASE_MAINNET, tokenSymbol: "USDC" });
    expect(entry?.stargate.toLowerCase()).toBe("0x27a16dc786820b16e5c9028b75b99f6f604b5d26");
  });

  it("resolves ETH (native) by symbol", () => {
    const entry = resolveStargatePool(groups, { chainId: SOURCE_BASE_MAINNET, tokenSymbol: "ETH" });
    expect(entry?.symbol).toBe("ETH");
    expect(entry?.address).toBe(zeroAddress);
  });

  it("resolves by settlement-chain tokenAddress (case-insensitive)", () => {
    const entry = resolveStargatePool(groups, {
      chainId: ARBITRUM,
      tokenAddress: "0xAF88D065E77C8CC2239327C5EDB3A432268E5831",
    });
    expect(entry?.symbol).toBe("USDC");
  });

  it("resolves by source-chain pool address", () => {
    const entry = resolveStargatePool(groups, {
      chainId: SOURCE_BASE_MAINNET,
      poolAddress: "0x27a16dc786820B16E5c9028b75B99F6f604b5d26",
    });
    expect(entry?.symbol).toBe("USDC");
  });

  it("returns undefined for token without a Stargate pool on the chain", () => {
    expect(resolveStargatePool(groups, { chainId: ARBITRUM, tokenSymbol: "USDT" })?.symbol).toBe("USDT");
    expect(resolveStargatePool(groups, { chainId: SOURCE_BASE_MAINNET, tokenSymbol: "USDT" })).toBeUndefined();
  });

  it("returns undefined for unknown token address", () => {
    expect(
      resolveStargatePool(groups, { chainId: ARBITRUM, tokenAddress: "0x1111111111111111111111111111111111111111" })
    ).toBeUndefined();
  });
});

describe("multichainTokens / getStargatePoolAddress", () => {
  it("returns pool for a known settlement USDC", () => {
    const addr = getStargatePoolAddress(groups, ARBITRUM, "0xaf88d065e77c8cC2239327C5EDb3A432268e5831");
    expect(addr?.toLowerCase()).toBe("0xe8cdf27acd73a434d661c84887215f7598e7d0d3");
  });

  it("returns undefined for unknown address", () => {
    expect(getStargatePoolAddress(groups, ARBITRUM, "0x0000000000000000000000000000000000000123")).toBeUndefined();
  });
});
