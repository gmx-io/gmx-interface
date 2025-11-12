import { ContractsChainId } from "sdk/configs/chains";

export type ProbeData = {
  url: string;
  isSuccess: boolean;
  responseTime: number | null;
  blockNumber: number | null;
  timestamp: Date;
  isPublic: boolean;
  isValid?: boolean;
  isSkipped?: boolean;
  banTimestamp?: number;
};

export type ProviderData = {
  url: string;
  isPublic: boolean;
};

export type RpcTrackerConfig = {
  probeTimeout: number;
  probeFailTimeout: number;
  storageExpireTimeout: number;
  disableUnusedTrackingTimeout: number;
  blockFromFutureThreshold: number;
  blockLaggingThreshold: number;
  banTimeout: number;
};

export type RpcTrackerState = {
  [chainId: number]: {
    chainId: ContractsChainId;
    lastUsage: Date | null;
    currentPrimaryUrl: string;
    currentSecondaryUrl: string;
    providers: {
      [providerUrl: string]: ProviderData;
    };
    lastProbeStats?: {
      timestamp: number;
      probeStats: ProbeData[];
      validProbesStats: ProbeData[];
    };
    bannedProviderUrls: {
      [providerUrl: string]: {
        banTimestamp: number;
      };
    };
  };
};

export type ProbeResults = {
  probeStats: ProbeData[];
  validProbesStats: ProbeData[];
};
