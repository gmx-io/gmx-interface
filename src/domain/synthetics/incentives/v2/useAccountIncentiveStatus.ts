import { useMemo } from "react";
import useSWR from "swr";
import { isAddress } from "viem";

import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";

import { fetchIncentivesGraphql, getIncentivesIndexerUrl } from "./client";
import { parseAccountIncentiveStatus, type RawAccountIncentiveStatus } from "./parsers";
import { ACCOUNT_INCENTIVE_STATUS_QUERY } from "./queries";
import type { AccountIncentiveStatus } from "./types";

export function useAccountIncentiveStatus(chainId: number, params: { account?: string; enabled?: boolean }) {
  const { account, enabled = true } = params;
  const endpoint = getIncentivesIndexerUrl(chainId);
  const validAccount = account && isAddress(account) ? account : undefined;
  const swrKey =
    enabled && endpoint && validAccount ? ["useAccountIncentiveV2Status", chainId, endpoint, validAccount] : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<AccountIncentiveStatus>(swrKey, {
    fetcher: async () => {
      const response = await fetchIncentivesGraphql<{ accountIncentiveStatus: RawAccountIncentiveStatus }>(
        endpoint!,
        ACCOUNT_INCENTIVE_STATUS_QUERY,
        { account: validAccount }
      );

      return parseAccountIncentiveStatus(response.accountIncentiveStatus);
    },
    refreshInterval: FREQUENT_UPDATE_INTERVAL,
    revalidateOnFocus: false,
  });

  return useMemo(
    () => ({ data, error, loading: isLoading, isValidating, mutate, endpoint }),
    [data, endpoint, error, isLoading, isValidating, mutate]
  );
}
