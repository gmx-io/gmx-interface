import { afterEach, expect, it, vi } from "vitest";

import { setAbFlagEnabled } from "config/ab";
import { ARBITRUM, SOLANA_NETWORK_ID } from "config/chains";
import { RPC_TRACKER_CONFIG_FOR_CONTRACTS_CHAINS } from "config/rpc";
import { setIsSolanaNetworkSelected } from "config/solanaNetwork";
import { emitEndpointsUpdated, emitTrackingFinished } from "lib/FallbackTracker/events";
import { NetworkStatusObserver } from "lib/FallbackTracker/NetworkStatusObserver";
import { metrics } from "lib/metrics";

import { getRegisteredRpcTracker, registerRpcTracker } from "../registry";
import { RpcTracker } from "../RpcTracker";
import { getRpcTrackerByChainId, syncEvmRpcTracking } from "../useRpcUrls";

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.restoreAllMocks();
  vi.useRealTimers();
  metrics.queue = [];
  localStorage.clear();
});

it.each([ARBITRUM, SOLANA_NETWORK_ID])(
  "registers network %s with shared metrics and removes subscriptions on cleanup",
  async (networkId) => {
    const tracker =
      networkId === SOLANA_NETWORK_ID
        ? new (await import("lib/solana/rpc")).SolanaRpcTracker()
        : new RpcTracker({
            ...RPC_TRACKER_CONFIG_FOR_CONTRACTS_CHAINS,
            chainId: ARBITRUM,
            networkStatusObserver: NetworkStatusObserver.getInstance(),
          });
    cleanup = () => {
      unregister();
      tracker.fallbackTracker.cleanup();
    };
    const unregister = registerRpcTracker(tracker);
    expect(getRegisteredRpcTracker(networkId)).toBe(tracker);
    const endpoint = tracker.fallbackTracker.params.endpoints[0];
    const detail = {
      trackerKey: tracker.trackerKey,
      primary: endpoint,
      fallbacks: [],
      endpointsStats: [
        {
          ...tracker.fallbackTracker.getEndpointStats(endpoint)!,
          checkResults: [
            {
              endpoint,
              success: true,
              stats: {
                responseTime: 10,
                ...(networkId === SOLANA_NETWORK_ID ? { slot: 9007199254741000n } : { blockNumber: 1000 }),
              },
            },
          ],
        },
      ],
    };
    emitEndpointsUpdated(detail);
    for (const success of [false, false, true, true]) {
      detail.endpointsStats[0].checkResults[0].success = success;
      emitTrackingFinished(detail);
    }
    const health = metrics.queue.filter(
      (item) => item.type === "event" && item.payload.event === "rpcTracker.endpoint.health"
    );
    expect(health.map((item) => item.payload.customFields?.isHealthy)).toEqual(
      networkId === SOLANA_NETWORK_ID ? [false, true] : []
    );
    const gap = metrics.queue.find(
      (item) => item.type === "timing" && item.payload.event === "rpcTracker.endpoint.blockGap"
    );
    expect(gap?.type === "timing" ? gap.payload.time : undefined).toBe(0);
    expect(gap?.payload.customFields?.progressUnit).toBe(networkId === SOLANA_NETWORK_ID ? "slot" : undefined);
    cleanup();
    cleanup = undefined;
    expect(getRegisteredRpcTracker(networkId)).toBeUndefined();
    metrics.queue = [];
    emitEndpointsUpdated(detail);
    emitTrackingFinished(detail);
    expect(metrics.queue).toEqual([]);
  }
);

it("keeps EVM probes owned by their registry across Solana switches", () => {
  vi.useFakeTimers();
  setAbFlagEnabled("solanaNetwork", true);
  setIsSolanaNetworkSelected(true);
  try {
    syncEvmRpcTracking();
    const tracker = getRpcTrackerByChainId(ARBITRUM)!;
    expect(tracker.fallbackTracker.state.startDelayTimeoutId).toBeUndefined();
    expect(tracker.fallbackTracker.state.trackerTimeoutId).toBeUndefined();
    setIsSolanaNetworkSelected(false);
    syncEvmRpcTracking();
    expect(tracker.fallbackTracker.state.startDelayTimeoutId).toBeDefined();
    setIsSolanaNetworkSelected(true);
    syncEvmRpcTracking();
    expect(tracker.fallbackTracker.state.startDelayTimeoutId).toBeUndefined();
    expect(tracker.fallbackTracker.state.trackerTimeoutId).toBeUndefined();
  } finally {
    setIsSolanaNetworkSelected(true);
    syncEvmRpcTracking();
    setIsSolanaNetworkSelected(false);
    setAbFlagEnabled("solanaNetwork", false);
    vi.useRealTimers();
  }
});
