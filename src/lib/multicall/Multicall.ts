import { Chain, createPublicClient, http } from "viem";

import { getViemChain } from "config/chains";
import { isWebWorker } from "config/env";
import { getProviderNameFromUrl } from "config/rpc";
import { emitReportEndpointFailure } from "lib/FallbackTracker/events";
import { withFallback } from "lib/FallbackTracker/withFallback";
import type {
  MulticallErrorEvent,
  MulticallRequestCounter,
  MulticallRequestTiming,
  MulticallTimeoutEvent,
} from "lib/metrics";
import { emitMetricCounter, emitMetricEvent, emitMetricTiming } from "lib/metrics/emitMetricEvent";
import type { MulticallRequestConfig, MulticallResult } from "lib/multicall/types";
import type { CurrentRpcEndpoints } from "lib/rpc/RpcTracker";
import { sleepWithSignal } from "lib/sleep";
import { AbiId, abis as allAbis } from "sdk/abis";
import { BATCH_CONFIGS } from "sdk/configs/batch";

import { _debugMulticall, MulticallDebugEventType, MulticallDebugState } from "./_debug";

export const MAX_PRIMARY_TIMEOUT = 20_000;

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
        timeout: MAX_PRIMARY_TIMEOUT,
      }),
      pollingInterval: undefined,
      batch: BATCH_CONFIGS[chainId].client,
      chain: getViemChain(chainId) as Chain,
    });
  }

  getClient: (options?: { forceFallback?: boolean }) => ReturnType<typeof Multicall.getViemClient>;

  constructor(
    public chainId: number,
    private abFlags: Record<string, boolean>
  ) {}

  async call(
    providerUrls: CurrentRpcEndpoints,
    request: MulticallRequestConfig<any>,
    isLargeAccount: boolean,
    debugState?: MulticallDebugState
  ) {
    const originalKeys: {
      contractKey: string;
      callKey: string;
    }[] = [];

    const abiWithErrorsMap: Partial<Record<AbiId, any>> = {};

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
        if (!abiWithErrorsMap[contractCallConfig.abiId]) {
          abiWithErrorsMap[contractCallConfig.abiId] = [
            ...(allAbis[contractCallConfig.abiId] as any),
            ...(allAbis.CustomErrors as any),
          ];
        }

        const abi = abiWithErrorsMap[contractCallConfig.abiId];

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

    const providerUrl = providerUrls.primary;

    const sendCounterEvent = (
      event: "call" | "timeout" | "error",
      { requestType, rpcProvider }: { requestType: "initial" | "retry"; rpcProvider: string }
    ) => {
      emitMetricCounter<MulticallRequestCounter>({
        event: `multicall.request.${event}`,
        data: {
          chainId: this.chainId,
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
          chainId: this.chainId,
          requestType,
          rpcProvider,
          isLargeAccount,
        },
      });
    };

    const sendDebugEvent = (type: MulticallDebugEventType, options: { providerUrl: string; error?: Error }) => {
      _debugMulticall?.dispatchEvent({
        type,
        isInWorker: isWebWorker,
        chainId: this.chainId,
        providerUrl: options.providerUrl,
        error: options.error,
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

    return withFallback({
      endpoints: [providerUrl, ...providerUrls.fallbacks],
      fn: async (providerUrl: string) => {
        const isFallback = providerUrl !== providerUrls.primary;

        const rpcProviderName = getProviderNameFromUrl(providerUrl);

        sendDebugEvent(isFallback ? "fallback-start" : "primary-start", { providerUrl });

        sendCounterEvent("call", {
          requestType: isFallback ? "retry" : "initial",
          rpcProvider: rpcProviderName,
        });

        const client = Multicall.getViemClient(this.chainId, providerUrl);

        const durationStart = performance.now();

        const debugShouldTimeout = !isFallback && isWebWorker && debugState?.triggerPrimaryTimeoutInWorker;

        const timeoutController = new AbortController();

        return await Promise.race([
          sleepWithSignal(debugShouldTimeout ? 100 : MAX_PRIMARY_TIMEOUT, timeoutController.signal).then(() => {
            sendDebugEvent("primary-timeout", { providerUrl });

            emitReportEndpointFailure({
              endpoint: providerUrl,
              trackerKey: providerUrls.trackerKey,
            });

            sendCounterEvent("timeout", {
              requestType: isFallback ? "retry" : "initial",
              rpcProvider: rpcProviderName,
            });

            emitMetricEvent<MulticallTimeoutEvent>({
              event: "multicall.timeout",
              isError: true,
              data: {
                metricType: "rpcTimeout",
                isInMainThread: !isWebWorker,
                requestType: isFallback ? "retry" : "initial",
                rpcProvider: rpcProviderName,
                errorMessage: "multicall timeout",
              },
            });

            return Promise.reject(new Error("multicall timeout"));
          }),
          client.multicall({ contracts: encodedPayload as any }),
        ])
          .then((response) => {
            timeoutController.abort();

            sendTiming({
              time: Math.round(performance.now() - durationStart),
              requestType: isFallback ? "retry" : "initial",
              rpcProvider: rpcProviderName,
            });

            const debugShouldFail = Boolean(
              !isFallback &&
                ((isWebWorker && debugState?.triggerPrimaryAsFailedInWorker) ||
                  (!isWebWorker && debugState?.triggerPrimaryAsFailedInMainThread))
            );

            if (debugShouldFail) {
              throw new Error("Debug trigger: primary failed");
            }

            sendDebugEvent(isFallback ? "fallback-success" : "primary-success", { providerUrl });

            const processed = processResponse(response);

            if (processed.success) {
              return processed;
            } else {
              throw new Error("Multicall failed");
            }
          })
          .catch((_viemError) => {
            const e = new Error(_viemError.message.slice(0, 150));
            // eslint-disable-next-line no-console
            console.groupCollapsed("multicall error:");
            // eslint-disable-next-line no-console
            console.error(e);
            // eslint-disable-next-line no-console
            console.groupEnd();

            emitMetricEvent<MulticallErrorEvent>({
              event: "multicall.error",
              isError: true,
              data: {
                requestType: isFallback ? "retry" : "initial",
                rpcProvider: rpcProviderName,
                isInMainThread: !isWebWorker,
                errorMessage: _viemError.message,
              },
            });

            sendCounterEvent("error", {
              requestType: "initial",
              rpcProvider: rpcProviderName,
            });

            sendDebugEvent(isFallback ? "fallback-failed" : "primary-failed", { providerUrl });

            emitReportEndpointFailure({
              endpoint: providerUrl,
              trackerKey: providerUrls.trackerKey,
            });

            throw e;
          });
      },
    });
  }
}
