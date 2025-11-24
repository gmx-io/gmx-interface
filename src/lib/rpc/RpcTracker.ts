import orderBy from "lodash/orderBy";
import { decodeFunctionResult, encodeFunctionData } from "viem";

import { ContractsChainId, getChainName, getRpcProviders, RpcConfig, RpcPurpose } from "config/rpc";
import { DEFAULT_FALLBACK_CONFIG, FallbackTracker, EndpointStats } from "lib/FallbackTracker";
import { fetchEthCall } from "lib/rpc/fetchEthCall";
import { abis } from "sdk/abis";
import { getContract } from "sdk/configs/contracts";
import { getMarketsByChainId } from "sdk/configs/markets";
import { HASHED_MARKET_CONFIG_KEYS } from "sdk/prebuilt";

import { devtools } from "./_debug";

// Default configuration for RpcTracker (partial - requires chainId and providers)
export const DEFAULT_RPC_TRACKER_CONFIG = {
  blockFromFutureThreshold: 1000,
  blockLaggingThreshold: 50,
};

type RpcTrackerParams = {
  chainId: ContractsChainId;
  /** Omit RPC if block number is higher than average on this value */
  blockFromFutureThreshold: number;
  /** Omit RPC if block number is lower than highest valid on this value */
  blockLaggingThreshold: number;
};

export type RpcCheckResult = {
  responseTime: number | undefined;
  blockNumber: number | undefined;
};

type RpcStats = EndpointStats<RpcCheckResult>;

export class RpcTracker {
  providersMap: Record<string, RpcConfig>;
  fallbackTracker: FallbackTracker<RpcCheckResult>;
  getIsLargeAccount = () => {
    return false;
  };
  getRpcConfig(endpoint: string): RpcConfig | undefined {
    return this.providersMap[endpoint];
  }

  constructor(public readonly params: RpcTrackerParams) {
    const chainProviders = [
      getRpcProviders(this.params.chainId, "default"),
      getRpcProviders(this.params.chainId, "largeAccount"),
      getRpcProviders(this.params.chainId, "fallback"),
      getRpcProviders(this.params.chainId, "express"),
    ]
      .flat()
      .filter((value): value is RpcConfig => value !== undefined);

    if (chainProviders.length === 0) {
      throw new Error(`No RPC providers found for chainId: ${this.params.chainId}`);
    }

    this.providersMap = chainProviders.reduce(
      (acc, provider) => {
        acc[provider.url] = provider;
        return acc;
      },
      {} as Record<string, RpcConfig>
    );

    const defaultProvider = chainProviders[0];
    const secondaryProvider = chainProviders[1] || defaultProvider;

    this.fallbackTracker = new FallbackTracker<RpcCheckResult>({
      ...DEFAULT_FALLBACK_CONFIG,
      trackerKey: `RpcTracker:${getChainName(this.params.chainId)}`,
      primary: defaultProvider.url,
      secondary: secondaryProvider.url,
      endpoints: chainProviders.map((provider) => provider.url),
      checkEndpoint: this.probeProvider,
      selectNextPrimary: this.selectNextPrimary,
      selectNextSecondary: this.selectNextSecondary,
      onUpdate: () => {
        devtools.debugRpcTrackerState(this);
      },
    });
  }

  public pickCurrentRpcUrls() {
    const primary = this.fallbackTracker.pickPrimaryEndpoint();
    const secondary = this.fallbackTracker.pickSecondaryEndpoint();

    return {
      primary,
      secondary,
    };
  }

  public getExpressRpcUrl() {
    const endpoints = this.fallbackTracker.getEndpoints();

    const expressEndpoint = endpoints.find((endpoint) => this.providersMap[endpoint].purpose === "express");

    if (expressEndpoint) {
      return expressEndpoint;
    }

    return endpoints[0];
  }

  public triggerFailure(endpoint: string) {
    this.fallbackTracker.triggerFailure(endpoint);
  }

  public banEndpoint(endpoint: string, reason: string) {
    this.fallbackTracker.banEndpoint(endpoint, reason);
  }

  probeProvider = async (endpoint: string, signal: AbortSignal): Promise<RpcCheckResult> => {
    const rpcConfig = this.providersMap[endpoint];

    if (!rpcConfig.isPublic && !this.getIsLargeAccount()) {
      throw new Error("Skip private provider for non large account");
    }

    const chainId = this.params.chainId;
    const startTime = Date.now();

    const probeMarketAddress = Object.values(getMarketsByChainId(chainId))[0].marketTokenAddress;
    const probeFieldKey = HASHED_MARKET_CONFIG_KEYS[chainId]?.[probeMarketAddress]?.["minCollateralFactor"];

    if (!probeMarketAddress || !probeFieldKey) {
      throw new Error("Failed to get params for RPC check");
    }

    const response = await fetchEthCall({
      url: endpoint,
      to: getContract(chainId, "Multicall"),
      signal,
      callData: encodeFunctionData({
        abi: abis.Multicall,
        functionName: "blockAndAggregate",
        args: [
          [
            {
              target: getContract(chainId, "DataStore"),
              callData: encodeFunctionData({
                abi: abis.DataStore,
                functionName: "getUint",
                args: [probeFieldKey],
              }),
            },
          ],
        ],
      }),
    });

    const responseTime = Date.now() - startTime;

    const [_blockNumber, _, multicallResult] = decodeFunctionResult({
      abi: abis.Multicall,
      functionName: "blockAndAggregate",
      data: response.result,
    });

    const sampleFieldValue = decodeFunctionResult({
      abi: abis.DataStore,
      functionName: "getUint",
      data: multicallResult[0].returnData,
    });

    const blockNumber = Number(_blockNumber);

    const isValid = typeof sampleFieldValue === "bigint" && sampleFieldValue > 0n;

    if (!isValid) {
      throw new Error("Failed to get RPC probe request data");
    }

    return {
      responseTime,
      blockNumber,
    };
  };

