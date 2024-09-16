import { Provider, ethers } from "ethers";
import {
  RPC_PROVIDERS,
  SUPPORTED_CHAIN_IDS,
  ARBITRUM,
  AVALANCHE,
  AVALANCHE_FUJI,
  getFallbackRpcUrl,
} from "config/chains";
import { getRpcProviderKey, SHOW_DEBUG_VALUES_KEY } from "config/localStorage";
import entries from "lodash/entries";
import orderBy from "lodash/orderBy";
import minBy from "lodash/minBy";
import { differenceInMilliseconds } from "date-fns";
import { getMulticallContract, getDataStoreContract } from "config/contracts";
import { getContract } from "config/contracts";
import { HASHED_MARKET_CONFIG_KEYS } from "prebuilt";
import { getIsFlagEnabled } from "config/ab";
import { sleep } from "lib/sleep";

const PROBE_INTERVAL = 10 * 1000; // 10 seconds / Frequency of RPC probing
const PROBE_FAIL_TIMEOUT = 10 * 1000; // 10 seconds / Abort RPC probe if it takes longer
const STORAGE_EXPIRE_TIMEOUT = 5 * 60 * 1000; // 5 minutes / Time after which provider saved in the localStorage is considered stale
const DISABLE_UNUSED_TRACKING_TIMEOUT = 2 * 60 * 1000; // 2 minutes / Pause probing if no requests for the best RPC for this time

const BLOCK_FROM_FUTURE_THRESHOLD = 1000; // Omit RPC if block number is higher than average on this value
const BLOCK_LAGGING_THRESHOLD = 50; // Omit RPC if block number is lower than highest valid on this value

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
  responseTime: number;
  blockNumber: number | null;
  timestamp: Date;
};

type ProviderData = {
  url: string;
  provider: Provider;
};

type RpcTrackerState = {
  [chainId: number]: {
    lastUsage: Date;
    currentBestProviderUrl: string;
    providers: {
      [providerUrl: string]: ProviderData;
    };
  };
};

let trackingIntervalId: number | null = null;
let trackerState: RpcTrackerState | null = null;

function initRpcTracking() {
  trackerState = initTrackerState();

  if (trackingIntervalId) {
    clearInterval(trackingIntervalId);
  }
  measureRpcData();
  trackingIntervalId = window.setInterval(measureRpcData, PROBE_INTERVAL);
}

function measureRpcData() {
  if (!trackerState) {
    throw new Error("RPC tracker state is not initialized");
  }

  entries(trackerState).forEach(async ([chainIdRaw, chainTracker]) => {
    const chainId = Number(chainIdRaw);
    const providers = Object.values(chainTracker.providers);

    if (
      differenceInMilliseconds(Date.now(), chainTracker.lastUsage) > DISABLE_UNUSED_TRACKING_TIMEOUT ||
      providers.length < 2
    ) {
      return;
    }

    const probePromises = providers.map((providerInfo) => {
      return probeRpc(chainId, providerInfo.provider, providerInfo.url);
    });

    const probeResults = await Promise.all(probePromises);
    const successProbeResults = probeResults.filter((probe) => probe.isSuccess);

    if (!successProbeResults.length) {
      setCurrentProvider(chainId, getFallbackRpcUrl(chainId));

      return;
    }

    const probeResultsByBlockNumber = orderBy(successProbeResults, ["blockNumber"], ["desc"]);
    let bestBlockNumberProbe = probeResultsByBlockNumber[0];

    const probeStats = probeResultsByBlockNumber.map((probe, i, arr) => {
      let isValid = probe.isSuccess;

      const bestBlockNumber = bestBlockNumberProbe.blockNumber;
      const currProbeBlockNumber = probe.blockNumber;
      const nextProbeBlockNumber = arr[i + 1]?.blockNumber;

      // Rare case when RPC returned a block number from the far future
      if (
        i === 0 &&
        currProbeBlockNumber &&
        nextProbeBlockNumber &&
        currProbeBlockNumber - nextProbeBlockNumber > BLOCK_FROM_FUTURE_THRESHOLD
      ) {
        bestBlockNumberProbe = arr[i + 1];
        isValid = false;
      }

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

    if (bestResponseTimeValidProbe) {
      setCurrentProvider(chainId, bestResponseTimeValidProbe.url);
    }

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
  });
}

function setCurrentProvider(chainId: number, newProviderUrl: string) {
  if (!trackerState) {
    throw new Error("RPC tracker state is not initialized");
  }

  trackerState[chainId].currentBestProviderUrl = newProviderUrl;

  const storageKey = JSON.stringify(getRpcProviderKey(chainId));

  localStorage.setItem(
    storageKey,
    JSON.stringify({
      rpcUrl: newProviderUrl,
      timestamp: Date.now(),
    })
  );
}

function isDebugMode() {
  return localStorage.getItem(JSON.stringify(SHOW_DEBUG_VALUES_KEY)) === "true";
}

async function probeRpc(chainId: number, provider: Provider, providerUrl: string): Promise<ProbeData> {
  const controller = new AbortController();

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

      const startTime = Date.now();

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
          const response = await fetch(providerUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          });

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
        responseTime: Date.now() - startTime,
        blockNumber,
        timestamp: new Date(),
        isSuccess,
      };
    })(),
  ]).catch(() => {
    return {
      url: providerUrl,
      responseTime: PROBE_FAIL_TIMEOUT,
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
      lastUsage: new Date(),
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

  if (!trackerState) {
    initRpcTracking();
  }

  if (!trackerState) {
    throw new Error("RPC tracker state is not initialized");
  }

  trackerState[chainId].lastUsage = new Date();

  return trackerState[chainId].currentBestProviderUrl;
}
