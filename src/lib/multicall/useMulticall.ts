import { useWeb3React } from "@web3-react/core";
import { useEffect } from "react";
import useSWR from "swr";
import { MulticallBatcher } from "./batcher";
import { CacheKey, MulticallRequestConfig, MulticallResult, SkipKey } from "./types";
import { executeMulticall, formatMulticallRequest, formatMulticallResult } from "./utils";

const batcher = new MulticallBatcher();

export function useMulticall<TConfig extends MulticallRequestConfig<any>, TResult = MulticallResult<TConfig>>(
  chainId: number,
  name: string,
  key: CacheKey | SkipKey,
  params: {
    request: TConfig | ((chainId: number, key: CacheKey) => TConfig);
    parseResponse?: (result: MulticallResult<TConfig>, chainId: number, key: CacheKey) => TResult;
  },
  opts: { aggregate?: boolean; refreshInterval?: number } = {}
) {
  const { library } = useWeb3React();

  const swrFullKey = Array.isArray(key) ? [chainId, name, ...key] : null;

  const swrOpts: any = {};

  // SWR resets options if pass undefined explicitly
  if (opts.refreshInterval) {
    swrOpts.refreshInterval = opts.refreshInterval;
  }

  const swrResult = useSWR<TResult | undefined>(swrFullKey, {
    ...swrOpts,
    fetcher: async (...fullKey: CacheKey) => {
      // prettier-ignore
      const request = typeof params.request === "function" 
        ? params.request(chainId, key as CacheKey) 
        : params.request;

      const requestContext = formatMulticallRequest(request);

      try {
        const multicallResponse = true
          ? await batcher.registerRequest(chainId, requestContext, fullKey)
          : await executeMulticall(chainId, library, requestContext, name);

        const formattedResponse = formatMulticallResult(multicallResponse.results);

        // prettier-ignore
        const result = typeof params.parseResponse === "function" 
            ? params.parseResponse(formattedResponse, chainId, key as CacheKey) 
            : formattedResponse;

        return result as TResult;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("useMulticall error", e);

        throw e;
      }
    },
  });

  useEffect(() => {
    batcher.setLibrary(library);
  }, [library]);

  return swrResult;
}
