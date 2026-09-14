import { serialize } from "@wagmi/core";
import { describe, expect, it } from "vitest";

import { ARBITRUM, DEFAULT_SETTLEMENT_CHAIN_ID } from "config/chains";

import { getSupportedChains, getWagmiInitialState } from "./walletConfig";

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

describe("getWagmiInitialState", () => {
  // wagmi 2.19 runs store.setState(getInitialState()) inside createConfig, and with the ssr: true that
  // @privy-io/wagmi forces (skipHydration) the persist middleware writes that empty state back before
  // hydration, wiping `current` — wagmi's own marker of a restorable session. Reading the store before
  // createConfig and handing it to WagmiProvider as initialState keeps it. Drop this once createConfig
  // stops persisting its initial state or Privy stops forcing ssr.
  it("hands the persisted connection to wagmi as initialState", () => {
    localStorage.setItem(
      "wagmi.store",
      serialize({
        state: {
          connections: new Map([["connector-uid", { accounts: ["0x1"], chainId: 42161 }]]),
          chainId: 42161,
          current: "connector-uid",
        },
        version: 2,
      })
    );

    expect(getWagmiInitialState()?.current).toBe("connector-uid");
    expect(getWagmiInitialState()?.chainId).toBe(42161);
  });
});
