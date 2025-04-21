import { Chain, ClientConfig, HttpTransportConfig, createPublicClient, http } from "viem";
import {
  arbitrum,
  arbitrumSepolia,
  avalanche,
  avalancheFuji,
  base,
  optimismSepolia,
  sepolia,
  sonic,
} from "viem/chains";

import { CustomErrorsAbi } from "ab/testMultichain/getCustomErrorsAbi/getCustomErrorsAbi";
import {
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  AVALANCHE_FUJI,
  BASE_MAINNET,
  OPTIMISM_SEPOLIA,
  SEPOLIA,
  SONIC_MAINNET,
  UiSupportedChain,
} from "config/chains";
import { isWebWorker } from "config/env";
import {
  MulticallErrorEvent,
  MulticallFallbackRpcModeCounter,
  MulticallRequestCounter,
  MulticallRequestTiming,
  MulticallTimeoutEvent,
} from "lib/metrics";
import { emitMetricCounter, emitMetricEvent, emitMetricTiming } from "lib/metrics/emitMetricEvent";
import type { MulticallRequestConfig, MulticallResult } from "lib/multicall/types";
import { serializeMulticallErrors } from "lib/multicall/utils";
import { getProviderNameFromUrl } from "lib/rpc/getProviderNameFromUrl";
import { sleep } from "lib/sleep";
import { SlidingWindowFallbackSwitcher } from "lib/slidingWindowFallbackSwitcher";
import { abis as allAbis } from "sdk/abis";

export const MAX_TIMEOUT = 20000;

const CHAIN_BY_CHAIN_ID: Record<UiSupportedChain, Chain> = {
  [ARBITRUM]: arbitrum,
  [AVALANCHE]: avalanche,
  [SONIC_MAINNET]: sonic,
  [BASE_MAINNET]: base,

  [AVALANCHE_FUJI]: avalancheFuji,
  [ARBITRUM_SEPOLIA]: arbitrumSepolia,
  [OPTIMISM_SEPOLIA]: optimismSepolia,
  [SEPOLIA]: sepolia,
};

export type MulticallProviderUrls = {
  primary: string;
  secondary: string;
};

const BATCH_CONFIGS: Record<
  UiSupportedChain,
  {
    http: HttpTransportConfig["batch"];
    client: ClientConfig["batch"];
  }
> = {
  [ARBITRUM]: {
    http: {
      batchSize: 0, // disable batches, here batchSize is the number of eth_calls in a batch
      wait: 0, // keep this setting in case batches are enabled in future
    },
    client: {
      multicall: {
        batchSize: 1024 * 1024, // here batchSize is the number of bytes in a multicall
        wait: 0, // zero delay means formation of a batch in the current macro-task, like setTimeout(fn, 0)
      },
    },
  },
  [AVALANCHE]: {
    http: {
      batchSize: 0,
      wait: 0,
    },
    client: {
      multicall: {
        batchSize: 1024 * 1024,
        wait: 0,
      },
    },
  },
  [SONIC_MAINNET]: {
    http: {
      batchSize: 0,
      wait: 0,
    },
    client: {
      multicall: {
        batchSize: 1024 * 1024,
        wait: 0,
      },
    },
  },
  [BASE_MAINNET]: {
    http: {
      batchSize: 0,
      wait: 0,
    },
    client: {
      multicall: {
        batchSize: 1024 * 1024,
        wait: 0,
      },
    },
  },

  [AVALANCHE_FUJI]: {
    http: {
      batchSize: 40,
      wait: 0,
    },
    client: {
      multicall: {
        batchSize: 1024 * 1024,
        wait: 0,
      },
    },
  },
  [ARBITRUM_SEPOLIA]: {
    http: {
      batchSize: 40,
      wait: 0,
    },
    client: {
      multicall: {
        batchSize: 1024 * 1024,
        wait: 0,
      },
    },
  },
  [OPTIMISM_SEPOLIA]: {
    http: {
      batchSize: 40,
      wait: 0,
    },
    client: {
      multicall: {
        batchSize: 1024 * 1024,
        wait: 0,
      },
    },
  },
  [SEPOLIA]: {
    http: {
      batchSize: 40,
      wait: 0,
    },
    client: {
      multicall: {
        batchSize: 1024 * 1024,
        wait: 0,
      },
    },
  },
};

export class Multicall {
  static instances: {
    [chainId: number]: Multicall | undefined;
  } = {};

