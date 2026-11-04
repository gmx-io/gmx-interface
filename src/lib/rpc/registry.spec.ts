import { afterEach, expect, it, vi } from "vitest";

import { ARBITRUM, SOLANA_NETWORK_ID } from "config/chains";
import { getProviderNameFromUrl, RPC_TRACKER_CONFIG_FOR_CONTRACTS_CHAINS } from "config/rpc";
import { emitEndpointBanned, emitEndpointsUpdated, emitTrackingFinished } from "lib/FallbackTracker/events";
import { NetworkStatusObserver } from "lib/FallbackTracker/NetworkStatusObserver";
import { metrics } from "lib/metrics";

import { getRegisteredRpcTracker, registerRpcTracker } from "./registry";
import { RpcTracker } from "./RpcTracker";

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.restoreAllMocks();
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
    const endpoints = tracker.fallbackTracker.params.endpoints;
    const stats = endpoints.map((endpoint, index) => ({
      endpoint,
      failureTimestamps: [],
      failureThrottleTimeout: undefined,
      banned: undefined,
      bannedEmitted: undefined,
      checkResults: [
        {
          endpoint,
          success: true,
          stats: {
            responseTime: 10,
            ...(networkId === SOLANA_NETWORK_ID
              ? { slot: 9007199254741000n - BigInt(index) * 2n }
              : { blockNumber: 1000 - index * 2 }),
          },
        },
      ],
    }));
    const detail = {
      trackerKey: tracker.trackerKey,
      primary: endpoints[0],
      fallbacks: endpoints.slice(1, 2),
      endpointsStats: stats,
    };
    emitEndpointsUpdated(detail);
    emitEndpointBanned({ trackerKey: tracker.trackerKey, endpoint: endpoints[0], reason: "test failure" });
    emitTrackingFinished(detail);
    const update = metrics.queue.find(
      (item) => item.type === "event" && item.payload.event === "rpcTracker.endpoint.updated"
    );
    expect(update?.payload.customFields).toMatchObject({
      chainId: networkId,
      primaryBlockGap: 0,
      secondaryBlockGap: networkId === SOLANA_NETWORK_ID ? "unknown" : 2,
    });
    if (networkId === SOLANA_NETWORK_ID) expect(update?.payload.customFields?.progressUnit).toBe("slot");
    else expect(update?.payload.customFields).not.toHaveProperty("progressUnit");
    const ban = metrics.queue.find(
      (item) => item.type === "event" && item.payload.event === "rpcTracker.endpoint.banned"
    );
    expect(ban?.payload.customFields?.endpoint).toBe(getProviderNameFromUrl(endpoints[0]));
    expect(JSON.stringify(ban)).not.toContain(endpoints[0]);
    const gaps = metrics.queue.filter(
      (item) => item.type === "timing" && item.payload.event === "rpcTracker.endpoint.blockGap"
    );
    expect(gaps.length).toBeGreaterThan(0);
    if (networkId === SOLANA_NETWORK_ID)
      expect(gaps.every((item) => item.payload.customFields?.progressUnit === "slot")).toBe(true);
    cleanup();
    cleanup = undefined;
    expect(getRegisteredRpcTracker(networkId)).toBeUndefined();
    metrics.queue = [];
    emitEndpointsUpdated(detail);
    emitEndpointBanned({ trackerKey: tracker.trackerKey, endpoint: endpoints[0], reason: "after cleanup" });
    emitTrackingFinished(detail);
    expect(metrics.queue).toEqual([]);
  }
);
