import { Provider, ethers } from "ethers";
import {
  RPC_PROVIDERS,
  SUPPORTED_CHAIN_IDS,
  ARBITRUM,
  AVALANCHE,
  AVALANCHE_FUJI,
  getFallbackRpcUrl,
  getAlchemyArbitrumHttpUrl,
} from "config/chains";
import { getRpcProviderKey } from "config/localStorage";
import { isDebugMode } from "lib/localStorage";
import orderBy from "lodash/orderBy";
import minBy from "lodash/minBy";
import { differenceInMilliseconds } from "date-fns";
import { getMulticallContract, getDataStoreContract } from "config/contracts";
import { getContract } from "config/contracts";
import { HASHED_MARKET_CONFIG_KEYS } from "prebuilt";
import { getIsFlagEnabled } from "config/ab";
import { sleep } from "lib/sleep";
import sample from "lodash/sample";
import { useEffect, useState } from "react";

import { getProviderNameFromUrl } from "lib/rpc/getProviderNameFromUrl";
import { emitMetricCounter } from "lib/metrics/emitMetricEvent";

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
};

type ProviderData = {
  url: string;
  provider: Provider;
};

type RpcTrackerState = {
  [chainId: number]: {
    chainId: number;
    lastUsage: Date | null;
    currentBestProviderUrl: string;
    providers: {
      [providerUrl: string]: ProviderData;
    };
  };
};

if (getIsFlagEnabled("testAlchemyRpcErrorRate")) {
  RPC_PROVIDERS[ARBITRUM].unshift(getAlchemyArbitrumHttpUrl());
}

const trackerState = initTrackerState();
let trackerTimeoutId: number | null = null;

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

      const nextProviderUrl = await getBestRpcProviderForChain(chainTrackerState).catch((e) => {
        if (e.message !== "no-success-probes") {
          // eslint-disable-next-line no-console
          console.error(e);
        }

        return getFallbackRpcUrl(chainId);
      });

      setCurrentProvider(chainId, nextProviderUrl);
    })
  ).finally(() => {
    if (trackerTimeoutId) {
      window.clearTimeout(trackerTimeoutId);
    }

    trackerTimeoutId = window.setTimeout(() => trackRpcProviders(), PROBE_TIMEOUT);
  });
}

async function getBestRpcProviderForChain({ providers, chainId }: RpcTrackerState[number]) {
  const providersList = Object.values(providers);

  const probePromises = providersList.map((providerInfo) => {
    return probeRpc(chainId, providerInfo.provider, providerInfo.url);
  });

  const probeResults = await Promise.all(probePromises);
  const successProbeResults = probeResults.filter((probe) => probe.isSuccess);

  if (!successProbeResults.length) {
    throw new Error("no-success-probes");
  }

  const probeResultsByBlockNumber = orderBy(successProbeResults, ["blockNumber"], ["desc"]);
  let bestBlockNumberProbe = probeResultsByBlockNumber[0];
  const secondBlockNumberProbe = probeResultsByBlockNumber[1];

  // Rare case when RPC returned a block number from the future
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

    // If the block number is lagging behind the best one
    if (bestBlockNumber && currProbeBlockNumber && bestBlockNumber - currProbeBlockNumber > BLOCK_LAGGING_THRESHOLD) {
      isValid = false;
    }

    return {
      ...probe,
      isValid,
    };
  });

  const bestResponseTimeValidProbe = minBy(
    probeStats.filter((probe) => probe.isValid),
    "responseTime"
  );

  if (isDebugMode()) {
    // eslint-disable-next-line no-console
    console.table(
      orderBy(
        probeStats.map((probe) => ({
          url: probe.url,
          isSelected: probe.url === bestResponseTimeValidProbe?.url ? "✅" : "",
          isValid: probe.isValid ? "✅" : "❌",
          responseTime: probe.responseTime,
          blockNumber: probe.blockNumber,
        })),
        ["responseTime"],
        ["asc"]
      )
    );
  }

  if (!bestResponseTimeValidProbe?.url) {
    throw new Error("no-success-probes");
  }

  return bestResponseTimeValidProbe.url;
}

function setCurrentProvider(chainId: number, newProviderUrl: string) {
  trackerState[chainId].currentBestProviderUrl = newProviderUrl;

  window.dispatchEvent(new CustomEvent(RPC_TRACKER_UPDATE_EVENT));

  emitMetricCounter({
    event: "rpcTracker.ranking.setBestRpc",
    data: { rpcProvider: getProviderNameFromUrl(newProviderUrl) },
  });

  const storageKey = JSON.stringify(getRpcProviderKey(chainId));

  localStorage.setItem(
    storageKey,
    JSON.stringify({
      rpcUrl: newProviderUrl,
      timestamp: Date.now(),
    })
  );
}

async function probeRpc(chainId: number, provider: Provider, providerUrl: string): Promise<ProbeData> {
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
      };
    })(),
  ]).catch(() => {
    return {
      url: providerUrl,
      responseTime: null,
      blockNumber: null,
      timestamp: new Date(),
      isSuccess: false,
    };
  });
}

function initTrackerState() {
  const now = Date.now();

  return SUPPORTED_CHAIN_IDS.reduce<RpcTrackerState>((acc, chainId) => {
    const providersList = RPC_PROVIDERS[chainId] as string[];
    const providers = providersList.reduce<Record<string, ProviderData>>((acc, rpcUrl) => {
      acc[rpcUrl] = {
        url: rpcUrl,
        provider: new ethers.JsonRpcProvider(rpcUrl),
      };

      return acc;
    }, {});

    let currentBestProviderUrl: string = RPC_PROVIDERS[chainId][0];

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
        currentBestProviderUrl = rpcUrl;
      }
    }

    acc[chainId] = {
      chainId,
      lastUsage: null,
      currentBestProviderUrl,
      providers,
    };

    return acc;
  }, {});
}

export function getBestRpcUrl(chainId: number) {
  if (!getIsFlagEnabled("testSmartRpcSwitching")) {
    return RPC_PROVIDERS[chainId][0] as string;
  }

  if (!trackerState[chainId]) {
    if (RPC_PROVIDERS[chainId]?.length) {
      return sample(RPC_PROVIDERS[chainId]);
    }

    throw new Error(`No RPC providers found for chainId: ${chainId}`);
  }

  trackerState[chainId].lastUsage = new Date();

  return trackerState[chainId].currentBestProviderUrl ?? RPC_PROVIDERS[chainId][0];
}

export function useBestRpcUrl(chainId: number) {
  const [bestRpcUrl, setBestRpcUrl] = useState<string>(() => getBestRpcUrl(chainId));

  useEffect(() => {
    let isMounted = true;

    setBestRpcUrl(getBestRpcUrl(chainId));

    function handleRpcUpdate() {
      if (isMounted) {
        const newRpcUrl = getBestRpcUrl(chainId);
        setBestRpcUrl(newRpcUrl);
      }
    }

    window.addEventListener(RPC_TRACKER_UPDATE_EVENT, handleRpcUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener(RPC_TRACKER_UPDATE_EVENT, handleRpcUpdate);
    };
  }, [chainId]);

  return bestRpcUrl;
}
