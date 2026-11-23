import { isSolanaNetwork } from "config/chains";
import { getIsSolanaNetworkSelected } from "config/solanaNetwork";
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
  const isSolana = isSolanaNetwork(tracker.params.chainId);
  let isTracking = false;
  const syncTracking = () => {
    const shouldTrack = getIsSolanaNetworkSelected();
    if (isTracking === shouldTrack) return;
    isTracking = shouldTrack;
    if (shouldTrack) tracker.fallbackTracker.startTracking();
    else tracker.fallbackTracker.stopTracking();
  };
  if (isSolana) {
    document.addEventListener("networkChange", syncTracking);
    syncTracking();
  }

  return () => {
    if (isSolana) document.removeEventListener("networkChange", syncTracking);
    tracker.fallbackTracker.stopTracking();
    cleanupMetrics();
    cleanupDebug?.();
    trackers.delete(tracker.params.chainId);
  };
}

export function getRegisteredRpcTracker(networkId: number) {
  return trackers.get(networkId);
}
