import { entries, throttle, values } from "lodash";
import { stableHash } from "swr/_internal";

import type { MulticallRequestConfig, MulticallResult } from "./types";

import { executeMulticallWorker } from "./executeMulticallWorker";
import { executeMulticallMainThread } from "./executeMulticallMainThread";

type Subscription = {
  hook: (data: MulticallResult<any>) => void;
  priority: "urgent" | "background-5" | "background-60";
};

type MulticallFetcherConfig = {
  [chainId: number]: {
    [callDataId: string]: {
      callData: {
        contractAddress: string;
        abi: any;
        methodName: string;
        params: any[];
      };
      subscriptions: Subscription[];
    };
  };
};

const store: {
  current: MulticallFetcherConfig;
} = {
  current: {},
};

const PRIORITY_MAP = {
  urgent: 0,
  "background-5": 1,
  "background-60": 2,
};

function extractPriority(
  config: MulticallFetcherConfig,
  priority: "urgent" | "background-5" | "background-60"
): {
  priorityConfig: MulticallFetcherConfig;
  restConfig: MulticallFetcherConfig;
} {
  const restConfig: MulticallFetcherConfig = {};
  const priorityConfig: MulticallFetcherConfig = {};

  for (const [chainId, calls] of entries(config)) {
    for (const [callId, call] of entries(calls)) {
      const hasPriority = call.subscriptions.some(
        (subscription) => PRIORITY_MAP[subscription.priority] <= PRIORITY_MAP[priority]
      );

      if (hasPriority) {
        if (!priorityConfig[chainId]) {
          priorityConfig[chainId] = {};
        }

        priorityConfig[chainId][callId] = call;
      } else {
        if (!restConfig[chainId]) {
          restConfig[chainId] = {};
        }

        restConfig[chainId][callId] = call;
      }
    }
  }

  return {
    priorityConfig,
    restConfig,
  };
}

async function executeChainsMulticalls(priority: "urgent" | "background-5" | "background-60" = "urgent") {
  const tasks: Promise<any>[] = [];

  throttledExecuteUrgentChainsMulticalls.cancel();

  const { priorityConfig, restConfig } = extractPriority(store.current, priority);
  store.current = restConfig;

  for (const [chainIdStr, calls] of entries(priorityConfig)) {
    const chainId = parseInt(chainIdStr);
    const task = executeChainMulticall(chainId, calls);
    tasks.push(task);
  }

  await Promise.allSettled(tasks);
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
    };
  }

  let responseOrFailure: MulticallResult<any> | undefined;

  if (callCount > 10) {
    responseOrFailure = await executeMulticallWorker(chainId, request);
  } else {
    responseOrFailure = await executeMulticallMainThread(chainId, request);
  }

  if (responseOrFailure) {
    for (const call of values(calls)) {
      for (const subscriptions of call.subscriptions) {
        subscriptions.hook(responseOrFailure);
      }
    }
  }
}

const throttledExecuteUrgentChainsMulticalls = throttle(executeChainsMulticalls.bind(null, "urgent"), 50, {
  leading: false,
  trailing: true,
});

function createTimer() {
  let count = 0;

  const timerId = window.setInterval(() => {
    count++;

    // Every 60 seconds
    if (count % 12 === 0) {
      executeChainsMulticalls("background-60");
    } else {
      // Every 5 seconds
      executeChainsMulticalls("background-5");
    }
  }, 5000);

  return timerId;
}

let multicallTimer: number;

export async function executeMulticall<TConfig extends MulticallRequestConfig<any>>(
  chainId: number,
  request: TConfig,
  priority: "urgent" | "background-5" | "background-60" = "urgent"
): Promise<MulticallResult<TConfig>> {
  if (!multicallTimer) {
    multicallTimer = createTimer();
  }

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

  const { promise, resolve } = Promise.withResolvers();

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
          subscriptions: [
            {
              hook,
              priority,
            },
          ],
        };
      } else {
        store.current[chainId][callId].subscriptions.push({
          hook,
          priority,
        });
      }
    }
  }

  if (priority === "urgent") {
    throttledExecuteUrgentChainsMulticalls();
  }

  return promise as any;
}
