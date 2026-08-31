import path from "path";
import { fileURLToPath } from "url";
import { createPublicClient, type PublicClient } from "viem";

import { getViemChain } from "config/chains";
import { createRecordedRpcSuite } from "domain/testUtils/rpc/recordedSuite";
import type { getPublicClientWithRpc as getPublicClientWithRpcType, getRpcTransport } from "lib/wallets/walletConfig";
import type { AnyChainId } from "sdk/configs/chains";

/**
 * Fixture-backed RPC for the multichain progress suites. The app's own viem transports stay in
 * place; only `fetch` is intercepted, which is the same seam the component tests use.
 *
 * Re-record with:
 *   RECORD_RPC_FIXTURES=1 yarn vitest run <spec path>
 */
const suite = createRecordedRpcSuite({
  fixturesDir: path.join(path.dirname(fileURLToPath(import.meta.url)), "__fixtures__"),
  httpHosts: ["layerzero-api.com"],
});

export const installRecordedRpc = suite.install;
export const finishRecordedRpc = suite.finish;

/**
 * Keeps the real transport stack but polls fast — replayed fixtures resolve instantly, so viem's
 * 4s default would only add idle waiting between poll iterations.
 */
export function createFastPollingPublicClient(getTransport: typeof getRpcTransport): typeof getPublicClientWithRpcType {
  const cache = new Map<string, PublicClient>();

  return function getTestPublicClient(chainId, options = {}): PublicClient {
    // Key normalization mirrors the real implementation; the transport itself deliberately stays
    // HTTP for every purpose, because fetch interception is the seam.
    const normalizedOptions = options.withWs ? { withWs: true, withExpress: false } : options;
    const purpose = normalizedOptions.withExpress ? "express" : "default";
    const key = `${chainId}:ws:${normalizedOptions.withWs ? 1 : 0}:${purpose}`;
    const cached = cache.get(key);

    if (cached) {
      return cached;
    }

    const client = createPublicClient({
      chain: getViemChain(chainId),
      pollingInterval: 250,
      transport: getTransport(chainId as AnyChainId, purpose),
    });

    cache.set(key, client);
    return client;
  };
}
