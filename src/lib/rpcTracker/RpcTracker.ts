import { differenceInMilliseconds } from "date-fns";
import maxBy from "lodash/maxBy";
import orderBy from "lodash/orderBy";
import { decodeFunctionResult, encodeFunctionData } from "viem";

import {
  AnyChainId,
  CONTRACTS_CHAIN_IDS,
  ContractsChainId,
  getChainName,
  getRandomOrDefaultRpcUrl,
  getRpcProviders,
} from "config/chains";
import { getContract } from "config/contracts";
import { getRpcProviderKey } from "config/localStorage";
import { getIsLargeAccount } from "domain/stats/isLargeAccount";
import { RpcTrackerRankingCounter } from "lib/metrics";
import { emitMetricCounter } from "lib/metrics/emitMetricEvent";
import { RpcFailureCounter } from "lib/metrics/types";
import { getProviderNameFromUrl } from "lib/rpc/getProviderNameFromUrl";
import { sleep } from "lib/sleep";
import { abis } from "sdk/abis";
import { getMarketsByChainId } from "sdk/configs/markets";
import { HASHED_MARKET_CONFIG_KEYS } from "sdk/prebuilt";
import { IDevtools } from "sdk/utils/devtools";
import { IStorage } from "sdk/utils/storage";
import { ITimers } from "sdk/utils/timers";

import { ProbeData, ProbeResults, ProviderData, RpcTrackerConfig, RpcTrackerState } from "./types";

const RPC_TRACKER_UPDATE_EVENT = "rpc-tracker-update-event";

// DataStore field used for probing
const PROBE_SAMPLE_FIELD = "minCollateralFactor";

class LocalStorage implements IStorage {
  getItem(key: string) {
    return localStorage.getItem(key);
  }

  setItem(key: string, value: string) {
    localStorage.setItem(key, value);
  }

  getItemJson<T>(key: string): T | null {
    return localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key)!) : null;
  }

  setItemJson<T>(key: string, value: T) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

class LocalDevtools implements IDevtools {
  isDebugMode = true;
}

class LocalTimers implements ITimers {
  setTimeout = window.setTimeout;
  clearTimeout = window.clearTimeout;
}

export class RpcTracker {
  storage: IStorage = new LocalStorage();
  devtools: IDevtools = new LocalDevtools();
  timers: ITimers = new LocalTimers();

  config: RpcTrackerConfig = {
    probeTimeout: 10 * 1000, // 10 seconds / Frequency of RPC probing
    probeFailTimeout: 10 * 1000, // 10 seconds / Abort RPC probe if it takes longer
    storageExpireTimeout: 5 * 60 * 1000,
    disableUnusedTrackingTimeout: 1 * 60 * 1000, // 1 minute / Pause probing if no requests for the best RPC for this time
    blockFromFutureThreshold: 1000, // Omit RPC if block number is higher than average on this value
    blockLaggingThreshold: 50, // Omit RPC if block number is lower than highest valid on this value
    banTimeout: 30 * 1000, // 30 seconds - time after which banned RPC can be used again
  };

  trackerState: RpcTrackerState;
  trackerTimeoutId: number | null;

  constructor() {
    this.trackerState = this.initTrackerState();
    this.trackerTimeoutId = null;
  }

  setLastProbeStats(chainId: number, probeResults: ProbeResults) {
    this.trackerState[chainId].lastProbeStats = {
      probeStats: probeResults.probeStats,
      validProbesStats: probeResults.validProbesStats,
      timestamp: Date.now(),
    };
  }

