import {
  ARBITRUM,
  AVALANCHE,
  AVALANCHE_FUJI,
  PRIVATE_PROVIDERS,
  RPC_PROVIDERS,
  SUPPORTED_CHAIN_IDS,
  getRandomOrDefaultRpcUrl,
} from "config/chains";
import { getContract, getDataStoreContract, getMulticallContract } from "config/contracts";
import { getRpcProviderKey } from "config/localStorage";
import { differenceInMilliseconds } from "date-fns";
import { Provider, ethers } from "ethers";
import { isDebugMode } from "lib/localStorage";
import { sleep } from "lib/sleep";
import maxBy from "lodash/maxBy";
import orderBy from "lodash/orderBy";
import { useEffect, useState } from "react";
import { HASHED_MARKET_CONFIG_KEYS } from "sdk/prebuilt";
import {
  useCurrentRpcUrls as old_useCurrentRpcUrls,
  getCurrentRpcUrls as old_getCurrentRpcUrls,
} from "ab/testRpcFallbackUpdates/disabled/oldRpcTracker";

import { getIsLargeAccount } from "domain/stats/isLargeAccount";
import { RpcTrackerRankingCounter } from "lib/metrics";
import { emitMetricCounter } from "lib/metrics/emitMetricEvent";
import { RpcFailureCounter } from "lib/metrics/types";
import { getProviderNameFromUrl } from "lib/rpc/getProviderNameFromUrl";
import { getIsFlagEnabled } from "config/ab";

const PROBE_TIMEOUT = 10 * 1000; // 10 seconds / Frequency of RPC probing
const PROBE_FAIL_TIMEOUT = 10 * 1000; // 10 seconds / Abort RPC probe if it takes longer
const STORAGE_EXPIRE_TIMEOUT = 5 * 60 * 1000; // 5 minutes / Time after which provider saved in the localStorage is considered stale
const DISABLE_UNUSED_TRACKING_TIMEOUT = 1 * 60 * 1000; // 1 minute / Pause probing if no requests for the best RPC for this time

const BLOCK_FROM_FUTURE_THRESHOLD = 1000; // Omit RPC if block number is higher than average on this value
const BLOCK_LAGGING_THRESHOLD = 50; // Omit RPC if block number is lower than highest valid on this value
const BAN_TIMEOUT = 30 * 1000; // 30 seconds - time after which banned RPC can be used again

const RPC_TRACKER_UPDATE_EVENT = "rpc-tracker-update-event";

// DataStore field used for probing
const PROBE_SAMPLE_FIELD = "minCollateralFactor";
// Markets used for `PROBE_SAMPLE_FIELD` reading
const PROBE_SAMPLE_MARKET = {
  [ARBITRUM]: "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336", // ETH/USD
  [AVALANCHE]: "0xB7e69749E3d2EDd90ea59A4932EFEa2D41E245d7", // ETH/USD
  [AVALANCHE_FUJI]: "0xbf338a6C595f06B7Cfff2FA8c958d49201466374", // ETH/USD
};

