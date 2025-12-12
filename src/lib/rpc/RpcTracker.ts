import orderBy from "lodash/orderBy";
import uniqBy from "lodash/uniqBy";
import { decodeFunctionResult, encodeFunctionData } from "viem";

import { ContractsChainId, isContractsChain } from "config/chains";
import { isDevelopment } from "config/env";
import { getChainName, getProviderNameFromUrl, getRpcProviders, RpcConfig, RpcPurpose } from "config/rpc";
import { getIsLargeAccount } from "domain/stats/isLargeAccount";
import {
  CurrentEndpoints,
  EndpointStats,
  FallbackTracker,
  FallbackTrackerConfig,
} from "lib/FallbackTracker/FallbackTracker";
import { NetworkStatusObserver } from "lib/FallbackTracker/NetworkStatusObserver";
import { getAvgResponseTime, scoreBySpeedAndConsistency, scoreNotBanned } from "lib/FallbackTracker/utils";
import { fetchBlockNumber, fetchEthCall } from "lib/rpc/fetchRpc";
import { abis } from "sdk/abis";
import { getContract } from "sdk/configs/contracts";
import { getMarketsByChainId } from "sdk/configs/markets";
import { HASHED_MARKET_CONFIG_KEYS } from "sdk/prebuilt";

export type RpcTrackerConfig = FallbackTrackerConfig & {
  // Omit RPC if block number is higher than second best block
  blockFromFutureThreshold: number;
  // Omit RPC if block number is lower than highest valid on this value
  blockLaggingThreshold: number;
};

export type RpcTrackerParams = RpcTrackerConfig & {
  chainId: number;
  networkStatusObserver: NetworkStatusObserver;
};

export type RpcCheckResult = {
  responseTime: number;
  blockNumber: number;
};

export type RpcStats = EndpointStats<RpcCheckResult>;

export type CurrentRpcEndpoints = CurrentEndpoints<RpcCheckResult>;

export class RpcTracker {
  providersMap: Record<string, RpcConfig>;
  fallbackTracker: FallbackTracker<RpcCheckResult>;

  constructor(public readonly params: RpcTrackerParams) {
    const chainProviders = this.getChainProviders();

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

    this.fallbackTracker = new FallbackTracker<RpcCheckResult>({
      trackerKey: `RpcTracker.${getChainName(this.params.chainId)}`,
      trackInterval: this.params.trackInterval,
      checkTimeout: this.params.checkTimeout,
      cacheTimeout: this.params.cacheTimeout,
      disableUnusedTrackingTimeout: this.params.disableUnusedTrackingTimeout,
      failuresBeforeBan: this.params.failuresBeforeBan,
      setEndpointsThrottle: this.params.setEndpointsThrottle,
      delay: this.params.delay,
      primary: defaultProvider.url,
      endpoints: chainProviders.map((provider) => provider.url),
      checkEndpoint: this.checkRpc,
      selectNextPrimary: this.selectNextPrimary,
      selectNextFallbacks: this.selectNextFallbacks,
      getEndpointName: getProviderNameFromUrl,
      networkStatusObserver: this.params.networkStatusObserver,
    });
  }

  getChainProviders(): RpcConfig[] {
    return [
      getRpcProviders(this.params.chainId, "default"),
      getRpcProviders(this.params.chainId, "largeAccount"),
      getRpcProviders(this.params.chainId, "fallback"),
      getRpcProviders(this.params.chainId, "express"),
    ]
      .flat()
      .filter((value): value is RpcConfig => value !== undefined);
  }

  get trackerKey() {
    return this.fallbackTracker.trackerKey;
  }

  getIsLargeAccount = () => {
    return getIsLargeAccount();
  };

  getRpcConfig(endpoint: string): RpcConfig | undefined {
    return this.providersMap[endpoint];
  }

  private checkForSkip(endpoint: string): void {
    const rpcConfig = this.getRpcConfig(endpoint);

    if (!rpcConfig?.isPublic && (!this.getIsLargeAccount() || rpcConfig?.purpose !== "largeAccount")) {
      throw new Error("Skip private provider");
    }
  }

  public pickCurrentRpcUrls() {
    return this.fallbackTracker.getCurrentEndpoints();
  }

  public getExpressRpcUrl() {
    const endpointsStats = this.fallbackTracker.getEndpointsStats();

    const filtered = endpointsStats.filter((result) => {
      const purpose = this.getRpcConfig(result.endpoint)?.purpose;
      return purpose === "express" || purpose === "default";
    });

    const ranked = orderBy(
      filtered,
      [
        (result) => {
          const bannedTimestamp = result.banned?.timestamp;
          if (!bannedTimestamp) {
            return -Infinity;
          }
          return bannedTimestamp;
        },
        (result) => {
          const purpose = this.getRpcConfig(result.endpoint)?.purpose;
          return purpose === "express" ? 1 : 0;
        },
      ],
      ["asc", "desc"]
    );

    return ranked[0]?.endpoint ?? this.fallbackTracker.getCurrentEndpoints().primary;
  }

  checkRpc = async (endpoint: string, signal: AbortSignal): Promise<RpcCheckResult> => {
    const chainId = this.params.chainId;
    const isContractChain = isContractsChain(chainId, isDevelopment());

    if (isContractChain) {
      return this.checkRpcForContractChain(endpoint, signal);
    } else {
      return this.checkRpcForSourceChain(endpoint, signal);
    }
  };