  trackRpcProviders({ warmUp = false } = {}) {
    Promise.all(
      Object.values(this.trackerState).map(async (chainTrackerState) => {
        const { providers, lastUsage, chainId } = chainTrackerState;
        const hasMultipleProviders = Object.keys(providers).length > 1;

        const isUnusedChain =
          !lastUsage || differenceInMilliseconds(Date.now(), lastUsage) > this.config.disableUnusedTrackingTimeout;
        const isChainTrackingEnabled = (warmUp || !isUnusedChain) && hasMultipleProviders;

        if (!isChainTrackingEnabled) {
          return;
        }

        const nextProviderUrls = await this.getBestRpcProvidersForChain(chainTrackerState);
        this.setCurrentProviders(chainId, nextProviderUrls);
      })
    ).finally(() => {
      if (this.trackerTimeoutId) {
        this.timers.clearTimeout(this.trackerTimeoutId);
      }

      this.trackerTimeoutId = this.timers.setTimeout(() => this.trackRpcProviders(), this.config.probeTimeout);
    });
  }

  async probeProviders(chainId: ContractsChainId, providers: ProviderData[]) {
    const probeResults = await Promise.all(
      providers.map((providerInfo) => {
        const shouldSkip = !getIsLargeAccount() && !providerInfo.isPublic;
        return this.probeRpc(chainId, providerInfo.url, providerInfo.isPublic, shouldSkip);
      })
    );

    const successProbeResults = probeResults.filter((probe) => probe.isSuccess);

    if (!successProbeResults.length) {
      throw new Error("no-success-probes");
    }

    const probeResultsByBlockNumber = orderBy(successProbeResults, ["blockNumber"], ["desc"]);
    let bestBlockNumberProbe = probeResultsByBlockNumber[0];
    const secondBlockNumberProbe = probeResultsByBlockNumber[1];

    if (
      bestBlockNumberProbe?.blockNumber &&
      secondBlockNumberProbe?.blockNumber &&
      bestBlockNumberProbe.blockNumber - secondBlockNumberProbe.blockNumber > this.config.blockFromFutureThreshold
    ) {
      bestBlockNumberProbe.isSuccess = false;
      bestBlockNumberProbe = secondBlockNumberProbe;
    }

    const probeStats = probeResultsByBlockNumber.map((probe) => {
      let isValid = probe.isSuccess;
      const bestBlockNumber = bestBlockNumberProbe.blockNumber;
      const currProbeBlockNumber = probe.blockNumber;

      if (
        !probe.isSkipped &&
        bestBlockNumber &&
        currProbeBlockNumber &&
        bestBlockNumber - currProbeBlockNumber > this.config.blockLaggingThreshold
      ) {
        isValid = false;
      }

      return {
        ...probe,
        isValid,
      };
    });

    const validProbesStats = probeStats.filter((probe) => probe.isValid);

    return {
      probeStats,
      validProbesStats,
    };
  }

  rankProbes(
    chainId: number,
    { probes, preferPublic, excludeUrl }: { probes: ProbeData[]; preferPublic: boolean; excludeUrl?: string }
  ) {
    const sortedProbes = orderBy(
      probes,
      [
        (probe) => (probe.url !== excludeUrl ? 0 : 1),
        // Not banned probes first, then by banned timestamp
        (probe) => (!this.isRpcBanned(chainId, probe.url) ? -Infinity : this.getBannedTimestamp(chainId, probe.url)),
        // Preferred type (public/private) next
        (probe) => (probe.isPublic === preferPublic ? 0 : 1),
        // Fast responses last
        "responseTime",
      ],
      ["asc", "asc", "asc", "asc"]
    );

    return {
      bestProbeUrl: sortedProbes[0]?.url ?? getRandomOrDefaultRpcUrl(chainId, { isPublic: preferPublic }),
      sortedProbes,
    };
  }

