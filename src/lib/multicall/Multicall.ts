import { ClientConfig, createPublicClient, http } from "viem";
import type { BatchOptions } from "viem/_types/clients/transports/http";
import { arbitrum, arbitrumGoerli, avalanche, avalancheFuji } from "viem/chains";

import { ARBITRUM, ARBITRUM_GOERLI, AVALANCHE, AVALANCHE_FUJI, getFallbackRpcUrl, getRpcUrl } from "config/chains";
import { isWebWorker } from "config/env";
import { hashData } from "lib/hash";
import { sleep } from "lib/sleep";
import type { MulticallRequestConfig, MulticallResult } from "./types";

import CustomErrors from "abis/CustomErrors.json";
import { MulticallTimeoutEvent, MulticallErrorEvent } from "lib/metrics";
import { emitMetricEvent } from "lib/metrics/emitMetricEvent";
import { SlidingWindowFallbackSwitcher } from "lib/slidingWindowFallbackSwitcher";
import { getStaticOracleKeeperFetcher } from "lib/oracleKeeperFetcher";

export const MAX_TIMEOUT = 20000;

const CHAIN_BY_CHAIN_ID = {
  [AVALANCHE_FUJI]: avalancheFuji,
  [ARBITRUM_GOERLI]: arbitrumGoerli,
  [ARBITRUM]: arbitrum,
  [AVALANCHE]: avalanche,
};

const BATCH_CONFIGS: Record<
  number,
  {
    http: BatchOptions;
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
  [ARBITRUM_GOERLI]: {
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
};

export class Multicall {
  static instances: {
    [chainId: number]: Multicall | undefined;
  } = {};

  static async getInstance(chainId: number, abFlags: Record<string, boolean>) {
    let instance = Multicall.instances[chainId];

    if (!instance || instance.chainId !== chainId) {
      const rpcUrl = getRpcUrl(chainId);
      const fallbackRpcUrl = getFallbackRpcUrl(chainId);

      if (!rpcUrl || !fallbackRpcUrl) {
        return undefined;
      }

      instance = new Multicall(chainId, rpcUrl, fallbackRpcUrl, abFlags);

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
      getStaticOracleKeeperFetcher(this.chainId).fetchPostCounter({
        event: `multicall.${isWebWorker ? "worker" : "mainThread"}.fallbackRpcMode.on`,
        abFlags: this.abFlags,
      });
    },
    onRestore: () => {
      getStaticOracleKeeperFetcher(this.chainId).fetchPostCounter({
        event: `multicall.${isWebWorker ? "worker" : "mainThread"}.fallbackRpcMode.off`,
        abFlags: this.abFlags,
      });
    },
  });

  getClient: (options?: { forceFallback?: boolean }) => ReturnType<typeof Multicall.getViemClient>;

  constructor(
    public chainId: number,
    public rpcUrl: string,
    public fallbackRpcUrl: string,
    private abFlags: Record<string, boolean>
  ) {
    const client = Multicall.getViemClient(chainId, rpcUrl);
    const fallbackClient = Multicall.getViemClient(chainId, fallbackRpcUrl);

    this.getClient = function getViemClient({ forceFallback = false } = {}) {
      if (forceFallback || this.fallbackRpcSwitcher?.isFallbackMode) {
        return fallbackClient;
      }

      return client;
    };
  }

  async call(request: MulticallRequestConfig<any>, maxTimeout: number) {
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
        abis[contractCallConfig.contractAddress] =
          abis[contractCallConfig.contractAddress] || contractCallConfig.abi.concat(CustomErrors.abi);

        const abi = abis[contractCallConfig.contractAddress];

        originalKeys.push({
          contractKey,
          callKey,
        });

        const args = call.shouldHashParams
          ? call.params?.map((keyValue: any[]) => hashData(keyValue[0], keyValue[1]))
          : call.params;

        encodedPayload.push({
          address: contractCallConfig.contractAddress,
          functionName: call.methodName,
          abi,
          args,
        });
      });
    });

    const client = this.getClient();
    const isFallbackMode = this.fallbackRpcSwitcher?.isFallbackMode;

    const sendCounterEvent = (event: string, isFallback?: boolean) => {
      const environment = isWebWorker ? "worker" : "mainThread";
      const fallback = isFallback || isFallbackMode ? ".fallback" : "";

      getStaticOracleKeeperFetcher(this.chainId).fetchPostCounter({
        event: `multicall.${environment}${fallback}.${event}`,
        abFlags: this.abFlags,
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
      sendCounterEvent("request", true);

      // eslint-disable-next-line no-console
      console.groupCollapsed("multicall error:");
      // eslint-disable-next-line no-console
      console.error(e);
      // eslint-disable-next-line no-console
      console.groupEnd();

      if (!isFallbackMode && this.abFlags?.testRpcWindowFallback) {
        this.fallbackRpcSwitcher?.trigger();
      }

      // eslint-disable-next-line no-console
      console.debug(`using multicall fallback for chain ${this.chainId}`);

      return this.getClient({ forceFallback: true })
        .multicall({ contracts: encodedPayload as any })
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
              isFallbackRequest: true,
              isInMainThread: !isWebWorker,
              errorMessage: _viemError.message.slice(0, 150),
            },
          });

          sendCounterEvent("error", true);

          throw e;
        });
    };

    sendCounterEvent("request");

    const result: any = await Promise.race([
      client.multicall({ contracts: encodedPayload as any }),
      sleep(maxTimeout).then(() => Promise.reject(new Error("multicall timeout"))),
    ])
      .then(processResponse)
      .catch((_viemError) => {
        const e = new Error(_viemError.message.slice(0, 150));

        emitMetricEvent<MulticallTimeoutEvent>({
          event: "multicall.timeout",
          isError: true,
          data: {
            metricType: "rpcTimeout",
            isInMainThread: !isWebWorker,
            isFallbackRequest: isFallbackMode,
            errorMessage: _viemError.message.slice(0, 150),
          },
        });

        sendCounterEvent("timeout");

        return fallbackMulticall(e).then(processResponse);
      });

    if (result.success) {
      return result;
    }

    emitMetricEvent<MulticallErrorEvent>({
      event: "multicall.error",
      isError: true,
      data: {
        isFallbackRequest: isFallbackMode,
        isInMainThread: !isWebWorker,
        errorMessage: "multicall error",
      },
    });

    sendCounterEvent("error");

    if (this.abFlags?.testRpcWindowFallback) {
      if (!isFallbackMode) {
        this.fallbackRpcSwitcher?.trigger();
      }

      return await fallbackMulticall(new Error("multicall fallback error")).then(processResponse);
    }

    return result;
  }
}
