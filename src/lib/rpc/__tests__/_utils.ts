import { encodeAbiParameters } from "viem";

import type { RpcConfig } from "config/rpc";
import type { CheckResult, EndpointStats } from "lib/FallbackTracker";
import type { ContractsChainId } from "sdk/configs/chains";
import { ARBITRUM } from "sdk/configs/chains";

import type { RpcCheckResult } from "../RpcTracker";

export const testChainId = ARBITRUM;

export const testRpcConfigs: RpcConfig[] = [
  {
    url: "https://primary-rpc.com",
    isPublic: true,
    purpose: "default",
  },
  {
    url: "https://secondary-rpc.com",
    isPublic: true,
    purpose: "default",
  },
  {
    url: "https://fallback-rpc.com",
    isPublic: false,
    purpose: "fallback",
  },
  {
    url: "https://large-account-rpc.com",
    isPublic: false,
    purpose: "largeAccount",
  },
  {
    url: "https://express-rpc.com",
    isPublic: false,
    purpose: "express",
  },
];

export const createMockRpcTrackerParams = (overrides?: {
  chainId?: ContractsChainId;
  blockFromFutureThreshold?: number;
  blockLaggingThreshold?: number;
}) => ({
  chainId: testChainId as ContractsChainId,
  blockFromFutureThreshold: 1000,
  blockLaggingThreshold: 50,
  ...overrides,
});

export const createMockRpcCheckResult = (overrides?: Partial<RpcCheckResult>): RpcCheckResult => ({
  responseTime: 100,
  blockNumber: 1000000,
  ...overrides,
});

export const createMockEndpointStats = (
  endpoint: string,
  overrides?: Omit<Partial<EndpointStats<RpcCheckResult>>, "checkResult"> & {
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
    failureDebounceTimeout: undefined,
    checkResult,
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
