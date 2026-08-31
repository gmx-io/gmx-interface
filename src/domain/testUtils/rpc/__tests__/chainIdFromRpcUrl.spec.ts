import { describe, expect, it } from "vitest";

import { getRpcProviders, getWsRpcProviders, RpcPurpose } from "config/rpc";
import { AnyChainId, CONTRACTS_CHAIN_IDS_DEV, SOURCE_CHAIN_IDS } from "sdk/configs/chains";

import { chainIdFromRpcUrl, RPC_HOSTS_BY_CHAIN_ID } from "../chainIdFromRpcUrl";

const ALL_CHAIN_IDS = Array.from(new Set<AnyChainId>([...CONTRACTS_CHAIN_IDS_DEV, ...SOURCE_CHAIN_IDS]));
const PURPOSES: RpcPurpose[] = ["default", "fallback", "largeAccount", "express"];

function getConfiguredUrls(chainId: AnyChainId): string[] {
  const providers = PURPOSES.flatMap((purpose) => [
    ...getRpcProviders(chainId, purpose),
    ...getWsRpcProviders(chainId, purpose),
  ]);

  return Array.from(new Set(providers.flatMap((provider) => (provider ? [provider.url] : []))));
}

/**
 * `chainIdFromRpcUrl` hand-copies the endpoints out of `config/rpc` because the Playwright adapter
 * cannot import that module. These tests are the drift alarm for that copy.
 */
describe("chainIdFromRpcUrl", () => {
  it.each(ALL_CHAIN_IDS)("resolves every configured endpoint of chain %i", (chainId) => {
    for (const url of getConfiguredUrls(chainId)) {
      expect(
        chainIdFromRpcUrl(url),
        `url ${url} is configured for chain ${chainId} but not resolved by RPC_HOSTS_BY_CHAIN_ID ` +
          `(if it comes from a VITE_APP_*_RPC_URLS override, unset it)`
      ).toBe(chainId);
    }
  });

  it("maps each entry to a single chain", () => {
    const seen = new Map<string, number>();

    for (const [chainId, entries] of Object.entries(RPC_HOSTS_BY_CHAIN_ID)) {
      for (const entry of entries) {
        expect(seen.get(entry) ?? Number(chainId), `entry ${entry} is claimed by two chains`).toBe(Number(chainId));
        seen.set(entry, Number(chainId));
      }
    }
  });

  it("distinguishes path-multiplexed providers", () => {
    expect(chainIdFromRpcUrl("https://1rpc.io/bnb")).toBe(chainIdFromRpcUrl("https://bsc.drpc.org"));
    // A path the table does not claim must stay unresolved instead of borrowing another chain's id.
    expect(chainIdFromRpcUrl("https://1rpc.io/arb")).toBeUndefined();
  });

  it("returns undefined for unrelated hosts", () => {
    expect(chainIdFromRpcUrl("https://layerzero-api.com/v1/messages")).toBeUndefined();
  });
});
