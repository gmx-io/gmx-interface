import { ContractCallContext } from "ethereum-multicall";
import React, { ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useMulticallLib } from "./utils";

type MultiCallRequestState<T> = {
  result?: T;
  success?: boolean;
  isLoading?: boolean;
};

type RequestsMap = {
  [key: string]: ContractCallContext[];
};

type RequestsStateMap = {
  [key: string]: MultiCallRequestState<any>;
};

type MultiCallContextType<T> = {
  //   requestsState: RequestsStateMap;
  registerRequest: (key: string, req: ContractCallContext[]) => void;
  getRequestState: (key?: string) => MultiCallRequestState<T>;
};

const defaultMultiCallState = {
  result: undefined,
  success: undefined,
  isLoading: false,
};

const MultiCallContext = React.createContext<MultiCallContextType<any>>({
  registerRequest: () => null,
  getRequestState: () => defaultMultiCallState,
});

export function useMultiCall<T>(key?: string, request?: ContractCallContext[]) {
  const { registerRequest, getRequestState } = useContext<MultiCallContextType<T>>(MultiCallContext);

  useEffect(() => {
    if (!key || !request?.length) return;

    registerRequest(key, request);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return getRequestState(key);
}

function buildFullReferenceKey(key: string, originalReference: string) {
  return `${key}__${originalReference}`;
}

function parseFullReferenceKey(fullReference: string): [key: string, reference: string] {
  return fullReference.split("__") as [key: string, reference: string];
}

function useMultiCallContextImplementation() {
  const multicall = useMulticallLib();
  //   const pollingInterval = 3000;
  const [requests, setRequests] = useState<RequestsMap>({});
  const [requestsState, setRequestsState] = useState<RequestsStateMap>({});

  const registerRequest = useCallback(
    (key: string, params: ContractCallContext[]) => {
      //   console.log("key", key);

      setRequests((old) => ({ ...old, [key]: params }));
    },
    [setRequests]
  );

  const getRequestState = useCallback(
    (key?: string) => {
      if (!key) return defaultMultiCallState;

      return requestsState[key] || defaultMultiCallState;
    },
    [requestsState]
  );

  const reqKeys = Object.keys(requests);
  const requestKeysHash = reqKeys.join("-");

  useEffect(() => {
    if (!requestKeysHash?.length || !multicall) return;

    async function processMultiCall() {
      //   console.log("PROCESS MULTICALL", reqKeys);

      const fullCallCtx = reqKeys.reduce((acc, key) => {
        const requestCtx = requests[key].map((reqParams) => ({
          ...reqParams,
          reference: buildFullReferenceKey(key, reqParams.reference),
        }));

        return acc.concat(requestCtx);
      }, [] as ContractCallContext[]);

      setRequests({});

      const pendingState = reqKeys.reduce((acc, key) => {
        acc[key] = {
          ...defaultMultiCallState,
          isLoading: true,
        };

        return acc;
      }, {} as RequestsStateMap);

      setRequestsState((old) => ({ ...old, ...pendingState }));

      const result = await multicall!.call(fullCallCtx);

      const resultGroups = Object.keys(result.results).reduce((acc, resKey) => {
        const [originalKey, reference] = parseFullReferenceKey(resKey);

        acc[originalKey] = acc[originalKey] || {
          result: {},
          isLoading: false,
          success: true,
        };

        const res = result.results[resKey].callsReturnContext;

        const resObj = res.reduce((acc, item) => {
          acc[item.reference] = item;
          return acc;
        }, {});

        acc[originalKey].result[reference] = resObj;

        return acc;
      }, {} as { [key: string]: MultiCallRequestState<any> });

      setRequestsState(resultGroups);
    }

    setTimeout(processMultiCall);

    // processMultiCall();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKeysHash, multicall]);

  return useMemo(
    () => ({
      registerRequest,
      getRequestState,
    }),
    [registerRequest, getRequestState]
  );
}

export function MultiCallProvider(p: { children: ReactNode }) {
  const state = useMultiCallContextImplementation();

  return <MultiCallContext.Provider value={state}>{p.children}</MultiCallContext.Provider>;
}
