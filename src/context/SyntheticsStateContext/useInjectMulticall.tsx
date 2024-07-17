import { CacheKey, MulticallRequestConfig, MulticallResult, SkipKey, executeMulticall } from "lib/multicall";
import { executeMulticallWorker } from "lib/multicall/executeMulticallWorker";
import { entries, keys, values } from "lodash";
import React, { PropsWithChildren, useContext, useEffect, useRef, useState } from "react";
import { stableHash } from "swr/_internal";

// Idea:

// const multicallContext = useMulticallContext();

// const markets = useMarkets(multicallContext);

// const posittions = usePositions(multicallContext);

// so that useMarkets and usePositions hooks just inject their desired multicalls into the multicall context
// and multicall context will handle batching and calling them

type MulticallFetcherConfig = {
  [chainId: number]: {
    [callDataId: string]: {
      callData: {
        contractAddress: string;
        abi: any;
        methodName: string;
        params: any[];
        /**
         * @default undefined (never)
         */
        refetchInterval: 5000 | 60000 | undefined;
      };
      hooks: ((data: MulticallResult<any>) => void)[];
    };
  };
};

export type MulticallFetcherStore = React.MutableRefObject<MulticallFetcherConfig>;

export function useMulticallFetcherStore() {
  const inWorker = false;

  const huiRef = useRef<MulticallFetcherConfig>({});

  const execute = async () => {
    for (const [chainIdStr, calls] of entries(huiRef.current)) {
      const chainId = parseInt(chainIdStr);
      const request: MulticallRequestConfig<any> = {};

      for (const [callId, call] of entries(calls)) {
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

      console.log("giga", request);

      let responseOrFailure: MulticallResult<any> | undefined;
      if (inWorker) {
        responseOrFailure = await executeMulticallWorker(chainId, request);
      } else {
        responseOrFailure = await executeMulticall(chainId, request);
      }

      if (responseOrFailure) {
        for (const call of values(calls)) {
          for (const decoder of call.hooks) {
            decoder(responseOrFailure);
          }
        }
      }
    }
  };

  useEffect(() => {
    // console.log("executing multicall fetcher");
    setTimeout(() => {
      execute();
    });
  }, []);

  return huiRef;
}

const context = React.createContext<MulticallFetcherStore | undefined>(undefined);

const Provider = context.Provider;

export function MulticallFetcherStoreProvider(props: PropsWithChildren) {
  const store = useMulticallFetcherStore();

  return <Provider value={store}>{props.children}</Provider>;
}

export function useIsInMulticallFetcher() {
  const store = useContext(context);

  return store !== undefined;
}

export function useInjectMulticall<TConfig extends MulticallRequestConfig<any>, TResult = MulticallResult<TConfig>>(
  chainId: number,
  name: string,
  params: {
    groupId?: string;
    key: CacheKey | SkipKey;
    request: TConfig | ((chainId: number, key: CacheKey) => TConfig);
    parseResponse: (result: MulticallResult<TConfig>, chainId: number, key: CacheKey) => TResult;
    /**
     * @default undefined (never)
     */
    refreshInterval?: 5000 | 60000;
  }
) {
  const store = useContext(context);

  if (!store) {
    throw new Error("useInjectMulticall must be used within a MulticallFetcherStoreProvider");
  }

  const [data, setData] = useState<TResult | undefined>(undefined);

  useEffect(() => {
    if (!params.key) {
      return;
    }

    let groupNameMapping: {
      [address: string]: {
        name: string;
        calls: {
          [callId: string]: string;
        };
      };
    } = {};

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

      const parsedResponse = params.parseResponse(strippedRenamedData, chainId, params.key);

      setData(parsedResponse);
    };

    const resolvedRequest = typeof params.request === "function" ? params.request(chainId, params.key) : params.request;
    for (const [callGroupName, callGroup] of entries(resolvedRequest)) {
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
              refetchInterval: params.refreshInterval,
            },
            hooks: [hook],
          };
        } else {
          store.current[chainId][callId].hooks.push(hook);
        }
      }
    }

    return () => {
      for (const contractAddress of keys(groupNameMapping)) {
        for (const callId of values(groupNameMapping[contractAddress].calls)) {
          if (!store.current[chainId]?.[callId]) {
            continue;
          }

          store.current[chainId][callId].hooks = store.current[chainId][callId].hooks.filter((h) => h !== hook);

          if (store.current[chainId][callId].hooks.length === 0) {
            delete store.current[chainId][callId];
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, stableHash(params.key)]);

  return { data };
}
