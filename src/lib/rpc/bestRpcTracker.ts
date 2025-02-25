import {
  ARBITRUM,
  AVALANCHE,
  AVALANCHE_FUJI,
  PRIVATE_PROVIDERS,
  RPC_PROVIDERS,
  SUPPORTED_CHAIN_IDS,
  getRandomAnyRpcUrl,
} from "config/chains";
import { getContract, getDataStoreContract, getMulticallContract } from "config/contracts";
import { getRpcProviderKey } from "config/localStorage";
import { differenceInMilliseconds } from "date-fns";
import { Provider, ethers } from "ethers";
import { isDebugMode } from "lib/localStorage";
import { sleep } from "lib/sleep";
import maxBy from "lodash/maxBy";
import minBy from "lodash/minBy";
import orderBy from "lodash/orderBy";
import { useEffect, useState } from "react";
import { HASHED_MARKET_CONFIG_KEYS } from "sdk/prebuilt";

import { getIsLargeAccount } from "domain/stats/isLargeAccount";
import { RpcTrackerRankingCounter } from "lib/metrics";
import { emitMetricCounter } from "lib/metrics/emitMetricEvent";
import { RpcFailureCounter } from "lib/metrics/types";
import { getProviderNameFromUrl } from "lib/rpc/getProviderNameFromUrl";

const PROBE_TIMEOUT = 10 * 1000; // 10 seconds / Frequency of RPC probing
const PROBE_FAIL_TIMEOUT = 10 * 1000; // 10 seconds / Abort RPC probe if it takes longer
const STORAGE_EXPIRE_TIMEOUT = 5 * 60 * 1000; // 5 minutes / Time after which provider saved in the localStorage is considered stale
const DISABLE_UNUSED_TRACKING_TIMEOUT = 1 * 60 * 1000; // 1 minute / Pause probing if no requests for the best RPC for this time

const BLOCK_FROM_FUTURE_THRESHOLD = 1000; // Omit RPC if block number is higher than average on this value
const BLOCK_LAGGING_THRESHOLD = 50; // Omit RPC if block number is lower than highest valid on this value

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
  };
};

let trackerTimeoutId: number | null = null;

const trackerState = initTrackerState();

trackRpcProviders({ warmUp: true });

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
  const providersToProbe = getIsLargeAccount() ? providers : providers.filter(({ isPublic }) => isPublic);

  const probeResults = await Promise.all(
    providersToProbe.map((providerInfo) =>
      probeRpc(chainId, providerInfo.provider, providerInfo.url, providerInfo.isPublic)
    )
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

    if (bestBlockNumber && currProbeBlockNumber && bestBlockNumber - currProbeBlockNumber > BLOCK_LAGGING_THRESHOLD) {
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

type ProbeResults = {
  probeStats: ProbeData[];
  validProbesStats: ProbeData[];
};

function setLastProbeStats(chainId: number, probeResults: ProbeResults) {
  trackerState[chainId].lastProbeStats = {
    probeStats: probeResults.probeStats,
    validProbesStats: probeResults.validProbesStats,
    timestamp: Date.now(),
  };
}

async function getBestRpcProvidersForChain(
  { providers, chainId, lastProbeStats }: RpcTrackerState[number],
  blackListedUrls: string[] = []
) {
  try {
    let probeResults: ProbeResults | undefined = undefined;

    // Try to use cached probe results
    if (lastProbeStats && Date.now() - lastProbeStats.timestamp < PROBE_TIMEOUT) {
      const validProbesStats = lastProbeStats.validProbesStats.filter((probe) => !blackListedUrls.includes(probe.url));

      if (validProbesStats.length > 0) {
        probeResults = {
          probeStats: lastProbeStats.probeStats,
          validProbesStats,
        };
      }
    }

    // Do new probe if can't use cached results
    if (!probeResults) {
      const filteredProviders = Object.values(providers).filter(({ url }) => !blackListedUrls.includes(url));
      const providersList = getIsLargeAccount()
        ? filteredProviders
        : filteredProviders.filter(({ isPublic }) => isPublic);

      probeResults = await probeProviders(chainId, providersList);

      // Cache results
      setLastProbeStats(chainId, probeResults);
    }

    const { probeStats, validProbesStats } = probeResults;

    // Calculate best probes every time
    const bestResponseTimeValidProbe = minBy(validProbesStats, "responseTime");
    const bestBlockNumberValidProbe = maxBy(validProbesStats, "blockNumber");

    if (!bestResponseTimeValidProbe?.url) {
      throw new Error("no-success-probes");
    }

    // Select providers
    let nextPrimaryRpc = bestResponseTimeValidProbe;
    let nextSecondaryRpc = {
      url: getRandomAnyRpcUrl(chainId, "private", blackListedUrls.concat(nextPrimaryRpc.url)),
    };

    if (getIsLargeAccount()) {
      const privateRpcResult = validProbesStats.find((probe) => !probe.isPublic);
      if (privateRpcResult) {
        nextPrimaryRpc = privateRpcResult;
      }

      if (bestResponseTimeValidProbe.url !== nextPrimaryRpc.url) {
        nextSecondaryRpc = { url: bestResponseTimeValidProbe.url };
      } else {
        nextSecondaryRpc = { url: getRandomAnyRpcUrl(chainId, "private", blackListedUrls.concat(nextPrimaryRpc.url)) };
      }
    }

    if (isDebugMode()) {
      // eslint-disable-next-line no-console
      console.table(
        orderBy(
          probeStats.map((probe) => ({
            url: probe.url,
            isPrimary: probe.url === nextPrimaryRpc.url ? "✅" : "",
            isValid: probe.isValid ? "✅" : "❌",
            responseTime: probe.responseTime,
            blockNumber: probe.blockNumber,
            isPublic: probe.isPublic ? "yes" : "no",
            isBlackListed: blackListedUrls.includes(probe.url) ? "yes" : "no",
          })),
          ["responseTime"],
          ["asc"]
        )
      );
    }

    const bestBestBlockGap =
      bestBlockNumberValidProbe?.blockNumber && nextPrimaryRpc.blockNumber
        ? bestBlockNumberValidProbe.blockNumber - nextPrimaryRpc.blockNumber
        : undefined;

    return {
      primaryUrl: nextPrimaryRpc.url,
      secondaryUrl: nextSecondaryRpc.url,
      bestBestBlockGap,
    };
  } catch (e) {
    if (e.message !== "no-success-probes") {
      // eslint-disable-next-line no-console
      console.error(e);
    }

    const primaryUrl = getRandomAnyRpcUrl(chainId, "public", blackListedUrls);
    const secondaryUrl = getRandomAnyRpcUrl(chainId, "private", blackListedUrls.concat(primaryUrl ?? []));

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
  isPublic: boolean
): Promise<ProbeData> {
  const controller = new AbortController();

  let responseTime: number | null = null;

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
    };

    return acc;
  }, {});
}

export function getCurrentRpcUrls(chainId: number) {
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

export function useCurrentRpcUrls(chainId: number) {
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

export async function markFailedRpcProvider(chainId: number, rpcUrl: string) {
  const chainState = trackerState[chainId];

  if (!chainState) return;

  // Emit metric about RPC failure
  emitMetricCounter<RpcFailureCounter>({
    event: "rpcTracker.provider.failed",
    data: {
      rpcProvider: getProviderNameFromUrl(rpcUrl),
    },
  });

  // Recalculate best providers with failed RPC blacklisted
  const nextProviderUrls = await getBestRpcProvidersForChain(chainState, [rpcUrl]);

  setCurrentProviders(chainId, nextProviderUrls);
}