  selectNextPrimary = ({ endpointsStats }): string | undefined => {
    const validStats = this.getValidStats(endpointsStats);

    const filter = (result) => {
      const purpose = this.getRpcConfig(result.endpoint)?.purpose;
      const allowedPurposes: RpcPurpose[] = this.getIsLargeAccount() ? ["largeAccount", "default"] : ["default"];
      return purpose && allowedPurposes.includes(purpose as RpcPurpose);
    };

    let allowedStats = validStats.filter(filter);

    if (allowedStats.length === 0) {
      allowedStats = endpointsStats.filter(filter);
    }

    const rankedFprPrimary = orderBy(
      allowedStats,
      [
        (result) => {
          const preferredPurpose = this.getIsLargeAccount() ? "largeAccount" : "default";
          const purpose = this.providersMap[result.endpoint].purpose;
          return preferredPurpose === purpose ? 0 : 1;
        },
        (result) => {
          const bannedTimestamp = result.banned?.timestamp;
          if (!bannedTimestamp) {
            return -Infinity;
          }
          return bannedTimestamp;
        },
        (result) => result.checkResult?.stats?.responseTime ?? Infinity,
      ],
      ["asc", "asc", "asc"]
    );

    return rankedFprPrimary[0]?.endpoint;
  };

  selectNextSecondary = ({ endpointsStats }): string | undefined => {
    const validStats = this.getValidStats(endpointsStats);

    const filter = (result) => {
      const purpose = this.getRpcConfig(result.endpoint)?.purpose;
      const allowedPurposes: RpcPurpose[] = this.getIsLargeAccount()
        ? ["largeAccount", "default"]
        : ["default", "fallback"];
      return purpose && allowedPurposes.includes(purpose as RpcPurpose);
    };

    let allowedStats = validStats.filter(filter);

    if (allowedStats.length === 0) {
      allowedStats = endpointsStats.filter(filter);
    }

    const rankedFprSecondary = orderBy(
      allowedStats,
      [
        (result) => {
          const preferredPurpose = this.getIsLargeAccount() ? "default" : "fallback";
          const purpose = this.providersMap[result.endpoint].purpose;
          return preferredPurpose === purpose ? 0 : 1;
        },
        (result) => {
          const bannedTimestamp = result.banned?.timestamp;
          if (!bannedTimestamp) {
            return -Infinity;
          }
          return bannedTimestamp;
        },
        (result) => result.checkResult?.stats?.responseTime ?? Infinity,
      ],
      ["asc", "asc", "asc"]
    );

    return rankedFprSecondary[0]?.endpoint;
  };

  getValidStats = (endpointsStats: RpcStats[]): RpcStats[] => {
    const bestValidBlock = this.getBestValidBlock(endpointsStats);

    let validStats = endpointsStats.filter((result) => {
      const isSuccess = result.checkResult?.success;

      const rpcBlockNumber = result.checkResult?.stats?.blockNumber;

      const isFromFuture =
        bestValidBlock && rpcBlockNumber && rpcBlockNumber - bestValidBlock > this.params.blockFromFutureThreshold;

      const isLagging =
        bestValidBlock && rpcBlockNumber && bestValidBlock - rpcBlockNumber > this.params.blockLaggingThreshold;

      return isSuccess && !isFromFuture && !isLagging;
    });

    return validStats;
  };

  getBestValidBlock = (rpcStats: RpcStats[]): number | undefined => {
    const sorted = orderBy(rpcStats, [(result) => result.checkResult?.stats?.blockNumber ?? 0], ["desc"]);

    const mostRecentBlock = sorted[0]?.checkResult?.stats?.blockNumber;
    const secondRecentBlock = sorted[1]?.checkResult?.stats?.blockNumber;

    if (typeof mostRecentBlock !== "number") {
      return undefined;
    }

    if (typeof secondRecentBlock !== "number") {
      return mostRecentBlock;
    }

    return mostRecentBlock - secondRecentBlock > this.params.blockFromFutureThreshold
      ? secondRecentBlock
      : mostRecentBlock;
  };
}
