import { Web3Provider } from "@ethersproject/providers";
import { ContractCallContext, Multicall } from "ethereum-multicall";
import { CallContext, ContractCallResults } from "ethereum-multicall/dist/esm/models";
import { bigNumberify } from "lib/numbers";
import { getProvider } from "lib/rpc";
import { MulticallRequestConfig, MulticallResult } from "./types";

export function getMulticallLib(library: Web3Provider | undefined, chainId: number) {
  const provider = getProvider(undefined, chainId);

  // library.get

  const multicall = new Multicall({
    // @ts-ignore
    ethersProvider: provider,
    tryAggregate: true,
    // web3Instance: provider,
  });

  return multicall;
}

export function formatMulticallRequest(requestConfig: MulticallRequestConfig<any>): ContractCallContext[] {
  const result: ContractCallContext[] = Object.keys(requestConfig).map((contractField) => {
    const request = requestConfig[contractField];

    const calls: CallContext[] = Object.keys(request.calls).map((callField) => {
      const callConfig = request.calls[callField];

      return {
        reference: callField,
        methodName: callConfig.methodName,
        methodParameters: callConfig.params,
      };
    });

    return {
      reference: contractField,
      ...request,
      calls,
    };
  });

  return result;
}

export function formatMulticallResult(response: ContractCallResults): MulticallResult<any> {
  const result = Object.keys(response.results).reduce((acc, contractReference) => {
    const contractResponse = response.results[contractReference].callsReturnContext;

    const callsResults = contractResponse.reduce((callsObj, call) => {
      callsObj[call.reference] = call;

      callsObj[call.reference].returnValues = call.returnValues?.map(formatReturnValue);

      return callsObj;
    }, {});

    acc[contractReference] = callsResults;

    return acc;
  }, {} as MulticallResult<any>);

  return result;
}

export function formatReturnValue(val: any) {
  // etherium-multicall doesn't parse BigNumbers automatically
  if (val?.type === "BigNumber") {
    return bigNumberify(val);
  }

  return val;
}
