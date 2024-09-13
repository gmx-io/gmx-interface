import { useRef } from "react";
import useSWR, { SWRConfiguration, useSWRConfig } from "swr";
import { stableHash } from "swr/_internal";

import type { SWRGCMiddlewareConfig } from "lib/swrMiddlewares";

import { metrics } from "lib/metrics";
import { debugLog } from "./debug";
import { executeMulticall } from "./executeMulticall";
import type { CacheKey, MulticallRequestConfig, MulticallResult, SkipKey } from "./types";
import { serializeMulticallErrors } from "./utils";

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
  }
) {
  const defaultConfig = useSWRConfig();
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

  const { data, mutate, error } = useSWR<TResult | undefined>(swrFullKey, {
    ...swrOpts,
    fetcher: async () => {
      performance.mark(`multicall-${name}-start`);
      try {
        let request: TConfig;
        {
          let startTime: number | undefined;

          debugLog(() => {
            startTime = Date.now();
          });

          // prettier-ignore
          request =
            typeof params.request === "function"
              ? await params.request(chainId, params.key as CacheKey)
              : params.request;

          debugLog(() => {
            const endTime = Date.now();
            const duration = endTime - (startTime ?? endTime);

            return `Multicall request generation for chainId: ${chainId} took ${duration}ms. Name: ${name}.`;
          });
        }

        if (Object.keys(request).length === 0) {
          throw new Error(`Multicall request is empty`);
        }

        let responseOrFailure: any;

        let priority: "urgent" | "background" = "urgent";

        const hasData = defaultConfig.cache.get(stableHash(swrFullKey))?.isLoading === false;

        let isInterval = false;
        if (typeof params.refreshInterval === "number") {
          isInterval = true;
        } else if (params.refreshInterval === undefined) {
          if (typeof defaultConfig.refreshInterval === "number") {
            isInterval = true;
          } else if (hasData && defaultConfig.refreshInterval?.(successDataByChainIdRef.current[chainId])) {
            isInterval = true;
          }
        }

        if (hasData && isInterval) {
          priority = "background";
        }

        {
          let startTime: number | undefined;

          debugLog(() => {
            startTime = Date.now();
          });

          responseOrFailure = await executeMulticall(chainId, request, priority, name);

          debugLog(() => {
            const endTime = Date.now();
            const duration = endTime - (startTime ?? endTime);

            return `Multicall execution and scheduling for chainId: ${chainId} took ${duration}ms. Name: ${name}. Priority: ${priority}.`;
          });
        }

        if (responseOrFailure?.success) {
          successDataByChainIdRef.current[chainId] = responseOrFailure;
        } else if (Object.keys(responseOrFailure.errors).length > 0) {
          throw new Error(`Response error ${serializeMulticallErrors(responseOrFailure.errors)}`);
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
        e.message = `Multicall request failed: ${name} ${e.message}`;

        metrics.pushError(e, "useMulticall");

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
    error: error as Error | undefined,
  };
}
