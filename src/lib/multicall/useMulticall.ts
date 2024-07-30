import { useEffect, useRef } from "react";
import useSWR, { SWRConfiguration, useSWRConfig } from "swr";
import { stableHash } from "swr/_internal";

import type { SWRGCMiddlewareConfig } from "lib/swrMiddlewares";

import { debugLog } from "./debug";
import { executeMulticall } from "./executeMulticall";
import type { CacheKey, MulticallRequestConfig, MulticallResult, SkipKey } from "./types";

/**
 * A global map manages refresh intervals for shared SWR keys to centralize revalidation
 * and avoid excessive refreshes when `mutate` is called.
 *
 * We store interval in order to keep only the most frequent interval for a key.
 */
const refreshTimerMap: Record<
  string,
  {
    id: number;
    interval: number;
  }
> = {};

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

  const successDataByChainIdRef = useRef<Record<number, MulticallResult<any>>>({});

  const { data, mutate } = useSWR<TResult | undefined>(swrFullKey, {
    ...swrOpts,
    // Manually trigger refetch with `mutate` to bypass waiting for request duration. Set `refreshInterval` to 0.
    // Reference: https://github.com/vercel/swr/discussions/860#discussioncomment-261823
    refreshInterval: 0,
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

        throw e;
      } finally {
        performance.mark(`multicall-${name}-end`);
        performance.measure(`multicall-${name}`, `multicall-${name}-start`, `multicall-${name}-end`);
      }
    },
  });

  const defaultConfigRefreshInterval = defaultConfig.refreshInterval;

  useEffect(() => {
    if (params.refreshInterval === null) {
      return;
    }

    if (params.refreshInterval === undefined && defaultConfigRefreshInterval === undefined) {
      return;
    }

    let refreshInterval = 0;

    if (typeof params.refreshInterval === "number") {
      refreshInterval = params.refreshInterval;
    } else if (typeof defaultConfigRefreshInterval === "number") {
      refreshInterval = defaultConfigRefreshInterval;
    } else if (defaultConfigRefreshInterval && successDataByChainIdRef.current[chainId]) {
      refreshInterval = defaultConfigRefreshInterval(successDataByChainIdRef.current[chainId]);
    }

    if (!refreshInterval) {
      return;
    }

    const timer = refreshTimerMap[name];

    if (timer) {
      if (timer.interval <= refreshInterval) {
        // Old interval is shorter or equal, keep it
        return;
      } else {
        // The new interval is shorter, clear the old one
        clearInterval(timer.interval);
      }
    }

    const intervalId = window.setInterval(() => {
      mutate();
    }, refreshInterval);

    refreshTimerMap[name] = {
      id: intervalId,
      interval: refreshInterval,
    };

    return () => {
      clearInterval(intervalId);
      delete refreshTimerMap[name];
    };
  }, [chainId, defaultConfigRefreshInterval, mutate, name, params.refreshInterval]);

  return {
    data,
    mutate,
    isLoading: Boolean(swrFullKey) && !data,
  };
}