  static async getInstance(chainId: number, abFlags: Record<string, boolean>) {
    let instance = Multicall.instances[chainId];

    if (!instance || instance.chainId !== chainId) {
      instance = new Multicall(chainId, abFlags);

      Multicall.instances[chainId] = instance;
    }

    return instance;
  }

  static getViemClient(chainId: number, rpcUrl: string) {
    return createPublicClient({
      transport: http(rpcUrl, {
        // retries works strangely in viem, so we disable them
        retryCount: 0,
        retryDelay: 10000000,
        batch: BATCH_CONFIGS[chainId].http,
        timeout: MAX_TIMEOUT,
      }),
      pollingInterval: undefined,
      batch: BATCH_CONFIGS[chainId].client,
      chain: CHAIN_BY_CHAIN_ID[chainId],
    });
  }

  fallbackRpcSwitcher = new SlidingWindowFallbackSwitcher({
    fallbackTimeout: 60 * 1000, // 1 minute
    restoreTimeout: 5 * 60 * 1000, // 5 minutes
    eventsThreshold: 3,
    onFallback: () => {
      emitMetricCounter<MulticallFallbackRpcModeCounter>({
        event: "multicall.fallbackRpcMode.on",
        data: {
          isInMainThread: !isWebWorker,
        },
      });
    },
    onRestore: () => {
      emitMetricCounter<MulticallFallbackRpcModeCounter>({
        event: "multicall.fallbackRpcMode.off",
        data: {
          isInMainThread: !isWebWorker,
        },
      });
    },
  });

  getClient: (options?: { forceFallback?: boolean }) => ReturnType<typeof Multicall.getViemClient>;

  constructor(
    public chainId: number,
    private abFlags: Record<string, boolean>
  ) {}

