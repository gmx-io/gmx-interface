import entries from "lodash/entries";
import throttle from "lodash/throttle";
import values from "lodash/values";
import { stableHash } from "swr/_internal";
import chunk from "lodash/chunk";

import { isDevelopment } from "config/env";
import { FREQUENT_MULTICALL_REFRESH_INTERVAL, FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import { promiseWithResolvers } from "lib/utils";
import { emitMetricCounter, emitMetricTiming } from "lib/metrics/emitMetricEvent";

import { debugLog, getIsMulticallBatchingDisabled } from "lib/multicall/debug";
import { executeMulticallMainThread } from "lib/multicall/executeMulticallMainThread";
import { executeMulticallWorker } from "lib/multicall/executeMulticallWorker";
import type { MulticallRequestConfig, MulticallResult } from "lib/multicall/types";
import { MulticallBatchedCallCounter, MulticallBatchedErrorCounter, MulticallBatchedTiming } from "lib/metrics";

type MulticallFetcherConfig = {
  [chainId: number]: {
    [callDataId: string]: {
      callData: {
        contractAddress: string;
        abi: any;
        methodName: string;
        params: any[];
      };
      hooks: ((data: MulticallResult<any>) => void)[];
    };
  };
};

const CALL_COUNT_MAIN_THREAD_THRESHOLD = 10;

const store: {
  current: MulticallFetcherConfig;
} = {
  current: {},
};

function executeChainsMulticalls() {
  const tasks: Promise<any>[] = [];

  throttledExecuteUrgentChainsMulticalls.cancel();
  throttledExecuteBackgroundChainsMulticalls.cancel();

  for (const [chainIdStr, calls] of entries(store.current)) {
    const chainId = parseInt(chainIdStr);
    const task = executeChainMulticall(chainId, calls);
    tasks.push(task);
  }
  store.current = {};

  return Promise.allSettled(tasks);
}

async function executeChainMulticall(chainId: number, calls: MulticallFetcherConfig[number]) {
  const MAX_CALLS_PER_BATCH = 500;

  const callChunks = chunk(entries(calls), MAX_CALLS_PER_BATCH);
  const batchedRequests = callChunks.map((chunk) => ({
    requestConfig: getRequest(chunk),
    callCount: chunk.length,
  }));

  const batchPromises = batchedRequests.map(async ({ requestConfig, callCount }) => {
    let responseOrFailure: MulticallResult<any> | undefined;
    let startTime: number | undefined;

    debugLog(() => {
      startTime = Date.now();
      const executionIn = callCount > CALL_COUNT_MAIN_THREAD_THRESHOLD ? "worker" : "main thread";

      return `Executing multicall for chainId: ${chainId}. Call count: ${callCount}. Execution in ${executionIn}.`;
    });

    if (callCount > CALL_COUNT_MAIN_THREAD_THRESHOLD && !isOldIOS()) {
      responseOrFailure = await executeMulticallWorker(chainId, requestConfig);
    } else {
      responseOrFailure = await executeMulticallMainThread(chainId, requestConfig);
    }

    debugLog(() => {
      const executionIn = callCount > CALL_COUNT_MAIN_THREAD_THRESHOLD ? "worker" : "main thread";
      const endTime = Date.now();
      const duration = endTime - (startTime ?? endTime);

      return `Multicall execution for chainId: ${chainId} took ${duration}ms in ${executionIn}. Call count: ${callCount}.`;
    });

    return responseOrFailure;
  });

  const batchedResponsesOrFailures = await Promise.all(batchPromises);

  const combinedResults = combineCallResults(batchedResponsesOrFailures);

  if (combinedResults) {
    for (const call of values(calls)) {
      for (const hook of call.hooks) {
        hook(combinedResults);
      }
    }
  }
}

const timings = [];
function median() {
  return timings.sort((a, b) => a - b)[Math.ceil(timings.length / 2)];
}

const URGENT_WINDOW_MS = 50;
const BACKGROUND_WINDOW_MS = FREQUENT_UPDATE_INTERVAL - FREQUENT_MULTICALL_REFRESH_INTERVAL;

const throttledExecuteUrgentChainsMulticalls = throttle(executeChainsMulticalls, URGENT_WINDOW_MS, {
  leading: false,
  trailing: true,
});
const throttledExecuteBackgroundChainsMulticalls = throttle(executeChainsMulticalls, BACKGROUND_WINDOW_MS, {
  leading: false,
  trailing: true,
});

export function oldExecuteMulticall<TConfig extends MulticallRequestConfig<any>>(
  chainId: number,
  request: TConfig,
  priority: "urgent" | "background" = "urgent",
  /**
   * For debugging purposes, you can provide a name to the multicall request.
   */
  name?: string
): Promise<MulticallResult<TConfig>> {
  let groupNameMapping: {
    // Contract address
    [address: string]: {
      // Unique call id based on contract address, method name and params
      [callId: string]: {
        // Human readable call group name
        callGroupName: string;
        // Human readable call name
        callName: string;
      }[];
    };
  } = {};

  const { promise, resolve } = promiseWithResolvers<MulticallResult<any>>();

  const hook = (data: MulticallResult<any>) => {
    const strippedRenamedData: MulticallResult<any> = {
      success: data.success,
      errors: {},
      data: {},
    };

    for (const [contractAddress, contractResult] of entries(data.data)) {
      if (!groupNameMapping[contractAddress]) {
        continue;
      }

      for (const [callId, callResult] of entries(contractResult)) {
        if (!groupNameMapping[contractAddress][callId]) {
          continue;
        }

        const destinations = groupNameMapping[contractAddress][callId];

        for (const { callGroupName, callName } of destinations) {
          if (!strippedRenamedData.data[callGroupName]) {
            strippedRenamedData.data[callGroupName] = {};
          }

          strippedRenamedData.data[callGroupName][callName] = callResult;
        }
      }
    }

    for (const [contractAddress, contractErrors] of entries(data.errors)) {
      if (!groupNameMapping[contractAddress]) {
        continue;
      }

      for (const [callId, error] of entries(contractErrors)) {
        if (!groupNameMapping[contractAddress][callId]) {
          continue;
        }

        const destinations = groupNameMapping[contractAddress][callId];

        for (const { callGroupName, callName } of destinations) {
          if (!strippedRenamedData.errors[callGroupName]) {
            strippedRenamedData.errors[callGroupName] = {};
          }

          strippedRenamedData.errors[callGroupName][callName] = error;
        }
      }
    }

    resolve(strippedRenamedData);
  };

  for (const [callGroupName, callGroup] of entries(request)) {
    if (!groupNameMapping[callGroup.contractAddress]) {
      groupNameMapping[callGroup.contractAddress] = {};
    }
    for (const [callName, call] of entries(callGroup.calls)) {
      if (!call) {
        continue;
      }

      // To reduce duplicate calls, we hash the call data and use it as a unique identifier.
      // There are two main reasons for this:
      // 1. Single token backed pools have many pairs with the same method signatures
      // 2. The majority of pools have USDC as the short token, which means they all have some common calls

      const callId = stableHash([callGroup.contractAddress, call.methodName, call.params]);

      if (!groupNameMapping[callGroup.contractAddress][callId]) {
        groupNameMapping[callGroup.contractAddress][callId] = [];
      }
      groupNameMapping[callGroup.contractAddress][callId].push({
        callGroupName,
        callName,
      });

      if (!store.current[chainId]) {
        store.current[chainId] = {};
      }

      if (!store.current[chainId][callId]) {
        store.current[chainId][callId] = {
          callData: {
            contractAddress: callGroup.contractAddress,
            abi: callGroup.abi,
            methodName: call.methodName,
            params: call.params,
          },
          hooks: [hook],
        };
      } else {
        store.current[chainId][callId].hooks.push(hook);
      }
    }
  }

  debugLog(() => {
    let msg = "";
    for (const [callId, call] of entries(store.current[chainId])) {
      if (call.hooks.length === 1) {
        continue;
      }

      const names =
        groupNameMapping[call.callData.contractAddress]?.[callId]
          ?.map(({ callGroupName, callName }) => `${callGroupName}.${callName}`)
          .join("\n") ?? callId;

      msg += `Multicall with names:\n${names}\nhas ${call.hooks.length} duplicate calls. Contract address: ${call.callData.contractAddress}. Method name: ${call.callData.methodName}.\n\n`;
    }

    return msg;
  });

  if (isDevelopment() && getIsMulticallBatchingDisabled()) {
    debugLog(() => `Multicall batching disabled, executing immediately. Multicall name: ${name ?? "?"}`);
    executeChainsMulticalls() as any;
    return promise as any;
  }

  debugLog(() => `Multicall with name: ${name ?? "?"} added to queue. Priority: ${priority}`);

  if (priority === "urgent") {
    throttledExecuteUrgentChainsMulticalls();
  } else {
    throttledExecuteBackgroundChainsMulticalls();
  }

  emitMetricCounter<MulticallBatchedCallCounter>({
    event: "multicall.batched.call",
    data: {
      priority,
    },
  });

  const durationStart = performance.now();

  return promise.then((result) => {
    const duration = performance.now() - durationStart;
    // @ts-ignore
    timings.push(duration);

    console.log("batched timing", duration, median());

    if (result.success) {
      emitMetricTiming<MulticallBatchedTiming>({
        event: "multicall.batched.timing",
        time: Math.round(duration),
        data: {
          priority,
        },
      });
    } else {
      emitMetricCounter<MulticallBatchedErrorCounter>({
        event: "multicall.batched.error",
        data: {
          priority,
        },
      });
    }

    return result;
  }) as Promise<any>;
}

function combineCallResults(batchedResponsesOrFailures: (MulticallResult<any> | undefined)[]) {
  if (batchedResponsesOrFailures.some((result) => !result)) {
    return undefined;
  }

  return batchedResponsesOrFailures.reduce<MulticallResult<any>>(
    (acc, result) => {
      if (!result) {
        return acc;
      }

      acc.success = acc.success && result.success;

      for (const [contractAddress, contractResult] of entries(result.errors)) {
        if (acc.errors[contractAddress]) {
          for (const [callId, callResult] of entries(contractResult)) {
            acc.errors[contractAddress][callId] = callResult;
          }
        } else {
          acc.errors[contractAddress] = contractResult;
        }
      }

      for (const [contractAddress, contractResult] of entries(result.data)) {
        if (acc.data[contractAddress]) {
          for (const [callId, callResult] of entries(contractResult)) {
            acc.data[contractAddress][callId] = callResult;
          }
        } else {
          acc.data[contractAddress] = contractResult;
        }
      }

      return acc;
    },
    {
      success: true,
      errors: {},
      data: {},
    }
  );
}

function getRequest(callEntries: [string, { callData: MulticallFetcherConfig[number][string]["callData"] }][]) {
  const requests: MulticallRequestConfig<any> = {};

  for (const [callId, { callData }] of callEntries) {
    if (!requests[callData.contractAddress]) {
      requests[callData.contractAddress] = {
        abi: callData.abi,
        contractAddress: callData.contractAddress,
        calls: {},
      };
    }

    requests[callData.contractAddress].calls[callId] = {
      methodName: callData.methodName,
      params: callData.params,
    };
  }

  return requests;
}

function isOldIOS() {
  // An issue was identified with sending messages from the worker to the main thread on iOS 16 and earlier versions.
  // Therefore, it was decided not to use workers for these versions.
  const THRESHOLD = 16;
  const isIOS = /iPhone|iPad|iPod/i.test(navigator?.userAgent);

  if (!isIOS) {
    return false;
  }

  const versionMatch = navigator.userAgent.match(/OS (\d+)?/);
  if (versionMatch?.[1]) {
    return parseInt(versionMatch[1], 10) <= THRESHOLD;
  }

  return false;
}