  async getBestRpcProvidersForChain(
    { providers, chainId, lastProbeStats, currentPrimaryUrl, currentSecondaryUrl }: RpcTrackerState[number],
    {
      keepExisting,
    }: {
      keepExisting?: "primary" | "secondary";
    } = {}
  ) {
    try {
      let probeResults: ProbeResults | undefined = undefined;

      // Try to use cached probe results
      if (
        lastProbeStats &&
        Date.now() - lastProbeStats.timestamp < this.config.probeTimeout &&
        lastProbeStats.validProbesStats.length > 0
      ) {
        probeResults = lastProbeStats;
      } else {
        // Do new probe if can't use cached results
        const providersList = Object.values(providers);
        probeResults = await this.probeProviders(chainId, providersList);

        this.setLastProbeStats(chainId, probeResults);
      }

      if (!probeResults) {
        throw new Error("error-getting-probe-results");
      }

      // For primary URL: prefer private for large accounts, public for others
      const preferPrimaryPublic = !getIsLargeAccount();

      const primaryRankResult = this.rankProbes(chainId, {
        probes: probeResults.validProbesStats,
        preferPublic: preferPrimaryPublic,
        // Avoid using the same URL for primary and secondary
        excludeUrl: keepExisting === "secondary" ? currentSecondaryUrl : undefined,
      });

      const nextPrimaryUrl = keepExisting === "primary" ? currentPrimaryUrl : primaryRankResult.bestProbeUrl;

      const secondaryRankResult = this.rankProbes(chainId, {
        probes: probeResults.validProbesStats,
        preferPublic: !preferPrimaryPublic,
        excludeUrl: nextPrimaryUrl,
      });

      const nextSecondaryUrl = keepExisting === "secondary" ? currentSecondaryUrl : secondaryRankResult.bestProbeUrl;

      if (this.devtools.isDebugMode) {
        // eslint-disable-next-line no-console
        console.group(`RpcTracker ${getChainName(chainId)}`);
        // eslint-disable-next-line no-console
        console.table(
          primaryRankResult.sortedProbes.map((probe) => ({
            url: probe.url,
            isPrimary: probe.url === nextPrimaryUrl ? "✅" : "",
            isSecondary: probe.url === nextSecondaryUrl ? "✅" : "",
            isValid: probe.isValid ? "✅" : "❌",
            isSkipped: probe.isSkipped ? "✅" : "",
            responseTime: probe.responseTime,
            blockNumber: probe.blockNumber,
            isPublic: probe.isPublic ? "yes" : "no",
            bannedTimestamp: this.getBannedTimestamp(chainId, probe.url) ?? "no",
          }))
        );
        // eslint-disable-next-line no-console
        console.groupEnd();
      }

      const bestBlockNumberProbe = maxBy(probeResults.validProbesStats, "blockNumber");
      const bestBestBlockGap =
        bestBlockNumberProbe?.blockNumber && probeResults.validProbesStats[0]?.blockNumber
          ? bestBlockNumberProbe.blockNumber - probeResults.validProbesStats[0].blockNumber
          : undefined;

      return {
        primaryUrl: nextPrimaryUrl,
        secondaryUrl: nextSecondaryUrl,
        bestBestBlockGap,
      };
    } catch (e: any) {
      if (e.message !== "no-success-probes") {
        // eslint-disable-next-line no-console
        console.error(e);
      }

      const preferPublic = !getIsLargeAccount();
      const bannedUrls = this.getBannedRpcUrls(chainId);

      const primaryUrl = getRandomOrDefaultRpcUrl(chainId, { isPublic: preferPublic, bannedUrls });
      const secondaryUrl = getRandomOrDefaultRpcUrl(chainId, { isPublic: !preferPublic, bannedUrls });

      return {
        primaryUrl,
        secondaryUrl,
      };
    }
  }

  setCurrentProviders(
    chainId: number,
    {
      primaryUrl,
      secondaryUrl,
      bestBestBlockGap,
    }: { primaryUrl: string; secondaryUrl: string; bestBestBlockGap?: number }
  ) {
    this.trackerState[chainId].currentPrimaryUrl = primaryUrl;
    this.trackerState[chainId].currentSecondaryUrl = secondaryUrl;

    window.dispatchEvent(new CustomEvent(RPC_TRACKER_UPDATE_EVENT));

    emitMetricCounter<RpcTrackerRankingCounter>({
      event: "rpcTracker.ranking.setBestRpc",
      data: {
        chainId,
        rpcProvider: getProviderNameFromUrl(primaryUrl),
        bestBlockGap: bestBestBlockGap ?? "unknown",
        isLargeAccount: getIsLargeAccount(),
      },
    });

    const storageKey = JSON.stringify(getRpcProviderKey(chainId));

    this.storage.setItemJson(storageKey, {
      rpcUrl: primaryUrl,
      timestamp: Date.now(),
    });
  }

