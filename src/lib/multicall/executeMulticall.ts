import { entries, throttle, values } from "lodash";
import { stableHash } from "swr/_internal";

import type { MulticallRequestConfig, MulticallResult } from "./types";

import { executeMulticallWorker } from "./executeMulticallWorker";
import { executeMulticallMainThread } from "./executeMulticallMainThread";

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

const urgentStore: {
  current: MulticallFetcherConfig;
} = {
  current: {},
};
const backgroundStore: {
  current: MulticallFetcherConfig;
} = {
  current: {},
};

async function executeChainsMulticalls() {
  const tasks: Promise<any>[] = [];

  for (const store of [urgentStore, backgroundStore]) {
    for (const [chainIdStr, calls] of entries(store.current)) {
      const chainId = parseInt(chainIdStr);
      const task = executeChainMulticall(chainId, calls);
      tasks.push(task);
    }
  }

  urgentStore.current = {};
  backgroundStore.current = {};

  throttledExecuteUrgentChainsMulticalls.cancel();
  throttledExecuteBackgroundChainsMulticalls.cancel();

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
      for (const hook of call.hooks) {
        hook(responseOrFailure);
      }
    }
  }
}

const throttledExecuteUrgentChainsMulticalls = throttle(executeChainsMulticalls, 50, {
  leading: false,
  trailing: true,
});
const throttledExecuteBackgroundChainsMulticalls = throttle(executeChainsMulticalls, 2000, {
  leading: false,
  trailing: true,
});

export async function executeMulticall<TConfig extends MulticallRequestConfig<any>>(
  chainId: number,
  request: TConfig,
  priority: "urgent" | "background" = "urgent"
): Promise<MulticallResult<TConfig>> {
  const store = priority === "urgent" ? urgentStore : backgroundStore;

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
          hooks: [hook],
        };
      } else {
        store.current[chainId][callId].hooks.push(hook);
      }
    }
  }

  if (priority === "urgent") {
    throttledExecuteUrgentChainsMulticalls();
  } else {
    console.log("schedule background multicall");

    throttledExecuteBackgroundChainsMulticalls();
  }

  return promise as any;
}