  private checkRpcForContractChain = async (endpoint: string, signal: AbortSignal): Promise<RpcCheckResult> => {
    this.checkForSkip(endpoint);

    const chainId = this.params.chainId as ContractsChainId;
    const startTime = Date.now();

    const markets = getMarketsByChainId(chainId);
    const probeMarket = Object.values(markets)[0];
    const probeMarketAddress = probeMarket?.marketTokenAddress;
    const probeFieldKey =
      probeMarketAddress && HASHED_MARKET_CONFIG_KEYS[chainId]?.[probeMarketAddress]?.["minCollateralFactor"];

    if (!probeMarketAddress || !probeFieldKey) {
      throw new Error("Failed to get params for RPC check");
    }

    const response = await fetchEthCall({
      url: endpoint,
      to: getContract(chainId, "Multicall"),
      signal,
      priority: "low",
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

  private checkRpcForSourceChain = async (endpoint: string, signal: AbortSignal): Promise<RpcCheckResult> => {
    this.checkForSkip(endpoint);

    const startTime = Date.now();

    const { blockNumber } = await fetchBlockNumber({
      url: endpoint,
      signal,
      priority: "low",
    });

    const responseTime = Date.now() - startTime;

    return {
      responseTime,
      blockNumber,
    };
  };

  selectNextPrimary = ({ endpointsStats }): string | undefined => {
    const validStats = this.getValidStats(endpointsStats);

    const filtered = validStats.filter((result) => {
      const purpose = this.getRpcConfig(result.endpoint)?.purpose;
      const allowedPurposes = this.getIsLargeAccount() ? ["largeAccount", "default"] : ["default"];
      return purpose && allowedPurposes.includes(purpose as RpcPurpose);
    });

    // Calculate avgResponseTime from filtered stats (only endpoints that can be selected as primary)
    const avgResponseTime = getAvgResponseTime(filtered);
    const purposeOrder: RpcPurpose[] = this.getIsLargeAccount() ? ["largeAccount", "default"] : ["default"];
    const ranked = orderBy(
      filtered,
      [scoreNotBanned, this.byMatchedPurpose(purposeOrder), scoreBySpeedAndConsistency(avgResponseTime)],
      ["desc", "desc", "desc"]
    );

    return ranked[0]?.endpoint;
  };

  selectNextFallbacks = ({
    endpointsStats,
    primary,
  }: {
    endpointsStats: RpcStats[];
    primary: string;
  }): string[] | undefined => {
    const validStats = this.getValidStats(endpointsStats);

    let filtered = validStats.filter((result) => {
      const allowedPurposes = this.getIsLargeAccount() ? ["default", "largeAccount"] : ["default", "fallback"];
      const purpose = this.getRpcConfig(result.endpoint)?.purpose;
      const byPorpose = purpose && allowedPurposes.includes(purpose as RpcPurpose);

      const primaryBlockNumber = endpointsStats.find((result) => result.endpoint === primary)?.checkResults?.[0]?.stats
        ?.blockNumber;
      const currentBlockNumber = result.checkResults?.[0]?.stats?.blockNumber;
      const byBlockNumber = !primaryBlockNumber || (currentBlockNumber && primaryBlockNumber === currentBlockNumber);

      return byPorpose && byBlockNumber;
    });

    if (!getIsLargeAccount()) {
      // for default accounts set alhcemy as afallback manually because we don't test it in tracking
      const firstFallbackStats = endpointsStats.find(
        (result) => result.endpoint !== primary && this.getRpcConfig(result.endpoint)?.purpose === "fallback"
      );

      if (firstFallbackStats) {
        filtered = uniqBy(filtered.concat([firstFallbackStats]), "endpoint");
      }
    }

    const avgResponseTime = getAvgResponseTime(filtered);
    const purposeOrder: RpcPurpose[] = this.getIsLargeAccount() ? ["largeAccount", "default"] : ["default", "fallback"];
    const ranked = orderBy(
      filtered,
      [scoreNotBanned, this.byMatchedPurpose(purposeOrder), scoreBySpeedAndConsistency(avgResponseTime)],
      ["desc", "desc", "desc"]
    );

    return ranked.map((result) => result.endpoint);
  };

  getValidStats = (endpointsStats: RpcStats[]): RpcStats[] => {
    const bestValidBlock = this.getBestValidBlock(endpointsStats);

    let validStats = endpointsStats.filter((result) => {
      const lastCheckResult = result.checkResults?.[0];

      const isSuccess = lastCheckResult?.success;
      const rpcBlockNumber = lastCheckResult?.stats?.blockNumber;

      const isFromFuture =
        bestValidBlock && rpcBlockNumber && rpcBlockNumber - bestValidBlock > this.params.blockFromFutureThreshold;

      const isLagging =
        bestValidBlock && rpcBlockNumber && bestValidBlock - rpcBlockNumber > this.params.blockLaggingThreshold;

      return isSuccess && !isFromFuture && !isLagging;
    });

    if (validStats.length === 0) {
      return endpointsStats;
    }

    return validStats;
  };

  getBestValidBlock = (rpcStats: RpcStats[]): number | undefined => {
    const sorted = orderBy(rpcStats, [(result) => result.checkResults?.[0]?.stats?.blockNumber ?? 0], ["desc"]);

    const mostRecentBlock = sorted[0]?.checkResults?.[0]?.stats?.blockNumber;
    const secondRecentBlock = sorted[1]?.checkResults?.[0]?.stats?.blockNumber;

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

  byMatchedPurpose = (purposes: RpcPurpose[]): ((stats: EndpointStats<any>) => number) => {
    return (stats) => {
      const purpose = this.getRpcConfig(stats.endpoint)?.purpose;

      const reversedPurposes = [...purposes].reverse();
      for (const [index, filterPurpose] of reversedPurposes.entries()) {
        if (purpose === filterPurpose) {
          return index + 1;
        }
      }

      return 0;
    };
  };
}
