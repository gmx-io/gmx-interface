import { useEffect, useState } from "react";

import {
  getCurrentRpcUrls as old_getCurrentRpcUrls,
  useCurrentRpcUrls as old_useCurrentRpcUrls,
} from "ab/testRpcFallbackUpdates/disabled/oldRpcTracker";
import { getIsFlagEnabled } from "config/ab";
import { AnyChainId } from "config/chains";
import { RpcTracker } from "lib/rpcTracker/RpcTracker";

const RPC_TRACKER_UPDATE_EVENT = "rpc-tracker-update-event";

// Create singleton instance
const rpcTrackerInstance = new RpcTracker();

// Initialize tracking if flag is enabled
if (getIsFlagEnabled("testRpcFallbackUpdates")) {
  rpcTrackerInstance.trackRpcProviders({ warmUp: true });
}

// Export wrapper functions that match the original API
function _getCurrentRpcUrls(chainId: number) {
  return rpcTrackerInstance.getCurrentRpcUrls(chainId as AnyChainId);
}

function _useCurrentRpcUrls(chainId: number) {
  const [bestRpcUrls, setBestRpcUrls] = useState<{
    primary: string;
    secondary: string;
  }>(() => rpcTrackerInstance.getCurrentRpcUrls(chainId as AnyChainId));

  useEffect(() => {
    let isMounted = true;

    setBestRpcUrls(rpcTrackerInstance.getCurrentRpcUrls(chainId as AnyChainId));

    const handleRpcUpdate = () => {
      if (isMounted) {
        setBestRpcUrls(rpcTrackerInstance.getCurrentRpcUrls(chainId as AnyChainId));
      }
    };

    window.addEventListener(RPC_TRACKER_UPDATE_EVENT, handleRpcUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener(RPC_TRACKER_UPDATE_EVENT, handleRpcUpdate);
    };
  }, [chainId]);

  return bestRpcUrls;
}

async function _markFailedRpcProvider(chainId: number, failedRpcUrl: string) {
  return rpcTrackerInstance.markFailedRpcProvider(chainId, failedRpcUrl);
}

export const useCurrentRpcUrls = getIsFlagEnabled("testRpcFallbackUpdates")
  ? _useCurrentRpcUrls
  : old_useCurrentRpcUrls;

export const getCurrentRpcUrls = getIsFlagEnabled("testRpcFallbackUpdates")
  ? _getCurrentRpcUrls
  : old_getCurrentRpcUrls;

export const markFailedRpcProvider = getIsFlagEnabled("testRpcFallbackUpdates")
  ? _markFailedRpcProvider
  : async () => null;
