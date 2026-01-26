import { encodeAbiParameters } from "viem";

import type { RpcConfig } from "config/rpc";
import type { CheckResult, EndpointStats } from "lib/FallbackTracker";
import { DEFAULT_FALLBACK_TRACKER_CONFIG } from "lib/FallbackTracker/const";
import { NetworkStatusObserver } from "lib/FallbackTracker/NetworkStatusObserver";
import type { ContractsChainId } from "sdk/configs/chains";
import { ARBITRUM } from "sdk/configs/chains";

import type { RpcCheckResult, RpcTrackerParams } from "../RpcTracker";

const testChainId = ARBITRUM;

export const testRpcConfigs = {
  defaultPrimary: {
    url: "https://primary-rpc.com",
    isPublic: true,
    purpose: "default" as const,
  },
  defaultSecondary: {
    url: "https://secondary-rpc.com",
    isPublic: true,
    purpose: "default" as const,
  },
  fallback: {
    url: "https://fallback-rpc.com",
    isPublic: false,
    purpose: "fallback" as const,
  },
  largeAccount: {
    url: "https://large-account-rpc.com",
    isPublic: false,
    purpose: "largeAccount" as const,
  },
  express: {
    url: "https://express-rpc.com",
    isPublic: false,
    purpose: "express" as const,
  },
} as const satisfies Record<string, RpcConfig>;

export const testRpcConfigsArray: RpcConfig[] = Object.values(testRpcConfigs);

export const createMockRpcTrackerParams = (overrides?: {
  chainId?: ContractsChainId;
  blockFromFutureThreshold?: number;
  blockLaggingThreshold?: number;
  trackInterval?: number;
  checkTimeout?: number;
  cacheTimeout?: number;
  disableUnusedTrackingTimeout?: number;
  setEndpointsThrottle?: number;
  delay?: number;
  failuresBeforeBan?: {
    count?: number;
    window?: number;
    throttle?: number;
  };
  networkStatusObserver?: NetworkStatusObserver;
}): RpcTrackerParams => ({
  chainId: testChainId as ContractsChainId,
  blockFromFutureThreshold: 1000,
  blockLaggingThreshold: 50,
  trackInterval: DEFAULT_FALLBACK_TRACKER_CONFIG.trackInterval,
  checkTimeout: DEFAULT_FALLBACK_TRACKER_CONFIG.checkTimeout,
  cacheTimeout: DEFAULT_FALLBACK_TRACKER_CONFIG.cacheTimeout,
  disableUnusedTrackingTimeout: DEFAULT_FALLBACK_TRACKER_CONFIG.disableUnusedTrackingTimeout,
  setEndpointsThrottle: DEFAULT_FALLBACK_TRACKER_CONFIG.setEndpointsThrottle,
  delay: DEFAULT_FALLBACK_TRACKER_CONFIG.delay,
  failuresBeforeBan: {
    count: (overrides?.failuresBeforeBan?.count ?? DEFAULT_FALLBACK_TRACKER_CONFIG.failuresBeforeBan.count) as number,
    window: (overrides?.failuresBeforeBan?.window ??
      DEFAULT_FALLBACK_TRACKER_CONFIG.failuresBeforeBan.window) as number,
    throttle: (overrides?.failuresBeforeBan?.throttle ??
      DEFAULT_FALLBACK_TRACKER_CONFIG.failuresBeforeBan.throttle) as number,
  },
  networkStatusObserver: overrides?.networkStatusObserver ?? new NetworkStatusObserver(),
  ...(overrides
    ? (() => {
        const { failuresBeforeBan: _, networkStatusObserver: __, ...rest } = overrides;
        return rest;
      })()
    : {}),
});

const createMockRpcCheckResult = (overrides?: Partial<RpcCheckResult>): RpcCheckResult => ({
  responseTime: 100,
  blockNumber: 1000000,
  ...overrides,
});

export const createMockEndpointStats = (
  endpoint: string,
  overrides?: Omit<Partial<EndpointStats<RpcCheckResult>>, "checkResults"> & {
    checkResult?: Partial<CheckResult<RpcCheckResult>>;
  }
): EndpointStats<RpcCheckResult> => {
  const baseCheckResult: CheckResult<RpcCheckResult> = {
    endpoint,
    success: true,
    stats: createMockRpcCheckResult(),
  };

  const checkResult: CheckResult<RpcCheckResult> = overrides?.checkResult
    ? { ...baseCheckResult, ...overrides.checkResult, endpoint }
    : baseCheckResult;

  const { checkResult: _, ...restOverrides } = overrides || {};

  return {
    endpoint,
    banned: undefined,
    failureTimestamps: [],
    failureThrottleTimeout: undefined,
    checkResults: [checkResult],
    ...restOverrides,
  };
};

export const createMockBlockAndAggregateResponse = (
  blockNumber: number,
  sampleFieldValue: bigint
): { result: string } => {
  const dataStoreReturnData = encodeAbiParameters([{ type: "uint256" }], [sampleFieldValue]);

  const blockHash = "0x0000000000000000000000000000000000000000000000000000000000000000";

  const multicallResults = [
    {
      success: true,
      returnData: dataStoreReturnData,
    },
  ];

  const encodedResult = encodeAbiParameters(
    [
      { type: "uint256", name: "blockNumber" },
      { type: "bytes32", name: "blockHash" },
      {
        type: "tuple[]",
        name: "returnData",
        components: [
          { type: "bool", name: "success" },
          { type: "bytes", name: "returnData" },
        ],
      },
    ],
    [BigInt(blockNumber), blockHash as `0x${string}`, multicallResults]
  );

  return { result: encodedResult };
};
