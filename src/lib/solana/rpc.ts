import { Address, createSolanaRpc } from "@solana/kit";

import { SOLANA_NETWORK_ID } from "config/chains";
import { getRpcProviders, getSolanaRpcUrl } from "config/rpc";
import { DEFAULT_FALLBACK_TRACKER_CONFIG } from "lib/FallbackTracker/const";
import { FallbackTracker } from "lib/FallbackTracker/FallbackTracker";
import { NetworkStatusObserver } from "lib/FallbackTracker/NetworkStatusObserver";
import { registerRpcTracker } from "lib/rpc/registry";
import { getIsSolanaRpcTrackingEnabled } from "lib/rpc/useSolanaRpcTracking";

const MAX_ACCOUNTS_PER_REQUEST = 100;
const RPC_TIMEOUT = 15_000;
const MAINNET_GENESIS_HASH = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";

type SolanaRpcCheckResult = { responseTime: number; slot: bigint };

export class SolanaRpcTracker {
  readonly params = { chainId: SOLANA_NETWORK_ID };
  readonly fallbackTracker: FallbackTracker<SolanaRpcCheckResult>;
  readonly endpoint = getSolanaRpcUrl();
  readonly rpc = createSolanaRpc(this.endpoint);

  constructor() {
    this.fallbackTracker = new FallbackTracker({
      ...DEFAULT_FALLBACK_TRACKER_CONFIG,
      trackSingleEndpoint: true,
      trackerKey: "RpcTracker.Solana",
      primary: this.endpoint,
      endpoints: [this.endpoint],
      networkStatusObserver: NetworkStatusObserver.getInstance(),
      checkEndpoint: (_endpoint, signal) => this.checkEndpoint(signal),
      selectNextPrimary: () => this.endpoint,
      selectNextFallbacks: () => [],
    });
  }

  get trackerKey() {
    return this.fallbackTracker.trackerKey;
  }

  getRpcConfig(endpoint: string) {
    return getRpcProviders(SOLANA_NETWORK_ID, "default").find((provider) => provider.url === endpoint);
  }

  async checkEndpoint(signal: AbortSignal): Promise<SolanaRpcCheckResult> {
    const start = Date.now();
    const [genesis, slot] = await Promise.all([
      this.rpc.getGenesisHash().send({ abortSignal: signal }),
      this.rpc.getSlot({ commitment: "confirmed" }).send({ abortSignal: signal }),
    ]);
    if (genesis !== MAINNET_GENESIS_HASH) {
      throw new Error("Solana RPC is not on Mainnet");
    }
    if (typeof slot !== "bigint" || slot < 0n) {
      throw new Error("Invalid Solana RPC slot");
    }
    return { responseTime: Date.now() - start, slot };
  }

  getRpc() {
    const { endpointsStats } = this.fallbackTracker.getCurrentEndpoints();
    if (endpointsStats[0]?.checkResults[0]?.success === false) {
      throw new Error("No healthy Solana RPC endpoint available");
    }
    return this.rpc;
  }

  async fetchAccounts(addresses: readonly Address[]) {
    if (!addresses.length) return [];
    const rpc = this.getRpc();
    try {
      const batches = Array.from({ length: Math.ceil(addresses.length / MAX_ACCOUNTS_PER_REQUEST) }, (_, index) =>
        addresses.slice(index * MAX_ACCOUNTS_PER_REQUEST, (index + 1) * MAX_ACCOUNTS_PER_REQUEST)
      );
      const responses = await Promise.all(
        batches.map(async (batch) => {
          const { value } = await rpc
            .getMultipleAccounts(batch, { encoding: "base64", commitment: "confirmed" })
            .send({ abortSignal: AbortSignal.timeout(RPC_TIMEOUT) });
          if (value.length !== batch.length) {
            throw new Error("Solana RPC returned an incomplete account batch");
          }
          return value;
        })
      );
      return responses.flat();
    } catch (error) {
      this.fallbackTracker.reportFailure(this.endpoint);
      throw error;
    }
  }
}

let tracker: SolanaRpcTracker | undefined;

export function getSolanaRpcTracker() {
  if (!tracker) {
    tracker = new SolanaRpcTracker();
    registerRpcTracker(tracker);
    // A delayed balance read can initialize this singleton after Solana was deselected.
    if (!getIsSolanaRpcTrackingEnabled()) {
      tracker.fallbackTracker.stopTracking();
    }
  }
  return tracker;
}

export function getSolanaRpc() {
  return getSolanaRpcTracker().getRpc();
}

export function fetchSolanaAccounts(addresses: readonly Address[]) {
  return getSolanaRpcTracker().fetchAccounts(addresses);
}
