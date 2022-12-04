import { Web3Provider } from "@ethersproject/providers";
import { CHAIN_NAMES_MAP, getRpcUrl } from "config/chains";
import { ContractCallContext, Multicall } from "ethereum-multicall";
import { CallContext, ContractCallResults } from "ethereum-multicall/dist/esm/models";
import { ethers } from "ethers";
import { bigNumberify } from "lib/numbers";
import { getFallbackProvider } from "lib/rpc";
import { sleep } from "lib/sleep";
import { MulticallRequestConfig, MulticallResult } from "./types";

const MAX_TIMEOUT = 2000;

let totalRequestTime = 0;
let callsNumber = 0;

class Profiler {
  _start = 0;

  start() {
    this._start = Date.now();
  }

  end() {
    return Date.now() - this._start;
  }
}

const profiler = new Profiler();

export async function executeMulticall(
  chainId: number,
  library: Web3Provider | undefined,
  request: ContractCallContext[]
) {
  // Try to use rpc provider of connected wallet
  let provider = library ? library.getSigner().provider : undefined;

  // TODO: cover with tests?
  // If wallet network doesn't match the chainId of the request, create new rpc provider
  if (!provider || provider.network?.chainId !== chainId) {
    const rpcUrl = getRpcUrl(chainId);

    // TODO: memoize providers by chainId?
    provider = new ethers.providers.StaticJsonRpcProvider(rpcUrl, { chainId, name: CHAIN_NAMES_MAP[chainId] });
  }
  const multicall = getMulticallLib(provider as ethers.providers.JsonRpcProvider);

  console.log("executeMulticall", request);

  profiler.start();
  callsNumber += 1;

  // prettier-ignore
  return Promise.race([
    multicall.call(request).then((res) => {
      totalRequestTime += profiler.end();

      console.log('TOTAL', totalRequestTime, callsNumber)

      return res;
    }),
    sleep(MAX_TIMEOUT).then(() => Promise.reject("rpc timeout"))
  ]).catch((e) => {
      // eslint-disable-next-line no-console
      console.error("multicall error:", e, request);

      const fallbackProvider = getFallbackProvider(chainId);

      if (!fallbackProvider) {
        throw e;
      }

      // eslint-disable-next-line no-console
      console.log("using multicall fallback");

      const multicall = getMulticallLib(fallbackProvider);

      return multicall.call(request).catch((e) => {
        // eslint-disable-next-line no-console
        console.error("multicall fallback error", e);

        throw e;
      });
    }
  );
}

function getMulticallLib(provider: ethers.providers.JsonRpcProvider) {
  return new Multicall({
    // @ts-ignore inconsistent provider types from diff
    ethersProvider: provider,
    tryAggregate: true,
  });
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

export function formatMulticallResult(response: ContractCallResults["results"]): MulticallResult<any> {
  const result = Object.keys(response).reduce((acc, contractReference) => {
    const contractResponse = response[contractReference].callsReturnContext;

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