  async call(
    providerUrls: MulticallProviderUrls,
    request: MulticallRequestConfig<any>,
    maxTimeout: number,
    isLargeAccount: boolean
  ) {
    const originalKeys: {
      contractKey: string;
      callKey: string;
    }[] = [];

    const abis: any = {};

    const encodedPayload: { address: string; abi: any; functionName: string; args: any }[] = [];

    const contractKeys = Object.keys(request);

    contractKeys.forEach((contractKey) => {
      const contractCallConfig = request[contractKey];

      if (!contractCallConfig) {
        return;
      }

      Object.keys(contractCallConfig.calls).forEach((callKey) => {
        const call = contractCallConfig.calls[callKey];

        if (!call) {
          return;
        }

        // Add Errors ABI to each contract ABI to correctly parse errors
        abis[contractCallConfig.contractAddress] = abis[contractCallConfig.contractAddress] || [
          ...allAbis[contractCallConfig.abiId],
          ...CustomErrorsAbi,
        ];

        const abi = abis[contractCallConfig.contractAddress];

        originalKeys.push({
          contractKey,
          callKey,
        });

        encodedPayload.push({
          address: contractCallConfig.contractAddress,
          functionName: call.methodName,
          args: call.params,
          abi,
        });
      });
    });

    const providerUrl = this.fallbackRpcSwitcher?.isFallbackMode ? providerUrls.secondary : providerUrls.primary;
    const client = Multicall.getViemClient(this.chainId, providerUrl);
    const rpcProviderName = getProviderNameFromUrl(providerUrl);

    const sendCounterEvent = (
      event: "call" | "timeout" | "error",
      { requestType, rpcProvider }: { requestType: "initial" | "retry"; rpcProvider: string }
    ) => {
      emitMetricCounter<MulticallRequestCounter>({
        event: `multicall.request.${event}`,
        data: {
          isInMainThread: !isWebWorker,
          requestType,
          rpcProvider,
          isLargeAccount,
        },
      });
    };

    const sendTiming = ({
      time,
      requestType,
      rpcProvider,
    }: {
      time: number;
      requestType: "initial" | "retry";
      rpcProvider: string;
    }) => {
      emitMetricTiming<MulticallRequestTiming>({
        event: "multicall.request.timing",
        time,
        data: {
          requestType,
          rpcProvider,
          isLargeAccount,
        },
      });
    };

    const processResponse = (response: any) => {
      const multicallResult: MulticallResult<any> = {
        success: true,
        errors: {},
        data: {},
      };

      response.forEach(({ result, status, error }, i) => {
        const { contractKey, callKey } = originalKeys[i];

        if (status === "success") {
          let values: any;

          if (Array.isArray(result) || typeof result === "object") {
            values = result;
          } else {
            values = [result];
          }

          multicallResult.data[contractKey] = multicallResult.data[contractKey] || {};
          multicallResult.data[contractKey][callKey] = {
            contractKey,
            callKey,
            returnValues: values,
            success: true,
          };
        } else {
          multicallResult.success = false;

          multicallResult.errors[contractKey] = multicallResult.errors[contractKey] || {};
          multicallResult.errors[contractKey][callKey] = error;

          multicallResult.data[contractKey] = multicallResult.data[contractKey] || {};
          multicallResult.data[contractKey][callKey] = {
            contractKey,
            callKey,
            returnValues: [],
            success: false,
            error: error,
          };
        }
      });

      return multicallResult;
    };

    const fallbackMulticall = (e: Error) => {
      const fallbackProviderUrl = providerUrls.secondary;
      const fallbackProviderName = getProviderNameFromUrl(fallbackProviderUrl);

      sendCounterEvent("call", {
        requestType: "retry",
        rpcProvider: fallbackProviderName,
      });

      // eslint-disable-next-line no-console
      console.groupCollapsed("multicall error:");
      // eslint-disable-next-line no-console
      console.error(e);
      // eslint-disable-next-line no-console
      console.groupEnd();

      if (!this.fallbackRpcSwitcher?.isFallbackMode) {
        this.fallbackRpcSwitcher?.trigger();
      }

      // eslint-disable-next-line no-console
      console.debug(`using multicall fallback for chain ${this.chainId}`);

      const fallbackClient = Multicall.getViemClient(this.chainId, fallbackProviderUrl);

      const durationStart = performance.now();

      return fallbackClient
        .multicall({ contracts: encodedPayload as any })
        .then((response) => {
          sendTiming({
            time: Math.round(performance.now() - durationStart),
            requestType: "retry",
            rpcProvider: fallbackProviderName,
          });

          return response;
        })
        .catch((_viemError) => {
          const e = new Error(_viemError.message.slice(0, 150));
          // eslint-disable-next-line no-console
          console.groupCollapsed("multicall fallback error:");
          // eslint-disable-next-line no-console
          console.error(e);
          // eslint-disable-next-line no-console
          console.groupEnd();

          emitMetricEvent<MulticallErrorEvent>({
            event: "multicall.error",
            isError: true,
            data: {
              requestType: "retry",
              rpcProvider: fallbackProviderName,
              isInMainThread: !isWebWorker,
              errorMessage: _viemError.message,
            },
          });

          sendCounterEvent("error", {
            requestType: "retry",
            rpcProvider: fallbackProviderName,
          });

          throw e;
        });
    };

    sendCounterEvent("call", {
      requestType: "initial",
      rpcProvider: rpcProviderName,
    });

    const durationStart = performance.now();

    const result = await Promise.race([
      client.multicall({ contracts: encodedPayload as any }),
      sleep(maxTimeout).then(() => Promise.reject(new Error("multicall timeout"))),
    ])
      .then((response) => {
        sendTiming({
          time: Math.round(performance.now() - durationStart),
          requestType: "initial",
          rpcProvider: rpcProviderName,
        });

        return processResponse(response);
      })
      .catch((_viemError) => {
        const e = new Error(_viemError.message.slice(0, 150));

        emitMetricEvent<MulticallTimeoutEvent>({
          event: "multicall.timeout",
          isError: true,
          data: {
            metricType: "rpcTimeout",
            isInMainThread: !isWebWorker,
            requestType: "initial",
            rpcProvider: rpcProviderName,
            errorMessage: _viemError.message.slice(0, 150),
          },
        });

        sendCounterEvent("timeout", {
          requestType: "initial",
          rpcProvider: rpcProviderName,
        });

        return fallbackMulticall(e).then(processResponse);
      });

    if (result.success) {
      return result;
    }

    emitMetricEvent<MulticallErrorEvent>({
      event: "multicall.error",
      isError: true,
      data: {
        requestType: "initial",
        rpcProvider: rpcProviderName,
        isInMainThread: !isWebWorker,
        errorMessage: serializeMulticallErrors(result.errors),
      },
    });

    sendCounterEvent("error", {
      requestType: "initial",
      rpcProvider: rpcProviderName,
    });

    if (!this.fallbackRpcSwitcher?.isFallbackMode) {
      this.fallbackRpcSwitcher?.trigger();
    }

    return await fallbackMulticall(new Error("multicall fallback error")).then(processResponse);
  }
}
