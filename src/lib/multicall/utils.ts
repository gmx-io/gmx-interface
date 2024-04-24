import { Web3Provider } from "@ethersproject/providers";
import { CHAIN_NAMES_MAP, getRpcUrl } from "config/chains";
import { ContractCallContext, Multicall } from "ethereum-multicall";
import { CallContext, ContractCallResults } from "ethereum-multicall/dist/esm/models";
import { ethers } from "ethers";
import { bigNumberify } from "lib/numbers";
import { getFallbackProvider } from "lib/rpc";
import { sleep } from "lib/sleep";
import { MulticallRequestConfig, MulticallResult } from "./types";

export const MAX_TIMEOUT = 2000;

export async function executeMulticall(
  chainId: number,
  library: Web3Provider | undefined | any,
  request: MulticallRequestConfig<any>
) {
  // Try to use rpc provider of the connected wallet
  let provider = library ? library.getSigner().provider : undefined;

  // Wait for initialization to chech the network
  await provider?.ready;

  // If the wallet is not connected or the network does not match the chainId of the request, create a new rpc provider
  if (!provider || provider.network?.chainId !== chainId) {
    const rpcUrl = getRpcUrl(chainId);

    provider = new ethers.providers.StaticJsonRpcProvider(rpcUrl, { chainId, name: CHAIN_NAMES_MAP[chainId] });
  }

  const multicall = getMulticallLib(provider);

  const formattedReq = formatMulticallRequest(request);

  const requestPromise = Promise.race([
    multicall.call(formattedReq),
    sleep(MAX_TIMEOUT).then(() => Promise.reject("rpc timeout")),
  ]).catch((e) => {
    const fallbackProvider = getFallbackProvider(chainId);

    if (!fallbackProvider) {
      throw e;
    }

    // eslint-disable-next-line no-console
    console.log(`using multicall fallback for chain ${chainId}`);

    const multicall = getMulticallLib(fallbackProvider);

    return multicall.call(formattedReq);
  });

  return requestPromise
    .then((res) => formatMulticallResult(res.results))
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error("multicall error", e);

      throw e;
    });
}

function getMulticallLib(provider: ethers.providers.Provider) {
  return new Multicall({
    // @ts-ignore inconsistent provider types
    ethersProvider: provider,
    tryAggregate: true,
  });
}

function formatMulticallRequest(requestConfig: MulticallRequestConfig<any>): ContractCallContext[] {
  const result = Object.keys(requestConfig).reduce((contracts, contractField) => {
    const contractConfig = requestConfig[contractField];

    // ignore empty contract configs
    if (!contractConfig || Object.keys(contractConfig.calls).length === 0) return contracts;

    contracts.push({
      reference: contractField,
      ...contractConfig,
      calls: Object.keys(contractConfig.calls).reduce((calls, callField) => {
        const callConfig = contractConfig.calls[callField];

        // ignore empty calls
        if (!callConfig) return calls;

        calls.push({
          reference: callField,
          methodName: callConfig.methodName,
          methodParameters: callConfig.params,
        });

        return calls;
      }, [] as CallContext[]),
    });

    return contracts;
  }, [] as ContractCallContext[]);

  return result;
}

function formatMulticallResult(response: ContractCallResults["results"]): MulticallResult<any> {
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

function formatReturnValue(val: any) {
  // etherium-multicall doesn't parse BigNumbers automatically
  if (val?.type === "BigNumber") {
    return bigNumberify(val);
  }

  return val;
}
