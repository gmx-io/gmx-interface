import { useWeb3React } from "@web3-react/core";
import { useMemo } from "react";
import useSWR from "swr";
import { MulticallRequestConfig, MulticallResult } from "./types";
import { formatMulticallRequest, formatMulticallResult, getMulticallLib } from "./utils";

export function useMulticall<TKeys extends string>(
  chainId: number,
  key: any[] | null,
  request: MulticallRequestConfig<TKeys>
) {
  const { library } = useWeb3React();
  const multicall = getMulticallLib(library, chainId);

  const fullKey = key ? [chainId, ...key] : null;

  const { data: swrData, ...swrState } = useSWR(fullKey, {
    fetcher: async () => {
      const requestContext = formatMulticallRequest(request);

      try {
        const res = await multicall.call(requestContext);

        return res;
      } catch (e) {
        throw e;
      }
    },
  });

  const data: MulticallResult<TKeys> | undefined = useMemo(
    () => (swrData ? formatMulticallResult(swrData) : undefined),
    [swrData]
  );

  return {
    data,
    ...swrState,
  };
}
