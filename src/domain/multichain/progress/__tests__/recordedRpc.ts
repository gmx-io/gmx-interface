import path from "path";
import { fileURLToPath } from "url";
import { createPublicClient, type PublicClient } from "viem";

import { getViemChain } from "config/chains";
import { installFetchResponder } from "domain/testUtils/rpc/fetchAdapter";
import { createRecordedResponder } from "domain/testUtils/rpc/recordedResponder";
import type { getPublicClientWithRpc as getPublicClientWithRpcType, getRpcTransport } from "lib/wallets/walletConfig";
import type { AnyChainId } from "sdk/configs/chains";

/**
 * Fixture-backed RPC for the multichain tracker tests. The app's own viem transports stay in place;
 * only `fetch` is intercepted, which is the same seam the component tests use.
 *
 * Re-record with:
 *   RECORD_RPC_FIXTURES=1 yarn vitest run src/domain/multichain/progress/__tests__/tracker.spec.ts
 */
const responder = createRecordedResponder({
  fixturesDir: path.join(path.dirname(fileURLToPath(import.meta.url)), "__fixtures__"),
  httpHosts: ["layerzero-api.com"],
  realFetch: globalThis.fetch,
});

let restoreFetch: (() => void) | undefined;

export function installRecordedRpc() {
  restoreFetch = installFetchResponder(responder, { http: responder.http }).restore;
}

/**
 * Restores `fetch`, saves recorded misses, and in replay mode fails the run when fixtures were
 * missing — the per-request errors get retried away by the fallback transport and would otherwise
 * only surface as opaque test timeouts.
 */
export function finishRecordedRpc() {
  restoreFetch?.();
  restoreFetch = undefined;
  responder.save();

  if (responder.missingFixtures.length > 0) {
    throw new Error(
      "[recordedRpc] fixtures are missing; re-record with RECORD_RPC_FIXTURES=1:\n" +
        responder.missingFixtures.join("\n")
    );
  }
}

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
