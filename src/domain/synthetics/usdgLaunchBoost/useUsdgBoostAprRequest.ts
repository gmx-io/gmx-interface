import { useMemo } from "react";
import useSWR from "swr";

import { getUiApiCacheKey } from "config/api";
import { ARBITRUM } from "config/chains";
import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import type { ContractsChainId } from "sdk/configs/chains";
import type { UsdgBoostAprResponse } from "sdk/utils/usdgBoostApr/types";

const USDG_BOOST_APR_REFRESH_INTERVAL = 5 * 60 * 1000;

export type UsdgBoostAprResult = {
  usdgBoostAprResponse: UsdgBoostAprResponse | undefined;
  error?: Error;
};

export function useUsdgBoostAprRequest(chainId: ContractsChainId, options: { enabled: boolean }): UsdgBoostAprResult {
  const sdk = useGmxSdk(chainId);
  const apiCacheKey = getUiApiCacheKey(chainId);

  const { data, error } = useSWR(
    options.enabled && chainId === ARBITRUM && sdk ? ["usdgBoostApr", apiCacheKey] : null,
    () => sdk!.fetchUsdgBoostApr(),
    {
      refreshInterval: USDG_BOOST_APR_REFRESH_INTERVAL,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  return useMemo(() => ({ usdgBoostAprResponse: data, error }), [data, error]);
}