type ProbeData = {
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

type ProviderData = {
  url: string;
  provider: Provider;
  isPublic: boolean;
};

type RpcTrackerState = {
  [chainId: number]: {
    chainId: number;
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

type ProbeResults = {
  probeStats: ProbeData[];
  validProbesStats: ProbeData[];
};

let trackerTimeoutId: number | null = null;
const trackerState = initTrackerState();

function setLastProbeStats(chainId: number, probeResults: ProbeResults) {
  trackerState[chainId].lastProbeStats = {
    probeStats: probeResults.probeStats,
    validProbesStats: probeResults.validProbesStats,
    timestamp: Date.now(),
  };
}

function getBannedRpcUrls(chainId: number): string[] {
  if (!trackerState?.[chainId]) {
    return [];
  }

  return Object.keys(trackerState[chainId].bannedProviderUrls).filter((url) => {
    const banTimestamp = trackerState[chainId].bannedProviderUrls[url].banTimestamp;
    return banTimestamp && Date.now() - banTimestamp <= BAN_TIMEOUT;
  });
}

function setBannedRpcUrl(chainId: number, url: string) {
  trackerState[chainId].bannedProviderUrls[url] = {
    banTimestamp: Date.now(),
  };
}

function isRpcBanned(chainId: number, url: string): boolean {
  const banTimestamp = trackerState[chainId]?.bannedProviderUrls[url]?.banTimestamp;
  return Boolean(banTimestamp && Date.now() - banTimestamp <= BAN_TIMEOUT);
}

function getBannedTimestamp(chainId: number, url: string): number | null {
  const banTimestamp = trackerState[chainId]?.bannedProviderUrls[url]?.banTimestamp;
  return banTimestamp ? banTimestamp + BAN_TIMEOUT : null;
}

if (getIsFlagEnabled("testRpcFallbackUpdates")) {
  trackRpcProviders({ warmUp: true });
}

function trackRpcProviders({ warmUp = false } = {}) {
  Promise.all(
    Object.values(trackerState).map(async (chainTrackerState) => {
      const { providers, lastUsage, chainId } = chainTrackerState;
      const hasMultipleProviders = Object.keys(providers).length > 1;
      const isUnusedChain =
        !lastUsage || differenceInMilliseconds(Date.now(), lastUsage) > DISABLE_UNUSED_TRACKING_TIMEOUT;
      const isChainTrackingEnabled = (warmUp || !isUnusedChain) && hasMultipleProviders;

      if (!isChainTrackingEnabled) {
        return;
      }

      const nextProviderUrls = await getBestRpcProvidersForChain(chainTrackerState);
      setCurrentProviders(chainId, nextProviderUrls);
    })
  ).finally(() => {
    if (trackerTimeoutId) {
      window.clearTimeout(trackerTimeoutId);
    }

    trackerTimeoutId = window.setTimeout(() => trackRpcProviders(), PROBE_TIMEOUT);
  });
}

async function probeProviders(chainId: number, providers: ProviderData[]) {
  const probeResults = await Promise.all(
    providers.map((providerInfo) => {
      const shouldSkip = !getIsLargeAccount() && !providerInfo.isPublic;
      return probeRpc(chainId, providerInfo.provider, providerInfo.url, providerInfo.isPublic, shouldSkip);
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
    bestBlockNumberProbe.blockNumber - secondBlockNumberProbe.blockNumber > BLOCK_FROM_FUTURE_THRESHOLD
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
      bestBlockNumber - currProbeBlockNumber > BLOCK_LAGGING_THRESHOLD
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

function rankProbes(
  chainId: number,
  { probes, preferPublic, excludeUrl }: { probes: ProbeData[]; preferPublic: boolean; excludeUrl?: string }
) {
  const sortedProbes = orderBy(
    probes,
    [
      (probe) => (probe.url !== excludeUrl ? 0 : 1),
      // Not banned probes first, then by banned timestamp
      (probe) => (!isRpcBanned(chainId, probe.url) ? -Infinity : getBannedTimestamp(chainId, probe.url)),
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

async function getBestRpcProvidersForChain(
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
      Date.now() - lastProbeStats.timestamp < PROBE_TIMEOUT &&
      lastProbeStats.validProbesStats.length > 0
    ) {
      probeResults = lastProbeStats;
    } else {
      // Do new probe if can't use cached results
      const providersList = Object.values(providers);
      probeResults = await probeProviders(chainId, providersList);

      setLastProbeStats(chainId, probeResults);
    }

    if (!probeResults) {
      throw new Error("error-getting-probe-results");
    }

    // For primary URL: prefer private for large accounts, public for others
    const preferPrimaryPublic = !getIsLargeAccount();

    const primaryRankResult = rankProbes(chainId, {
      probes: probeResults.validProbesStats,
      preferPublic: preferPrimaryPublic,
      // Avoid using the same URL for primary and secondary
      excludeUrl: keepExisting === "secondary" ? currentSecondaryUrl : undefined,
    });

    const nextPrimaryUrl = keepExisting === "primary" ? currentPrimaryUrl : primaryRankResult.bestProbeUrl;

    const secondaryRankResult = rankProbes(chainId, {
      probes: probeResults.validProbesStats,
      preferPublic: !preferPrimaryPublic,
      excludeUrl: nextPrimaryUrl,
    });

    const nextSecondaryUrl = keepExisting === "secondary" ? currentSecondaryUrl : secondaryRankResult.bestProbeUrl;

    if (isDebugMode()) {
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
          bannedTimestamp: getBannedTimestamp(chainId, probe.url) ?? "no",
        }))
      );
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
  } catch (e) {
    if (e.message !== "no-success-probes") {
      // eslint-disable-next-line no-console
      console.error(e);
    }

    const preferPublic = !getIsLargeAccount();
    const bannedUrls = getBannedRpcUrls(chainId);

    const primaryUrl = getRandomOrDefaultRpcUrl(chainId, { isPublic: preferPublic, bannedUrls });
    const secondaryUrl = getRandomOrDefaultRpcUrl(chainId, { isPublic: !preferPublic, bannedUrls });

    return {
      primaryUrl,
      secondaryUrl,
    };
  }
}

function setCurrentProviders(
  chainId: number,
  {
    primaryUrl,
    secondaryUrl,
    bestBestBlockGap,
  }: { primaryUrl: string; secondaryUrl: string; bestBestBlockGap?: number }
) {
  trackerState[chainId].currentPrimaryUrl = primaryUrl;
  trackerState[chainId].currentSecondaryUrl = secondaryUrl;

  window.dispatchEvent(new CustomEvent(RPC_TRACKER_UPDATE_EVENT));

  emitMetricCounter<RpcTrackerRankingCounter>({
    event: "rpcTracker.ranking.setBestRpc",
    data: {
      rpcProvider: getProviderNameFromUrl(primaryUrl),
      bestBlockGap: bestBestBlockGap ?? "unknown",
      isLargeAccount: getIsLargeAccount(),
    },
  });

  const storageKey = JSON.stringify(getRpcProviderKey(chainId));

  localStorage.setItem(
    storageKey,
    JSON.stringify({
      rpcUrl: primaryUrl,
      timestamp: Date.now(),
    })
  );
}

async function probeRpc(
  chainId: number,
  provider: Provider,
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
    sleep(PROBE_FAIL_TIMEOUT).then(() => {
      controller.abort();
      throw new Error("Probe timeout");
    }),
    (async function callRpc() {
      const dataStoreAddress = getContract(chainId, "DataStore");
      const multicallAddress = getContract(chainId, "Multicall");
      const dataStore = getDataStoreContract(chainId, provider);
      const multicall = getMulticallContract(chainId, provider);

      const probeMarketAddress = PROBE_SAMPLE_MARKET[chainId];
      const probeFieldKey = HASHED_MARKET_CONFIG_KEYS[chainId]?.[probeMarketAddress]?.[PROBE_SAMPLE_FIELD];

      let blockNumber: number | null = null;
      let isSuccess = false;

      if (!dataStoreAddress || !multicallAddress || !probeMarketAddress || !probeFieldKey || !dataStore || !multicall) {
        throw new Error("Failed to get RPC probe request data");
      } else {
        const dataStoreData = dataStore.interface.encodeFunctionData("getUint", [probeFieldKey]);
        const multicallData = multicall.interface.encodeFunctionData("blockAndAggregate", [
          [{ target: dataStoreAddress, callData: dataStoreData }],
        ]);

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
            const multicallResult = multicall.interface.decodeFunctionResult("blockAndAggregate", result);
            const [sampleFieldValue] = dataStore.interface.decodeFunctionResult(
              "getUint",
              multicallResult.returnData[0].returnData
            );

            blockNumber = Number(multicallResult.blockNumber);
            isSuccess = sampleFieldValue && sampleFieldValue > 0;
          }
        } catch (error) {
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

function initTrackerState() {
  const now = Date.now();

  return SUPPORTED_CHAIN_IDS.reduce<RpcTrackerState>((acc, chainId) => {
    const prepareProviders = (urls: string[], { isPublic }: { isPublic: boolean }) => {
      return urls.reduce<Record<string, ProviderData>>((acc, rpcUrl) => {
        acc[rpcUrl] = {
          url: rpcUrl,
          provider: new ethers.JsonRpcProvider(rpcUrl),
          isPublic,
        };

        return acc;
      }, {});
    };

    const providers = {
      ...prepareProviders(RPC_PROVIDERS[chainId], { isPublic: true }),
      ...prepareProviders(PRIVATE_PROVIDERS[chainId], { isPublic: false }),
    };

    let currentPrimaryUrl: string = getIsLargeAccount() ? PRIVATE_PROVIDERS[chainId][0] : RPC_PROVIDERS[chainId][0];
    let currentSecondaryUrl: string = getIsLargeAccount() ? RPC_PROVIDERS[chainId][0] : PRIVATE_PROVIDERS[chainId][0];

    const storageKey = JSON.stringify(getRpcProviderKey(chainId));
    const storedProviderData = localStorage.getItem(storageKey);

    if (storedProviderData) {
      let rpcUrl: string | undefined;
      let timestamp: number | undefined;

      try {
        const storedProvider = JSON.parse(storedProviderData);

        rpcUrl = storedProvider.rpcUrl;
        timestamp = storedProvider.timestamp;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`Failed to parse stored rpc provider data from \`${storageKey}\``, e);
      }

      if (rpcUrl && providers[rpcUrl] && timestamp && now - timestamp < STORAGE_EXPIRE_TIMEOUT) {
        currentPrimaryUrl = rpcUrl;
      }
    }

    acc[chainId] = {
      chainId,
      lastUsage: null,
      currentPrimaryUrl,
      currentSecondaryUrl,
      providers,
      bannedProviderUrls: {},
    };

    return acc;
  }, {});
}

function _getCurrentRpcUrls(chainId: number) {
  if (!RPC_PROVIDERS[chainId]?.length) {
    throw new Error(`No RPC providers found for chainId: ${chainId}`);
  }

  if (trackerState[chainId]) {
    trackerState[chainId].lastUsage = new Date();
  }

  const primary = trackerState?.[chainId]?.currentPrimaryUrl ?? RPC_PROVIDERS[chainId][0];
  const secondary = trackerState?.[chainId]?.currentSecondaryUrl ?? PRIVATE_PROVIDERS?.[chainId]?.[0] ?? primary;

  return { primary, secondary };
}

function _useCurrentRpcUrls(chainId: number) {
  const [bestRpcUrls, setBestRpcUrls] = useState<{
    primary: string;
    secondary?: string;
  }>(() => getCurrentRpcUrls(chainId));

  useEffect(() => {
    let isMounted = true;

    setBestRpcUrls(getCurrentRpcUrls(chainId));

    function handleRpcUpdate() {
      if (isMounted) {
        setBestRpcUrls(getCurrentRpcUrls(chainId));
      }
    }

    window.addEventListener(RPC_TRACKER_UPDATE_EVENT, handleRpcUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener(RPC_TRACKER_UPDATE_EVENT, handleRpcUpdate);
    };
  }, [chainId]);

  return bestRpcUrls;
}

async function _markFailedRpcProvider(chainId: number, failedRpcUrl: string) {
  setBannedRpcUrl(chainId, failedRpcUrl);

  const chainState = trackerState[chainId];

  if (!chainState) return;

  emitMetricCounter<RpcFailureCounter>({
    event: "rpcTracker.provider.failed",
    data: {
      rpcProvider: getProviderNameFromUrl(failedRpcUrl),
    },
  });

  const nextProviderUrls = await getBestRpcProvidersForChain(chainState, {
    keepExisting: failedRpcUrl === chainState.currentPrimaryUrl ? "secondary" : "primary",
  });

  setCurrentProviders(chainId, nextProviderUrls);
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
