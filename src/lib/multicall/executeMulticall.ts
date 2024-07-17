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

const store: {
  current: MulticallFetcherConfig;
} = {
  current: {},
};
let start = -1;
let count = 0;
async function executeChainsMulticalls() {
  const tasks: Promise<any>[] = [];
  if (start === -1) {
    start = Date.now();
  }
  console.log("giga executeChainsMulticalls", count++, Date.now() - start);

  for (const [chainIdStr, calls] of entries(store.current)) {
    const chainId = parseInt(chainIdStr);
    const task = executeChainMulticall(chainId, calls);
    tasks.push(task);
  }

  store.current = {};
  throttledExecuteChainsMulticalls.cancel();

  await Promise.allSettled(tasks);
}

const throttledExecuteChainsMulticalls = throttle(executeChainsMulticalls, 50, { leading: false, trailing: true });

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

  console.log("callCount", callCount);

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

export async function executeMulticall<TConfig extends MulticallRequestConfig<any>>(
  chainId: number,
  request: TConfig
): Promise<MulticallResult<TConfig>> {
  let groupNameMapping: {
    [address: string]: {
      name: string;
      calls: {
        [callId: string]: string;
      };
    };
  } = {};

  const { promise, resolve, reject } = Promise.withResolvers();

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
      const groupName = groupNameMapping[contractAddress].name;

      for (const [callId, callResult] of entries(contractResult)) {
        if (!groupName) {
          continue;
        }
        const callName = groupNameMapping[contractAddress].calls[callId];

        if (!strippedRenamedData.data[groupName]) {
          strippedRenamedData.data[groupName] = {};
        }

        strippedRenamedData.data[groupName][callName] = callResult;
      }
    }

    for (const [contractAddress, contractErrors] of entries(data.errors)) {
      if (!groupNameMapping[contractAddress]) {
        continue;
      }
      const groupName = groupNameMapping[contractAddress].name;

      for (const [callId, error] of entries(contractErrors)) {
        const callName = groupNameMapping[groupName]?.calls[callId];
        if (!callName) {
          continue;
        }

        if (!strippedRenamedData.errors[groupName]) {
          strippedRenamedData.errors[groupName] = {};
        }

        strippedRenamedData.errors[groupName][callName] = error;
      }
    }

    resolve(strippedRenamedData);
  };

  for (const [callGroupName, callGroup] of entries(request)) {
    if (!groupNameMapping[callGroup.contractAddress]) {
      groupNameMapping[callGroup.contractAddress] = {
        name: callGroupName,
        calls: {},
      };
    }
    for (const [callName, call] of entries(callGroup.calls)) {
      if (!call) {
        continue;
      }

      const callId = stableHash([callGroup.contractAddress, call.methodName, call.params]);

      if (!groupNameMapping[callGroup.contractAddress].calls[callId]) {
        groupNameMapping[callGroup.contractAddress].calls[callId] = callName;
      }

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

  throttledExecuteChainsMulticalls();

  return promise as any;

  // const multicall = await Multicall.getInstance(chainId);
  // return multicall?.call(request, MAX_TIMEOUT);
}
