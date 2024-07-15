import useSWR from "swr";

import type { CacheKey, MulticallRequestConfig, MulticallResult, SkipKey } from "./types";
import { executeMulticall } from "./utils";

export function useMulticallMany<TConfig extends MulticallRequestConfig<any>, TResult = MulticallResult<TConfig>>(
  chainIds: number[],
  name: string,
  params: {
    key: CacheKey | SkipKey;
    request: { [chainId: string]: TConfig } | ((chainId: number, key: CacheKey) => TConfig);
    parseResponse?: (result: MulticallResult<TConfig>, chainId: number, key: CacheKey) => TResult;
  }
) {
  let swrFullKey = Array.isArray(params.key) && name ? [name, ...params.key] : null;

  const executeSingleMulticall = async (chainId: number, config: TConfig) => {
    if (Object.keys(config).length === 0) {
      throw new Error(`Multicall request is empty`);
    }

    let response: MulticallResult<TConfig> | undefined;

    try {
      response = await executeMulticall(chainId, config, name);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`Multicall request failed: ${name}`, e);
      throw e;
    }

    if (!response) {
      throw new Error(`Multicall response is empty`);
    }

    return response;
  };

  const { data, isLoading } = useSWR<{ [chainId: string]: TResult } | undefined>(swrFullKey, {
    fetcher: async () => {
      const promises = chainIds.map(async (chainId) => {
        const request =
          typeof params.request === "function"
            ? params.request(chainId, params.key as CacheKey)
            : params.request[chainId];

        const response = await executeSingleMulticall(chainId, request);

        const result =
          typeof params.parseResponse === "function"
            ? params.parseResponse(response, chainId, params.key as CacheKey)
            : response;

        return [chainId, result as TResult] as const;
      });

      const results = Object.fromEntries(await Promise.all(promises));

      return results;
    },
  });

  return {
    data,
    isLoading,
  };
}
