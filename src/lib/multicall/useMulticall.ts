import { useRef } from "react";
import useSWR, { SWRConfiguration } from "swr";

import type { SWRGCMiddlewareConfig } from "lib/swrMiddlewares";

import type { CacheKey, MulticallRequestConfig, MulticallResult, SkipKey } from "./types";
import { executeMulticallWorker } from "./executeMulticallWorker";
import { executeMulticall } from "./executeMulticall";

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
    refreshInterval?: number | null;
    clearUnusedKeys?: boolean;
    keepPreviousData?: boolean;
    request: TConfig | ((chainId: number, key: CacheKey) => TConfig | Promise<TConfig>);
    parseResponse?: (result: MulticallResult<TConfig>, chainId: number, key: CacheKey) => TResult;
    inWorker?: boolean;
  }
) {
  let swrFullKey = Array.isArray(params.key) && chainId && name ? [chainId, name, ...params.key] : null;

  const swrOpts: SWRConfiguration & SWRGCMiddlewareConfig = {
    clearUnusedKeys: params.clearUnusedKeys,
    keepPreviousData: params.keepPreviousData,
  };

  // SWR resets global options if pass undefined explicitly
  if (params.refreshInterval !== undefined) {
    swrOpts.refreshInterval = params.refreshInterval || undefined;
  }

  const successDataByChainIdRef = useRef<Record<number, MulticallResult<any>>>({});

  const { data, mutate } = useSWR<TResult | undefined>(swrFullKey, {
    ...swrOpts,
    fetcher: async () => {
      performance.mark(`multicall-${name}-start`);
      try {
        // prettier-ignore
        const request = typeof params.request === "function"
            ? await params.request(chainId, params.key as CacheKey)
            : params.request;

        if (Object.keys(request).length === 0) {
          throw new Error(`Multicall request is empty`);
        }

        let responseOrFailure: any;

        let priority: "urgent" | "background" = "urgent";
        if (successDataByChainIdRef.current[chainId] !== undefined && typeof params.refreshInterval === "number") {
          priority = "background";
        }

        console.log(Date.now(), { priority });

        responseOrFailure = await executeMulticall(chainId, request, priority);

        if (responseOrFailure?.success) {
          successDataByChainIdRef.current[chainId] = responseOrFailure;
        }

        const response = successDataByChainIdRef.current[chainId];

        if (!response) {
          throw new Error(`Multicall response is empty`);
        }

        // prettier-ignore
        const result = typeof params.parseResponse === "function"
            ? params.parseResponse(response, chainId, params.key as CacheKey)
            : response;

        return result as TResult;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`Multicall request failed: ${name}`, e);

        throw e;
      } finally {
        performance.mark(`multicall-${name}-end`);
        performance.measure(`multicall-${name}`, `multicall-${name}-start`, `multicall-${name}-end`);
      }
    },
  });

  return {
    data,
    mutate,
    isLoading: Boolean(swrFullKey) && !data,
  };
}
