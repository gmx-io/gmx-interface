import { useWeb3React } from "@web3-react/core";
import useSWR from "swr";
import { MulticallRequestConfig, MulticallResult } from "./types";
import { executeMulticall, formatMulticallRequest, formatMulticallResult } from "./utils";

/**
 * TODO: Update swr to 1.1 to allow use object-like keys safely
 * @see https://swr.vercel.app/docs/arguments#passing-objects
 */
type CacheKey = string | number | boolean | null | undefined;
type SkipKey = null | undefined | false;

export function useMulticall<TConfig extends MulticallRequestConfig<any>, TResult = MulticallResult<TConfig>>(
  chainId: number,
  name: string,
  key: CacheKey[] | SkipKey,
  params: {
    request: TConfig | ((chainId: number, key: CacheKey[]) => TConfig);
    parseResponse?: (result: MulticallResult<TConfig>, chainId: number, key: CacheKey[]) => TResult;
  },
  opts: { aggregate?: boolean; refreshInterval?: number } = {}
) {
  const { library } = useWeb3React();

  const swrCacheKey = Array.isArray(key) ? [chainId, name, ...key] : null;

  const swrResult = useSWR<TResult | undefined>(swrCacheKey, {
    fetcher: async () => {
      // prettier-ignore
      const request = typeof params.request === "function" 
        ? params.request(chainId, key as CacheKey[]) 
        : params.request;

      const requestContext = formatMulticallRequest(request);

      const multicallResponse = opts.aggregate
        ? await executeMulticall(chainId, library, requestContext)
        : await executeMulticall(chainId, library, requestContext);

      const formattedResponse = formatMulticallResult(multicallResponse.results);

      // prettier-ignore
      const result = typeof params.parseResponse === "function" 
        ? params.parseResponse(formattedResponse, chainId, key as CacheKey[]) 
        : formattedResponse;

      return result as TResult;
    },
  });

  return swrResult;
}
