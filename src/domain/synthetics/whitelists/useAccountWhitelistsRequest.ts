import { useMemo } from "react";
import useSWR from "swr";
import { zeroAddress } from "viem";

import { getUiApiCacheKey } from "config/api";
import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { useIsWalletInitializing } from "lib/wallets/useIsWalletInitializing";
import type { ContractsChainId } from "sdk/configs/chains";
import type { AccountWhitelists } from "sdk/utils/whitelists/types";

const ACCOUNT_WHITELISTS_REFRESH_INTERVAL = 5 * 60 * 1000;

export type AccountWhitelistsResult = {
  accountWhitelists: AccountWhitelists | undefined;
  error?: Error;
};

export function useAccountWhitelistsRequest(
  chainId: ContractsChainId,
  account: string | undefined,
  options: { enabled: boolean }
): AccountWhitelistsResult {
  const sdk = useGmxSdk(chainId);
  const isWalletInitializing = useIsWalletInitializing();
  const apiCacheKey = getUiApiCacheKey(chainId);
  const address = account ?? zeroAddress;

  const { data, error } = useSWR(
    options.enabled && sdk && !isWalletInitializing ? ["accountWhitelists", apiCacheKey, address] : null,
    () => sdk!.fetchWhitelists({ address }),
    {
      refreshInterval: ACCOUNT_WHITELISTS_REFRESH_INTERVAL,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  return useMemo(() => ({ accountWhitelists: data, error }), [data, error]);
}
