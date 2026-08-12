import { describe, expect, it } from "vitest";

import { ARBITRUM, DEFAULT_SETTLEMENT_CHAIN_ID } from "config/chains";

import { getSupportedChains } from "./walletConfig";

describe("getSupportedChains", () => {
  it("uses Arbitrum as the default settlement chain", () => {
    expect(DEFAULT_SETTLEMENT_CHAIN_ID).toBe(ARBITRUM);
  });

  it("places the default settlement chain first", () => {
    const supportedChains = getSupportedChains();

    expect(supportedChains[0].id).toBe(DEFAULT_SETTLEMENT_CHAIN_ID);
  });

  it("does not duplicate chains when pinning the default chain first", () => {
    const chainIds = getSupportedChains().map((chain) => chain.id);

    expect(new Set(chainIds).size).toBe(chainIds.length);
  });
});
