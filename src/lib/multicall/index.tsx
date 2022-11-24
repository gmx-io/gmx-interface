import { useWeb3React } from "@web3-react/core";
import { ContractCallContext } from "ethereum-multicall";
import { BigNumber } from "ethers";
import React, { ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useContract, useMulticallLib } from "./utils";

type MultiCallRequestState<T> = {
  result?: T;
  success?: boolean;
  isLoading?: boolean;
  // TODO?
  // retry?: () => void;
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
  const [requests, setRequests] = useState<RequestsMap>({});
  const [requestsState, setRequestsState] = useState<RequestsStateMap>({});

  const registerRequest = useCallback(
    (key: string, params: ContractCallContext[]) => {
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

      console.log("PROCESS MULTICALL", reqKeys);

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

    processMultiCall();
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

type TokenBalances = {
  reader: {
    balances: {
      returnValues: BigNumber[];
    };
  };
};

// EXAMPLES
export function useMcTokenBalances(p: { tokenAddresses: string[] }) {
  const Reader = useContract("ReaderV2");

  const { account, active } = useWeb3React();

  const key = active && account ? `${"getTokenBalances"}-${account}-${p.tokenAddresses.join("-")}` : undefined;

  const { result } = useMultiCall<TokenBalances>(key, [
    {
      reference: "reader",
      ...Reader,
      calls: [{ reference: "balances", methodName: "getTokenBalances", methodParameters: [account, p.tokenAddresses] }],
    },
  ]);

  return {
    balances: result?.reader.balances.returnValues,
  };
}

export function useReq2(p: { a: string }) {
  const { active } = useWeb3React();

  //   const { data, isLoading } = useMultiCall(key, { address: "req1", method: "method", params: "a" });

  return {
    data: "a",
    isLoading: false,
  };
}
