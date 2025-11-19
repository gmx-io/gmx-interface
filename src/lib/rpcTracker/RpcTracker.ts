import maxBy from "lodash/maxBy";
import orderBy from "lodash/orderBy";
import { decodeFunctionResult, encodeFunctionData } from "viem";
import { differenceInMilliseconds } from "date-fns";

import { ARBITRUM, ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { getRpcProviderKey } from "config/localStorage";
import { getRpcProviders, RpcConfig } from "config/rpc";
import { getIsLargeAccount } from "domain/stats/isLargeAccount";
import { devtools, isDebugMode } from "lib/devtools";
import { RpcFailureCounter, RpcTrackerRankingCounter } from "lib/metrics";
import { emitMetricCounter } from "lib/metrics/emitMetricEvent";
import { fetchEthCall } from "lib/rpc/fetchEthCall";
import { getProviderNameFromUrl } from "lib/rpc/getProviderNameFromUrl";
import { ProbeData, RpcProviderState, RpcTrackerConfig, RpcTrackerState } from "lib/rpcTracker/types";
import { sleep } from "lib/sleep";
import { abis } from "sdk/abis";
import { getMarketsByChainId } from "sdk/configs/markets";
import { HASHED_MARKET_CONFIG_KEYS } from "sdk/prebuilt";

const RPC_TRACKER_UPDATE_EVENT = "rpc-tracker-update-event";

export const DEFAULT_RPC_TRACKER_CONFIG: RpcTrackerConfig = {
  chainId: ARBITRUM,
  probeTimeout: 10 * 1000, // 10 seconds / Frequency of RPC probing
  probeFailTimeout: 10 * 1000, // 10 seconds / Abort RPC probe if it takes longer
  storageExpireTimeout: 5 * 60 * 1000, // 5 minutes
  disableUnusedTrackingTimeout: 1 * 60 * 1000, // 1 minute / Pause probing if no requests for the best RPC for this time
  blockFromFutureThreshold: 1000, // Omit RPC if block number is higher than average on this value
  blockLaggingThreshold: 50, // Omit RPC if block number is lower than highest valid on this value
  banTimeout: 30 * 1000, // 30 seconds - time after which banned RPC can be used again
  maxStoredProbeStats: 1,
};

export class RpcTracker {
  state: RpcTrackerState;

  get chainId(): number {
    return this.config.chainId;
  }

  getIsDebugMode() {
    return isDebugMode();
  }

  getIsLargeAccount() {
    return getIsLargeAccount();
  }

  getBannedTimestamp(url: string) {
    return this.state.providers[url]?.bannedTimestamp;
  }

  getLastProbeStats() {
    return this.state.probeStats[0];
  }

  getRpcResultFromLastProbeStats(url: string) {
    const lastProbeStats = this.getLastProbeStats();

    return lastProbeStats?.probeResults[url] ?? undefined;
  }

  getRpcStorageKey() {
    return JSON.stringify(getRpcProviderKey(this.chainId));
  }

  getStoredRpc(): { rpcUrl: string; timestamp: number } | undefined {
    try {
      const cached = localStorage.getItem(this.getRpcStorageKey());
      const { rpcUrl, timestamp } = cached ? JSON.parse(cached) : {};

      if (
        rpcUrl &&
        this.state.providers[rpcUrl] &&
        timestamp &&
        Date.now() - timestamp < this.config.storageExpireTimeout
      ) {
        return { rpcUrl, timestamp };
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  setStoredRpc({ rpcUrl }: { rpcUrl: string }) {
    localStorage.setItem(this.getRpcStorageKey(), JSON.stringify({ rpcUrl, timestamp: Date.now() }));
  }

  constructor(public readonly config: RpcTrackerConfig = DEFAULT_RPC_TRACKER_CONFIG) {
    this.initTrackerState();
  }

  initTrackerState() {
    const chainProviders = [
      getRpcProviders(this.chainId, "default"),
      getRpcProviders(this.chainId, "fallback"),
      getRpcProviders(this.chainId, "largeAccount"),
    ]
      .filter((value): value is RpcConfig[] => value !== undefined)
      .flat()
      .reduce(
        (acc, provider) => {
          acc[provider.url] = provider;
          return acc;
        },
        {} as Record<string, RpcConfig>
      );

    this.state = {
      lastUsage: null,
      probeStats: [],
      bestPrimaryUrl: "",
      bestSecondaryUrl: "",
      trackerTimeoutId: null,
      providers: chainProviders,
    };

    if (Object.keys(this.state.providers).length === 0) {
      throw new Error(`No providers for chainId: ${this.chainId}`);
    }

    let primaryRpcUrl: string | undefined;
    let secondaryRpcUrl: string | undefined;

    const bestProviders = this.selectBestProviders();

    primaryRpcUrl = bestProviders.primary;
    secondaryRpcUrl = bestProviders.secondary;

    const cached = this.getStoredRpc();

    if (cached) {
      primaryRpcUrl = cached.rpcUrl;
    }

    if (primaryRpcUrl === secondaryRpcUrl) {
      secondaryRpcUrl = bestProviders.secondary;
    }

    if (!primaryRpcUrl) {
      throw new Error(`No default primary provider for chainId: ${this.chainId}`);
    }

    if (!secondaryRpcUrl) {
      throw new Error(`No default secondary provider for chainId: ${this.chainId}`);
    }

    this.setCurrentProviders({ primary: primaryRpcUrl, secondary: secondaryRpcUrl });
  }

  getCurrentRpcUrls() {
    this.state.lastUsage = new Date();

    const primary = this.state.bestPrimaryUrl;
    const secondary = this.state.bestSecondaryUrl;

    return {
      primary,
      secondary,
    };
  }

  banProvider(url: string, reason: string) {
    this.state.providers[url].bannedTimestamp = Date.now();

    // TODO: log counters hehe.
    emitMetricCounter<RpcFailureCounter>({
      event: "rpcTracker.provider.failed",
      data: {
        rpcProvider: getProviderNameFromUrl(url),
        reason,
      },
    });

    const { primary, secondary } = this.selectBestProviders();

    if (primary && secondary) {
      this.setCurrentProviders({ primary, secondary });
    }
  }

  selectBestProviders(keep: { primaryUrl?: string; secondaryUrl?: string } = {}) {
    let primary: string | undefined;
    let secondary: string | undefined;

    const providers = this.rankProviders();

    if (getIsLargeAccount()) {
      const primaryProviders = keep.secondaryUrl ? providers.filter((p) => p.url !== keep.secondaryUrl) : providers;

      primary =
        keep.primaryUrl ??
        this.selectProviderUrl(primaryProviders, { purpose: "largeAccount", allowBanned: false, isValid: true }) ??
        this.selectProviderUrl(primaryProviders, { purpose: "default", allowBanned: false, isValid: true }) ??
        this.selectProviderUrl(primaryProviders, { purpose: "default" });

      const secondaryProviders = providers.filter((p) => p.url !== primary);

      secondary =
        keep.secondaryUrl ??
        this.selectProviderUrl(secondaryProviders, { purpose: "default", allowBanned: false, isValid: true }) ??
        this.selectProviderUrl(secondaryProviders, { purpose: "default", isValid: true }) ??
        this.selectProviderUrl(secondaryProviders, {});
    } else {
      const primaryProviders = keep.secondaryUrl ? providers.filter((p) => p.url !== keep.secondaryUrl) : providers;

      primary =
        keep.primaryUrl ??
        this.selectProviderUrl(primaryProviders, { purpose: "default", allowBanned: false, isValid: true }) ??
        this.selectProviderUrl(primaryProviders, { purpose: "default", isValid: true }) ??
        this.selectProviderUrl(primaryProviders, { purpose: "default" });

      const secondaryProviders = providers.filter((p) => p.url !== primary);

      secondary =
        keep.secondaryUrl ??
        this.selectProviderUrl(secondaryProviders, { purpose: "fallback", allowBanned: false, isValid: true }) ??
        this.selectProviderUrl(secondaryProviders, { purpose: "default", isValid: true }) ??
        this.selectProviderUrl(secondaryProviders, { purpose: "default" });
    }

    return { primary, secondary };
  }

  rankProviders() {
    const providers = Object.values(this.state.providers);

    const scoredProviders = orderBy(
      providers,
      [
        // Not banned providers first
        (p) => {
          const bannedTimestamp = this.getBannedTimestamp(p.url);

          if (!bannedTimestamp) {
            return -Infinity;
          }

          return bannedTimestamp;
        },
        // Fast responses first
        (p) => {
          const lastProbeResult = this.getRpcResultFromLastProbeStats(p.url);

          if (!lastProbeResult || !lastProbeResult.isValid || lastProbeResult.responseTime === null) {
            return Infinity;
          }

          return lastProbeResult.responseTime;
        },
      ],
      ["asc", "asc"]
    );

    return scoredProviders;
  }

  selectProviderUrl(
    providers: RpcProviderState[],
    {
      purpose,
      isPublic,
      allowBanned,
      isValid,
    }: {
      purpose?: "largeAccount" | "default" | "fallback";
      isPublic?: boolean;
      allowBanned?: boolean;
      isValid?: boolean;
    }
  ) {
    return providers.find((p) => {
      const byPurpose = !purpose || p.purpose === purpose;
      const byIsPublic = isPublic === undefined || p.isPublic === isPublic;
      const byIsValid = isValid === undefined || this.getRpcResultFromLastProbeStats(p.url)?.isValid === isValid;

      const bannedTimestamp = this.getBannedTimestamp(p.url);
      const byBanned = allowBanned || !bannedTimestamp || Date.now() - bannedTimestamp < this.config.banTimeout;

      return byPurpose && byIsPublic && byBanned && byIsValid;
    })?.url;
  }

  setProbeResults({ probeResults, probeTimestamp }: { probeResults: ProbeData[]; probeTimestamp: number }) {
    const probeResultsMap = probeResults.reduce(
      (acc, probe) => {
        acc[probe.url] = probe;
        return acc;
      },
      {} as Record<string, ProbeData>
    );

    const maxBlockNumber = maxBy(probeResults, "blockNumber")?.blockNumber ?? null;

    this.state.probeStats.unshift({
      probeResults: probeResultsMap,
      timestamp: probeTimestamp,
      maxBlockNumber,
    });

    if (this.state.probeStats.length > this.config.maxStoredProbeStats) {
      this.state.probeStats.pop();
    }
  }

  track({ warmUp = false } = {}) {
    if (!this.getIsTrackEnabled(warmUp)) {
      return;
    }

    this.probeProviders()
      .then(() => {
        const bestProviders = this.selectBestProviders();

        if (bestProviders.primary && bestProviders.secondary) {
          this.setCurrentProviders({
            primary: bestProviders.primary,
            secondary: bestProviders.secondary,
          });
        }

        devtools.debugRpcTrackerState({
          chainId: this.chainId,
          lastProbeStats: this.getLastProbeStats(),
          providers: this.state.providers,
          bestPrimaryUrl: this.state.bestPrimaryUrl,
          bestSecondaryUrl: this.state.bestSecondaryUrl,
          getBannedTimestamp: (url: string) => this.getBannedTimestamp(url),
        });
      })
      .finally(() => {
        if (this.state.trackerTimeoutId) {
          clearTimeout(this.state.trackerTimeoutId);
        }

        this.state.trackerTimeoutId = window.setTimeout(() => this.track(), this.config.probeTimeout) as any;
      });
  }

  setCurrentProviders({ primary, secondary }: { primary: string; secondary: string }) {
    this.state.bestPrimaryUrl = primary;
    this.state.bestSecondaryUrl = secondary;

    this.setStoredRpc({ rpcUrl: this.state.bestPrimaryUrl });

    const lastProbeStats = this.getLastProbeStats();
    const primaryBlockNumber = this.getRpcResultFromLastProbeStats(this.state.bestPrimaryUrl)?.blockNumber;

    const primaryBlockGap =
      primaryBlockNumber && lastProbeStats?.maxBlockNumber
        ? primaryBlockNumber - lastProbeStats?.maxBlockNumber
        : undefined;

    const secondaryBlockNumber = this.getRpcResultFromLastProbeStats(this.state.bestSecondaryUrl)?.blockNumber;

    const secondaryBlockGap =
      secondaryBlockNumber && lastProbeStats?.maxBlockNumber
        ? secondaryBlockNumber - lastProbeStats?.maxBlockNumber
        : undefined;

    window.dispatchEvent(
      new CustomEvent(RPC_TRACKER_UPDATE_EVENT, {
        detail: { chainId: this.chainId },
      })
    );

    emitMetricCounter<RpcTrackerRankingCounter>({
      event: "rpcTracker.ranking.setBestRpc",
      data: {
        chainId: this.chainId,
        primaryRpc: getProviderNameFromUrl(this.state.bestPrimaryUrl),
        primaryBlockGap: primaryBlockGap ?? "unknown",
        secondaryRpc: getProviderNameFromUrl(this.state.bestSecondaryUrl),
        secondaryBlockGap: secondaryBlockGap ?? "unknown",
        isLargeAccount: this.getIsLargeAccount(),
      },
    });
  }

  getIsTrackEnabled(warmUp: boolean) {
    const { providers, lastUsage } = this.state;

    const hasMultipleProviders = Object.keys(providers).length > 1;

    const isUnusedChain =
      !lastUsage || differenceInMilliseconds(Date.now(), lastUsage) > this.config.disableUnusedTrackingTimeout;

    return hasMultipleProviders && (warmUp || !isUnusedChain);
  }

  async probeProviders() {
    const probeTimestamp = Date.now();

    const probeResults = await Promise.all(
      Object.values(this.state.providers)
        .filter((provider) => {
          const shouldSkip = !this.getIsLargeAccount() && provider.isPublic === false;

          return !shouldSkip;
        })
        .map((provider) => {
          return this.probeProvider(provider);
        })
    );

    const processedProbeResults = this.processProbeResults(probeResults);

    this.setProbeResults({ probeResults: processedProbeResults, probeTimestamp });
  }

  async probeProvider(providerData: RpcProviderState): Promise<ProbeData> {
    const { url } = providerData;
    const chainId = this.chainId as ContractsChainId;
    const controller = new AbortController();
    const startTime = Date.now();

    return await Promise.race([
      sleep(this.config.probeFailTimeout).then(() => {
        controller.abort();
        throw new Error("Probe timeout");
      }),
      (async () => {
        let blockNumber: number | null = null;
        let responseTime: number | null = null;
        let isValid = false;

        try {
          const dataStoreAddress = getContract(chainId, "DataStore");
          const multicallAddress = getContract(chainId, "Multicall");

          const probeMarketAddress = Object.values(getMarketsByChainId(chainId))[0].marketTokenAddress;
          const probeFieldKey = HASHED_MARKET_CONFIG_KEYS[chainId]?.[probeMarketAddress]?.["minCollateralFactor"];

          if (!dataStoreAddress || !multicallAddress || !probeMarketAddress || !probeFieldKey) {
            throw new Error("Failed to get RPC probe request data");
          }

          const dataStoreData = encodeFunctionData({
            abi: abis.DataStore,
            functionName: "getUint",
            args: [probeFieldKey],
          });

          const multicallData = encodeFunctionData({
            abi: abis.Multicall,
            functionName: "blockAndAggregate",
            args: [[{ target: dataStoreAddress, callData: dataStoreData }]],
          });

          const response = await fetchEthCall({
            url,
            to: multicallAddress,
            callData: multicallData,
            signal: controller.signal,
          });

          responseTime = Date.now() - startTime;

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

          blockNumber = Number(_blockNumber);

          isValid = typeof sampleFieldValue === "bigint" && sampleFieldValue > 0n;
        } catch (error: any) {
          if (error.name !== "AbortError") {
            throw error;
          }
        }

        return {
          url,
          responseTime,
          blockNumber,
          timestamp: new Date(),
          isValid,
        };
      })(),
    ]).catch(() => {
      // TODO: metric error
      return {
        url,
        timestamp: new Date(),
        isValid: false,
        responseTime: null,
        blockNumber: null,
      };
    });
  }

  processProbeResults(probeResults: ProbeData[]) {
    const probeResultsByBlockNumber = orderBy(probeResults, ["blockNumber"], ["desc"]);

    let bestBlockNumberProbe = probeResultsByBlockNumber[0];
    const secondBlockNumberProbe = probeResultsByBlockNumber[1];

    if (!bestBlockNumberProbe) {
      return probeResults;
    }

    // Filter out probes that returned block number that is too far in the future (Rare case)
    if (
      bestBlockNumberProbe.blockNumber &&
      secondBlockNumberProbe?.blockNumber &&
      bestBlockNumberProbe.blockNumber - secondBlockNumberProbe.blockNumber > this.config.blockFromFutureThreshold
    ) {
      bestBlockNumberProbe.isValid = false;
      bestBlockNumberProbe = secondBlockNumberProbe;
    }

    // Filter out probes that returned block number that is too far in the past
    const result = probeResults.map((probe) => {
      const bestBlockNumber = bestBlockNumberProbe.blockNumber;
      const currProbeBlockNumber = probe.blockNumber;

      if (
        probe.isValid &&
        bestBlockNumber &&
        currProbeBlockNumber &&
        bestBlockNumber - currProbeBlockNumber > this.config.blockLaggingThreshold
      ) {
        probe.isValid = false;
      }

      return probe;
    });

    return result;
  }
}
