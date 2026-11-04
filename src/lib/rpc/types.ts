import type { FallbackTracker } from "lib/FallbackTracker/FallbackTracker";

export type RpcCheckStats = {
  responseTime: number;
  blockNumber?: number;
  slot?: bigint;
};

export type RpcTrackerObserver = {
  trackerKey: string;
  params: { chainId: number };
  fallbackTracker: Pick<
    FallbackTracker<RpcCheckStats>,
    "state" | "getEndpointsStats" | "getEndpointStats" | "getCurrentEndpoints" | "startTracking" | "stopTracking"
  > & { params: { endpoints: string[] } };
  getRpcConfig(endpoint: string): RpcConfig | undefined;
};

export type RpcConfig = {
  url: string;
  isPublic: boolean;
  purpose: string;
  // Provider-specific limit for Solana getMultipleAccounts requests.
  maxAccountsPerRequest?: number;
};
