import { Address, createSolanaRpc } from "@solana/kit";
import orderBy from "lodash/orderBy";

import { SOLANA_NETWORK_ID } from "config/chains";
import { getRpcProviders, type RpcConfig } from "config/rpc";
import { DEFAULT_FALLBACK_TRACKER_CONFIG } from "lib/FallbackTracker/const";
import { EndpointStats, FallbackTracker } from "lib/FallbackTracker/FallbackTracker";
import { NetworkStatusObserver } from "lib/FallbackTracker/NetworkStatusObserver";
import { getAvgResponseTime, scoreBySpeedAndConsistency, scoreNotBanned } from "lib/FallbackTracker/utils";
import { withFallback } from "lib/FallbackTracker/withFallback";
import { registerRpcTracker } from "lib/rpc/registry";

const MAX_ACCOUNTS_PER_REQUEST = 100;
const RPC_TIMEOUT = 15_000;
const MAINNET_GENESIS_HASH = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
// Approximately one minute at the target slot duration of 400 ms.
const MAX_SLOT_LAG = 150n;

type SolanaRpcCheckResult = { responseTime: number; slot: bigint };
type SolanaRpcStats = EndpointStats<SolanaRpcCheckResult>;

export class SolanaRpcTracker {
  readonly params = { chainId: SOLANA_NETWORK_ID };
  readonly fallbackTracker: FallbackTracker<SolanaRpcCheckResult>;
  readonly clients = new Map<string, ReturnType<typeof createSolanaRpc>>();

  constructor(
    readonly providers: RpcConfig[] = [
      ...getRpcProviders(SOLANA_NETWORK_ID, "default"),
      ...getRpcProviders(SOLANA_NETWORK_ID, "fallback"),
    ]
  ) {
    const primary = providers.find((provider) => provider.purpose === "default")?.url;
    if (!primary) {
      throw new Error("No default Solana RPC provider configured");
    }
    for (const provider of providers) {
      const limit = provider.maxAccountsPerRequest ?? MAX_ACCOUNTS_PER_REQUEST;
      if (!Number.isInteger(limit) || limit < 1 || limit > MAX_ACCOUNTS_PER_REQUEST) {
        throw new Error("Invalid Solana RPC account batch limit");
      }
    }
    this.fallbackTracker = new FallbackTracker({
      ...DEFAULT_FALLBACK_TRACKER_CONFIG,
      trackerKey: "RpcTracker.Solana",
      primary,
      endpoints: providers.map((provider) => provider.url),
      networkStatusObserver: NetworkStatusObserver.getInstance(),
      checkEndpoint: (endpoint, signal) => this.checkEndpoint(endpoint, signal),
      selectNextPrimary: ({ endpointsStats }) =>
        this.rank(endpointsStats).find((stats) => this.getPurpose(stats.endpoint) === "default")?.endpoint,
      selectNextFallbacks: ({ primary }) =>
        this.rank(this.fallbackTracker.getEndpointsStats())
          .filter((stats) => stats.endpoint !== primary)
          .map((stats) => stats.endpoint),
    });
  }

  getClient(endpoint: string) {
    let client = this.clients.get(endpoint);
    if (!client) {
      client = createSolanaRpc(endpoint);
      this.clients.set(endpoint, client);
    }
    return client;
  }

  getPurpose(endpoint: string) {
    return this.getRpcConfig(endpoint)?.purpose;
  }

  get trackerKey() {
    return this.fallbackTracker.trackerKey;
  }

  getRpcConfig(endpoint: string) {
    return this.providers.find((provider) => provider.url === endpoint);
  }

  async checkEndpoint(endpoint: string, signal: AbortSignal): Promise<SolanaRpcCheckResult> {
    const start = Date.now();
    const rpc = this.getClient(endpoint);
    const [genesis, slot] = await Promise.all([
      rpc.getGenesisHash().send({ abortSignal: signal }),
      rpc.getSlot({ commitment: "confirmed" }).send({ abortSignal: signal }),
    ]);
    if (genesis !== MAINNET_GENESIS_HASH) {
      throw new Error("Solana RPC is not on Mainnet");
    }
    if (typeof slot !== "bigint" || slot < 0n) {
      throw new Error("Invalid Solana RPC slot");
    }
    return { responseTime: Date.now() - start, slot };
  }

  rank(stats: SolanaRpcStats[]) {
    const successful = stats.filter(
      (item) => this.getPurpose(item.endpoint) === "default" && item.checkResults[0]?.success
    );
    const slots = successful
      .map((item) => item.checkResults[0].stats!.slot)
      .sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
    // Like the EVM tracker, do not let a single future outlier invalidate all other nodes.
    const bestSlot = slots[1] !== undefined && slots[0] - slots[1] > MAX_SLOT_LAG ? slots[1] : slots[0];
    const eligible = stats.filter((item) => {
      const latest = item.checkResults[0];
      if (!latest) return true;
      if (!latest.success) return false;
      // Like EVM, retain the configured fallback outside public-node height ranking.
      if (this.getPurpose(item.endpoint) === "fallback") return true;
      return (
        latest.stats &&
        bestSlot !== undefined &&
        latest.stats.slot >= bestSlot - MAX_SLOT_LAG &&
        latest.stats.slot <= bestSlot + MAX_SLOT_LAG
      );
    });
    const avg = getAvgResponseTime(eligible);
    return orderBy(
      eligible,
      [scoreNotBanned, (item) => this.getPurpose(item.endpoint) === "default", scoreBySpeedAndConsistency(avg)],
      ["desc", "desc", "desc"]
    );
  }

  async fetchAccounts(addresses: readonly Address[]) {
    if (!addresses.length) return [];
    return withFallback({
      endpoints: this.getRequestEndpoints(),
      fn: async (endpoint) => {
        try {
          const rpc = this.getClient(endpoint);
          const batchSize =
            this.providers.find((provider) => provider.url === endpoint)?.maxAccountsPerRequest ??
            MAX_ACCOUNTS_PER_REQUEST;
          const batches = Array.from({ length: Math.ceil(addresses.length / batchSize) }, (_, index) =>
            addresses.slice(index * batchSize, (index + 1) * batchSize)
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
          this.fallbackTracker.reportFailure(endpoint);
          throw error;
        }
      },
    });
  }

  getRequestEndpoints() {
    const { primary, fallbacks, endpointsStats } = this.fallbackTracker.getCurrentEndpoints();
    const selected = new Set([primary, ...fallbacks]);
    const endpoints = this.rank(endpointsStats)
      .map((stats) => stats.endpoint)
      .filter((endpoint) => selected.has(endpoint));
    if (!endpoints.length) {
      throw new Error("No healthy Solana RPC endpoints available");
    }
    return endpoints;
  }
}

let tracker: SolanaRpcTracker | undefined;

export function getSolanaRpcTracker() {
  if (!tracker) {
    tracker = new SolanaRpcTracker();
    registerRpcTracker(tracker);
  }
  return tracker;
}

export function getSolanaRpc() {
  const tracker = getSolanaRpcTracker();
  return tracker.getClient(tracker.getRequestEndpoints()[0]);
}

export function fetchSolanaAccounts(addresses: readonly Address[]) {
  return getSolanaRpcTracker().fetchAccounts(addresses);
}
