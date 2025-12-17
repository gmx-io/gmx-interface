import { describe, expect, it } from "vitest";

import { getProviderNameFromUrl } from "../rpc";

describe("getProviderNameFromUrl", () => {
  it("should return the provider name from the URL", () => {
    const inputsAndOutputs: { input: string; output: string }[] = [
      { input: "https://rpc.ankr.com/eth", output: "rpc.ankr.com/eth" },
      { input: "https://arb1.arbitrum.io/rpc", output: "arb1.arbitrum.io" },
      { input: "https://arbitrum-one-rpc.publicnode.com", output: "arbitrum-one-rpc.publicnode.com" },
      { input: "https://arbitrum-one.public.blastapi.io", output: "arbitrum-one.public.blastapi.io" },
      { input: "https://arbitrum.drpc.org", output: "arbitrum.drpc.org" },
      { input: "https://rpc.ankr.com/arbitrum", output: "rpc.ankr.com/arbitrum" },
      { input: "https://api.avax.network/ext/bc/C/rpc", output: "api.avax.network" },
      { input: "https://avalanche-c-chain-rpc.publicnode.com", output: "avalanche-c-chain-rpc.publicnode.com" },
      { input: "https://1rpc.io/avax/c", output: "1rpc.io/avax/c" },
      { input: "https://avalanche-fuji-c-chain.publicnode.com", output: "avalanche-fuji-c-chain.publicnode.com" },
      { input: "https://api.avax-test.network/ext/bc/C/rpc", output: "api.avax-test.network" },
      { input: "https://sepolia-rollup.arbitrum.io/rpc", output: "sepolia-rollup.arbitrum.io" },
      { input: "https://arbitrum-sepolia.drpc.org", output: "arbitrum-sepolia.drpc.org" },
      { input: "https://arbitrum-sepolia-rpc.publicnode.com", output: "arbitrum-sepolia-rpc.publicnode.com" },
      { input: "https://mainnet.base.org", output: "mainnet.base.org" },
      { input: "https://base.llamarpc.com", output: "base.llamarpc.com" },
      { input: "https://base-rpc.publicnode.com", output: "base-rpc.publicnode.com" },
      { input: "https://base.drpc.org", output: "base.drpc.org" },
      { input: "https://sepolia.optimism.io", output: "sepolia.optimism.io" },
      { input: "https://optimism-sepolia.drpc.org", output: "optimism-sepolia.drpc.org" },
      { input: "https://optimism-sepolia.therpc.io", output: "optimism-sepolia.therpc.io" },
      { input: "https://sepolia.drpc.org", output: "sepolia.drpc.org" },
      { input: "https://rpc.ankr.com/botanix_mainnet", output: "rpc.ankr.com/botanix_mainnet" },

      { input: "https://arb-mainnet.g.alchemy.com/v2/SECRET_CODE", output: "arb-mainnet.g.alchemy.com" },
    ];

    for (const { input, output } of inputsAndOutputs) {
      const providerName = getProviderNameFromUrl(input);
      expect(providerName).toBe(output);
    }
  });
});
