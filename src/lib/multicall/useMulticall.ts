import { useWeb3React } from "@web3-react/core";
import useSWR from "swr";
import { CacheKey, MulticallRequestConfig, MulticallResult, SkipKey } from "./types";
import { executeMulticall, formatMulticallRequest, formatMulticallResult } from "./utils";

export function useMulticall<TConfig extends MulticallRequestConfig<any>, TResult = MulticallResult<TConfig>>(
  chainId: number,
  name: string,
  params: {
    key: CacheKey | SkipKey;
    aggregate?: boolean;
    refreshInterval?: number;
    request: TConfig | ((chainId: number, key: CacheKey) => TConfig);
    parseResponse?: (result: MulticallResult<TConfig>, chainId: number, key: CacheKey) => TResult;
  }
) {
  const { library } = useWeb3React();

  const swrFullKey = Array.isArray(params.key) ? [chainId, name, ...params.key] : null;

  // SWR resets options if pass undefined explicitly
  const swrOpts: any = {};
  if (params.refreshInterval) {
    swrOpts.refreshInterval = params.refreshInterval;
  }

  const swrResult = useSWR<TResult | undefined>(swrFullKey, {
    ...swrOpts,
    fetcher: async (...fullKey: CacheKey) => {
      // prettier-ignore
      const request = typeof params.request === "function" 
        ? params.request(chainId, params.key as CacheKey) 
        : params.request;

      const requestContext = formatMulticallRequest(request);

      try {
        const multicallResponse = await executeMulticall(chainId, library, requestContext, name);

        const formattedResponse = formatMulticallResult(multicallResponse.results);

        // prettier-ignore
        const result = typeof params.parseResponse === "function" 
            ? params.parseResponse(formattedResponse, chainId, params.key as CacheKey) 
            : formattedResponse;

        return result as TResult;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("useMulticall error", e);

        throw e;
      }
    },
  });

  return swrResult;
}
