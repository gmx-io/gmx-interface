import { subscribeForRpcTrackerMetrics } from "lib/metrics/rpcTrackerMetrics";

import { _debugRpcTracker } from "./_debug";
import type { RpcTrackerObserver } from "./types";

const trackers = new Map<number, RpcTrackerObserver>();

export function registerRpcTracker(tracker: RpcTrackerObserver) {
  if (trackers.has(tracker.params.chainId)) {
    throw new Error(`RPC tracker already registered for network: ${tracker.params.chainId}`);
  }
  trackers.set(tracker.params.chainId, tracker);
  const cleanupMetrics = subscribeForRpcTrackerMetrics(tracker);
  const cleanupDebug = _debugRpcTracker?.subscribeForRpcTrackerDebugging(tracker);
  tracker.fallbackTracker.startTracking();

  return () => {
    tracker.fallbackTracker.stopTracking();
    cleanupMetrics();
    cleanupDebug?.();
    trackers.delete(tracker.params.chainId);
  };
}

export function getRegisteredRpcTracker(networkId: number) {
  return trackers.get(networkId);
}
