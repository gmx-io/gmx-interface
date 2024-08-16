import { entries, throttle, values } from "lodash";
import { stableHash } from "swr/_internal";

import { isDevelopment } from "config/env";

import { FREQUENT_MULTICALL_REFRESH_INTERVAL, FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import { promiseWithResolvers } from "lib/utils";

import { debugLog, getIsMulticallBatchingDisabled } from "./debug";
import { executeMulticallMainThread } from "./executeMulticallMainThread";
import { executeMulticallWorker } from "./executeMulticallWorker";
import type { MulticallRequestConfig, MulticallResult } from "./types";

type MulticallFetcherConfig = {
  [chainId: number]: {
    [callDataId: string]: {
      callData: {
        contractAddress: string;
        abi: any;
        methodName: string;
        params: any[];
        shouldHashParams?: boolean;
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
  const request: MulticallRequestConfig<any> = {};

  let callCount = 0;
  for (const [callId, call] of entries(calls)) {
    callCount++;

    if (!request[call.callData.contractAddress]) {
      request[call.callData.contractAddress] = {
        abi: call.callData.abi,
        contractAddress: call.callData.contractAddress,
        calls: {},
      };
    }

    request[call.callData.contractAddress].calls[callId] = {
      methodName: call.callData.methodName,
      params: call.callData.params,
      shouldHashParams: call.callData.shouldHashParams,
    };
  }

  let responseOrFailure: MulticallResult<any> | undefined;

  {
    let startTime: number | undefined;

    debugLog(() => {
      startTime = Date.now();
      const executionIn = callCount > CALL_COUNT_MAIN_THREAD_THRESHOLD ? "worker" : "main thread";

      return `Executing multicall for chainId: ${chainId}. Call count: ${callCount}. Execution in ${executionIn}.`;
    });

    if (callCount > CALL_COUNT_MAIN_THREAD_THRESHOLD) {
      responseOrFailure = await executeMulticallWorker(chainId, request);
    } else {
      responseOrFailure = await executeMulticallMainThread(chainId, request);
    }

    debugLog(() => {
      const executionIn = callCount > CALL_COUNT_MAIN_THREAD_THRESHOLD ? "worker" : "main thread";
      const endTime = Date.now();
      const duration = endTime - (startTime ?? endTime);

      return `Multicall execution for chainId: ${chainId} took ${duration}ms in ${executionIn}. Call count: ${callCount}.`;
    });
  }

  if (responseOrFailure) {
    for (const call of values(calls)) {
      for (const hook of call.hooks) {
        hook(responseOrFailure);
      }
    }
  }
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

export function executeMulticall<TConfig extends MulticallRequestConfig<any>>(
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

      const shouldHashParams = call.shouldHashParams ?? callGroup.shouldHashParams;
      const callId = stableHash([callGroup.contractAddress, call.methodName, call.params, shouldHashParams]);

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
            shouldHashParams,
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

  return promise as any;
}
