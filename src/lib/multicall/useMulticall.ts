import { useWeb3React } from "@web3-react/core";
import useSWR from "swr";
import { CacheKey, MulticallRequestConfig, MulticallResult, SkipKey } from "./types";
import { executeMulticall } from "./utils";

/**
 * A hook to fetch data from contracts via multicall.
 * Preferably wrapped in custom hooks, such as useMarkets, usePositions, etc.
 *
 * @param chainId - on which network the request should be executed
 * @param name - an unique name for the request, used as a part of swr cache key
 * @param params.key - the cache key as an array, if a falsy value is passed, the request will be skipped
 * @param params.request - contract calls config or callback which returns it
 * @param params.parseResponse - optional callback to pre-process and format the response
 */
export function useMulticall<TConfig extends MulticallRequestConfig<any>, TResult = MulticallResult<TConfig>>(
  chainId: number,
  name: string,
  params: {
    key: CacheKey | SkipKey;
    refreshInterval?: number;
    request: TConfig | ((chainId: number, key: CacheKey) => TConfig);
    parseResponse?: (result: MulticallResult<TConfig>, chainId: number, key: CacheKey) => TResult;
  }
) {
  const { library } = useWeb3React();

  const swrFullKey = Array.isArray(params.key) && chainId && name ? [chainId, name, ...params.key] : null;

  const swrOpts: any = {};

  // SWR resets global options if pass undefined explicitly
  if (params.refreshInterval) {
    swrOpts.refreshInterval = params.refreshInterval;
  }

  const swrResult = useSWR<TResult | undefined>(swrFullKey, {
    ...swrOpts,
    fetcher: async () => {
      // prettier-ignore
      const request = typeof params.request === "function" 
        ? params.request(chainId, params.key as CacheKey) 
        : params.request;

      const response = await executeMulticall(chainId, library, request);

      // prettier-ignore
      const result = typeof params.parseResponse === "function" 
            ? params.parseResponse(response, chainId, params.key as CacheKey) 
            : response;

      return result as TResult;
    },
  });

  return swrResult;
}
