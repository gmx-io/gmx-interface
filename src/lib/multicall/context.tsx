import { useWeb3React } from "@web3-react/core";
import { debounce } from "lodash";
import { ContractCallContext, ContractCallResults, ContractCallReturnContext } from "ethereum-multicall";
import React, { useState } from "react";
import { executeMulticall } from "./utils";
import { ContractCallResult } from "./types";
import { sleep } from "lib/sleep";

type MulticallRequestItem = {
  key: any[];
  chainId: number;
  request: ContractCallContext[];
  aggregate?: boolean;
};

type MulticallContextType = {
  registerRequest: (req: MulticallRequestItem) => void;
  getRequestState: (key: any[]) => ContractCallReturnContext[] | undefined;
};

const MultiCallContext = React.createContext<MulticallContextType>({
  registerRequest: () => null,
  getRequestState: () => undefined,
});

function useMulticallContextImpl() {
  const { library } = useWeb3React();

  const [requestsQueue, setRequestsQueue] = useState<{ [key: string]: MulticallRequestItem }>({});
  const [requestsStates, setRequestStates] = useState<{ [key: string]: ContractCallReturnContext[] }>({});

  function registerRequest(req: MulticallRequestItem) {
    const key = req.key.join("-");

    // debounce;
    setRequestsQueue((old) => ({ ...old, [key]: req }));
  }

  function getRequestState(key: any[]) {
    const _key = key.join("-");

    return requestsStates[_key];
  }

  return {
    registerRequest,
    getRequestState,
  };
}

const REQUESTS: { [key: string]: MulticallRequestItem } = {};
const RESPONSES: { [key: string]: ContractCallResults["results"] } = {};

const processMulticall = async (chainId: number, library: any) => {
  const reqs = Object.keys(REQUESTS).reduce((acc, key) => {
    const req = REQUESTS[key].request.map((item) => ({
      ...item,
      reference: `${key}__${item.reference}`,
    }));

    delete REQUESTS[key];

    acc.push(...req);
    return acc;
  }, [] as any);

  const results = await executeMulticall(chainId, library, reqs);

  Object.keys(results.results).forEach((key) => {
    const [originalKey, reference] = key.split("__");

    RESPONSES[originalKey] = RESPONSES[originalKey] || {};

    RESPONSES[originalKey][reference] = {
      ...results.results[key],
    };
  });
};

let promise;

export async function registerRequest(req: MulticallRequestItem, library) {
  const key = req.key.join("-");

  REQUESTS[key] = req;

  if (!promise) {
    promise = sleep(10)
      .then(() => processMulticall(req.chainId, library))
      .then(() => {
        promise = undefined;
      });
  }

  await promise;

  console.log("RESPONSES", Object.keys(RESPONSES).length);

  const result = RESPONSES[key];

  //   delete RESPONSES[key];

  return { results: result };

  //   const filteredKeys = Object.keys(result.results).filter((resKey) => resKey.includes(key));

  //   if (filteredKeys.length === 0) {
  //     resolve(undefined);
  //   }

  //   const filteredResult = filteredKeys.reduce((acc, resKey) => {
  //     const [originalKey, reference] = resKey.split("__");

  //     acc[reference] = result.results[resKey];

  //     return acc;
  //   }, {});

  //   console.log("filteredResult", filteredResult);

  //   return {};
}
