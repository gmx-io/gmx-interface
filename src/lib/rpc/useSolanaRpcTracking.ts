import { useEffect } from "react";

import { isSolanaNetwork, SOLANA_NETWORK_ID, type NetworkId } from "config/chains";

import { getRegisteredRpcTracker } from "./registry";

let trackingEnabled = false;

export function getIsSolanaRpcTrackingEnabled() {
  return trackingEnabled;
}

function setSolanaRpcTrackingEnabled(enabled: boolean) {
  if (trackingEnabled === enabled) return;
  trackingEnabled = enabled;

  const tracker = getRegisteredRpcTracker(SOLANA_NETWORK_ID);
  if (enabled) {
    tracker?.fallbackTracker.startTracking();
  } else {
    tracker?.fallbackTracker.stopTracking();
  }
}

// Keep network selection independent of the lazily loaded Solana RPC client.
export function useSolanaRpcTracking(networkId: NetworkId) {
  const enabled = isSolanaNetwork(networkId);
  useEffect(() => {
    setSolanaRpcTrackingEnabled(enabled);
    return () => setSolanaRpcTrackingEnabled(false);
  }, [enabled]);
}