  async probeRpc(
    chainId: ContractsChainId,
    providerUrl: string,
    isPublic: boolean,
    skipProbe = false
  ): Promise<ProbeData> {
    const controller = new AbortController();

    let responseTime: number | null = null;

    if (skipProbe) {
      return {
        url: providerUrl,
        responseTime: null,
        blockNumber: null,
        timestamp: new Date(),
        isSuccess: true,
        isSkipped: true,
        isPublic,
      };
    }

    return await Promise.race([
      sleep(this.config.probeFailTimeout).then(() => {
        controller.abort();
        throw new Error("Probe timeout");
      }),
      (async function callRpc() {
        const dataStoreAddress = getContract(chainId, "DataStore");
        const multicallAddress = getContract(chainId, "Multicall");
        // const dataStore = getDataStoreContract(chainId, provider);
        // const multicall = getMulticallContract(chainId, provider);

        const probeMarketAddress = Object.values(getMarketsByChainId(chainId))[0].marketTokenAddress;
        const probeFieldKey = HASHED_MARKET_CONFIG_KEYS[chainId]?.[probeMarketAddress]?.[PROBE_SAMPLE_FIELD];

        let blockNumber: number | null = null;
        let isSuccess = false;

        if (!dataStoreAddress || !multicallAddress || !probeMarketAddress || !probeFieldKey) {
          throw new Error("Failed to get RPC probe request data");
        } else {
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

          const body = {
            jsonrpc: "2.0",
            id: 1,
            method: "eth_call",
            params: [
              {
                to: multicallAddress,
                data: multicallData,
              },
              "latest",
            ],
          };

          try {
            const startTime = Date.now();

            const response = await fetch(providerUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(body),
              signal: controller.signal,
            });

            responseTime = Date.now() - startTime;

            if (!response.ok) {
              throw new Error(`Network response was not ok: ${response.statusText}`);
            }

            const { result } = await response.json();

            if (result) {
              const [_blockNumber, _, multicallResult] = decodeFunctionResult({
                abi: abis.Multicall,
                functionName: "blockAndAggregate",
                data: result,
              });

              const sampleFieldValue = decodeFunctionResult({
                abi: abis.DataStore,
                functionName: "getUint",
                data: multicallResult[0].returnData,
              });

              blockNumber = Number(_blockNumber);
              isSuccess = sampleFieldValue > 0n;
            }
          } catch (error: any) {
            if (error.name !== "AbortError") {
              throw error;
            }
          }
        }

        return {
          url: providerUrl,
          responseTime,
          blockNumber,
          timestamp: new Date(),
          isSuccess,
          isPublic,
        };
      })(),
    ]).catch(() => {
      return {
        url: providerUrl,
        responseTime: null,
        blockNumber: null,
        timestamp: new Date(),
        isSuccess: false,
        isPublic,
      };
    });
  }

  initTrackerState(): RpcTrackerState {
    const now = Date.now();

    return CONTRACTS_CHAIN_IDS.reduce<RpcTrackerState>((acc, chainId) => {
      const prepareProviders = (urls: string[], { isPublic }: { isPublic: boolean }) => {
        return urls.reduce<Record<string, ProviderData>>((acc, rpcUrl) => {
          acc[rpcUrl] = {
            url: rpcUrl,
            isPublic,
          };

          return acc;
        }, {});
      };

      const defaultProviders = getRpcProviders(chainId, "default");
      const largeAccountProviders = getRpcProviders(chainId, "largeAccount");
      const fallbackProviders = getRpcProviders(chainId, "fallback");

      const providers = {
        ...prepareProviders(defaultProviders, { isPublic: true }),
        ...prepareProviders(fallbackProviders ?? [], { isPublic: false }),
      };

      let currentPrimaryUrl: string = getIsLargeAccount()
        ? largeAccountProviders[0] ?? defaultProviders[0]
        : defaultProviders[0];

      let currentSecondaryUrl: string = getIsLargeAccount()
        ? defaultProviders[0]
        : fallbackProviders?.[0] ?? defaultProviders[0];

      const storageKey = JSON.stringify(getRpcProviderKey(chainId));
      const { rpcUrl, timestamp } = this.storage.getItemJson<{ rpcUrl: string; timestamp: number }>(storageKey) ?? {};

      if (rpcUrl && providers[rpcUrl] && timestamp && now - timestamp < this.config.storageExpireTimeout) {
        currentPrimaryUrl = rpcUrl;
      }

      acc[chainId] = {
        chainId: chainId as ContractsChainId,
        lastUsage: null,
        currentPrimaryUrl,
        currentSecondaryUrl,
        providers,
        bannedProviderUrls: {},
      };

      return acc;
    }, {});
  }

  getCurrentRpcUrls(chainId: AnyChainId) {
    const defaultProviders = getRpcProviders(chainId, "default");
    const fallbackProviders = getRpcProviders(chainId, "fallback");

    if (!defaultProviders?.length) {
      throw new Error(`No RPC providers found for chainId: ${chainId}`);
    }

    if (this.trackerState[chainId]) {
      this.trackerState[chainId].lastUsage = new Date();
    }

    const primary = this.trackerState?.[chainId]?.currentPrimaryUrl ?? defaultProviders[0];
    const secondary = this.trackerState?.[chainId]?.currentSecondaryUrl ?? fallbackProviders?.[0] ?? primary;

    return { primary, secondary };
  }

  async markFailedRpcProvider(chainId: number, failedRpcUrl: string) {
    this.setBannedRpcUrl(chainId, failedRpcUrl);

    const chainState = this.trackerState[chainId];

    if (!chainState) return;

    // eslint-disable-next-line no-console
    console.log("failedRpcUrl", failedRpcUrl);

    emitMetricCounter<RpcFailureCounter>({
      event: "rpcTracker.provider.failed",
      data: {
        rpcProvider: getProviderNameFromUrl(failedRpcUrl),
      },
    });

    const nextProviderUrls = await this.getBestRpcProvidersForChain(chainState, {
      keepExisting: failedRpcUrl === chainState.currentPrimaryUrl ? "secondary" : "primary",
    });

    this.setCurrentProviders(chainId, nextProviderUrls);
  }

  getBannedRpcUrls(chainId: number): string[] {
    if (!this.trackerState?.[chainId]) {
      return [];
    }

    return Object.keys(this.trackerState[chainId].bannedProviderUrls).filter((url) => {
      const banTimestamp = this.trackerState[chainId].bannedProviderUrls[url].banTimestamp;
      return banTimestamp && Date.now() - banTimestamp <= this.config.banTimeout;
    });
  }

  setBannedRpcUrl(chainId: number, url: string) {
    this.trackerState[chainId].bannedProviderUrls[url] = {
      banTimestamp: Date.now(),
    };
  }

  isRpcBanned(chainId: number, url: string): boolean {
    const banTimestamp = this.trackerState[chainId]?.bannedProviderUrls[url]?.banTimestamp;
    return Boolean(banTimestamp && Date.now() - banTimestamp <= this.config.banTimeout);
  }

  getBannedTimestamp(chainId: number, url: string): number | null {
    const banTimestamp = this.trackerState[chainId]?.bannedProviderUrls[url]?.banTimestamp;
    return banTimestamp ? banTimestamp + this.config.banTimeout : null;
  }
}
