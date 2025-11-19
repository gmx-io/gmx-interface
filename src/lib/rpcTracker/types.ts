import { RpcConfig } from "config/rpc";

export type RpcTrackerConfig = {
  chainId: number;
  probeTimeout: number;
  probeFailTimeout: number;
  storageExpireTimeout: number;
  disableUnusedTrackingTimeout: number;
  blockFromFutureThreshold: number;
  blockLaggingThreshold: number;
  banTimeout: number;
  maxStoredProbeStats: number;
};

export type ProbeData = {
  url: string;
  isValid: boolean;
  responseTime: number | null;
  blockNumber: number | null;
  timestamp: Date;
};

export type RpcProviderState = RpcConfig & {
  bannedTimestamp?: number;
};

export type ProbeStats = {
  probeResults: {
    [providerUrl: string]: ProbeData;
  };
  timestamp: number;
  maxBlockNumber: number | null;
};

export type RpcTrackerState = {
  lastUsage: Date | null;
  bestPrimaryUrl: string;
  bestSecondaryUrl: string;
  providers: {
    [providerUrl: string]: RpcProviderState;
  };
  probeStats: ProbeStats[];
  trackerTimeoutId: number | null;
};
