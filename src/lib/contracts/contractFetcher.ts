import { Provider, Result, Signer, ethers } from "ethers";
import { stableHash } from "swr/_internal";

import { getFallbackProvider, getProvider } from "../rpc";
import { executeMulticall } from "lib/multicall";
import { swrCache, SWRConfigProp } from "App/swrConfig";

export const contractFetcher =
  <T>(signer: Provider | Signer | undefined, contractInfo: any, additionalArgs?: any[]) =>
  (args: any): Promise<T> => {
    // eslint-disable-next-line
    const [id, chainId, arg0, arg1, ...params] = args;
    const provider = isProvider(signer) ? signer : getProvider(signer, chainId);

    let priority: "urgent" | "background" = "urgent";

    const hasData = swrCache.get(stableHash(args))?.isLoading === false;

    let isInterval = false;

    // Contract fetchers are always called with default or custom refreshInterval, never null.
    // Thus we can safely assume that refreshInterval is a number or a function.
    if (typeof SWRConfigProp.refreshInterval === "number") {
      isInterval = true;
    } else if (hasData && SWRConfigProp.refreshInterval?.(swrCache.get(stableHash(args))?.data)) {
      isInterval = true;
    }

    if (hasData && isInterval) {
      priority = "background";
    }

    const method = ethers.isAddress(arg0) ? arg1 : arg0;

    const contractCall = fetchContractData({
      chainId,
      provider,
      contractInfo,
      arg0,
      arg1,
      method,
      params,
      additionalArgs,
      priority,
    });

    let shouldCallFallback = true;

    const handleFallback = async (resolve, reject, error) => {
      if (!shouldCallFallback) {
        return;
      }
      // prevent fallback from being called twice
      shouldCallFallback = false;

      const fallbackProvider = getFallbackProvider(chainId);

      if (!fallbackProvider) {
        reject(error);
        return;
      }

      // eslint-disable-next-line no-console
      console.info("using fallbackProvider for", method);
      const fallbackContractCall = fetchContractData({
        chainId,
        provider: fallbackProvider,
        contractInfo,
        arg0,
        arg1,
        method,
        params,
        additionalArgs,
        priority,
      });

      fallbackContractCall
        ?.then((result) => resolve(result))
        .catch((e) => {
          // eslint-disable-next-line no-console
          console.error("fallback fetcher error", id, contractInfo.contractName, method, e);

          const errorStack = e.stack;
          const connectionUrl = fallbackProvider.provider._getConnection().url;

          const error = new Error(
            `Fallback fetcher error ${e} url=${connectionUrl} method=${method} chainId=${chainId}`
          );

          if (errorStack) {
            error.stack = errorStack;
          }

          throw error;
        });
    };

    return new Promise(async (resolve, reject) => {
      contractCall
        ?.then((result) => {
          shouldCallFallback = false;
          resolve(result);
        })
        .catch((e) => {
          // eslint-disable-next-line no-console
          console.error("fetcher error", id, contractInfo.contractName, method, e);
          handleFallback(resolve, reject, e);
        });

      setTimeout(() => {
        handleFallback(resolve, reject, "contractCall timeout");
      }, 2000);
    });
  };

async function fetchContractData({
  chainId,
  provider,
  contractInfo,
  arg0,
  arg1,
  method,
  params,
  additionalArgs,
  priority,
}: {
  chainId: number;
  provider: Provider | Signer | undefined;
  contractInfo: any;
  arg0: any;
  arg1: any;
  method: any;
  params: any;
  additionalArgs: any;
  priority: "urgent" | "background";
}): Promise<any | undefined> {
  if (ethers.isAddress(arg0)) {
    const address = arg0;
    const contract = new ethers.Contract(address, contractInfo.abi, provider);

    const result = await executeMulticall(
      chainId,
      {
        getContractCall: {
          abi: contractInfo.abi,
          contractAddress: address,
          calls: {
            call: {
              methodName: method,
              params: additionalArgs ? params.concat(additionalArgs) : params,
            },
          },
        },
      },
      priority
    );

    const outputs = contract.interface.getFunction(method)!.outputs;

    const outputsCount = outputs.length;

    const value = result.data?.getContractCall?.call.returnValues;

    if (outputsCount === 1 && !outputs[0].isArray()) {
      return value[0];
    }

    const names = outputs.map((output) => output.name);

    const dict = Result.fromItems(value as any[], names);

    return dict;
  }

  if (!provider) {
    return;
  }

  return provider[method](arg1, ...params);
}

function isProvider(signerOrProvider: Provider | Signer | undefined): signerOrProvider is Provider {
  if (!signerOrProvider) return false;
  return !!(signerOrProvider as Signer).populateCall;
}
