import { useMemo } from "react";
import useSWR from "swr";
import { isAddress } from "viem";

import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

import { fetchIncentivesGraphql, getIncentivesIndexerUrl } from "./client";
import { parseAccountRewardsHistoryPage, type RawRewardsHistoryEntry } from "./parsers";
import { ACCOUNT_REWARDS_HISTORY_QUERY } from "./queries";
import type { AccountRewardsHistoryPage } from "./types";

const MAX_PAGE_SIZE = 1000;
const COMPLETED_HISTORY_REFRESH_INTERVAL = 5 * CONFIG_UPDATE_INTERVAL;

export function useAccountRewardsHistory(
  chainId: number,
  params: { account?: string; enabled?: boolean; limit: number; offset: number }
) {
  const { account, enabled = true } = params;
  const endpoint = getIncentivesIndexerUrl(chainId);
  const validAccount = account && isAddress(account) ? account : undefined;
  const limit = Math.min(Math.max(Math.trunc(params.limit), 1), MAX_PAGE_SIZE);
  const offset = Math.max(Math.trunc(params.offset), 0);
  const swrKey =
    enabled && endpoint && validAccount
      ? ["useAccountRewardsV2History", chainId, endpoint, validAccount, limit, offset]
      : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<AccountRewardsHistoryPage>(swrKey, {
    fetcher: async () => {
      const response = await fetchIncentivesGraphql<{
        accountRewardsHistory: { totalCount: number; items: RawRewardsHistoryEntry[] };
      }>(endpoint!, ACCOUNT_REWARDS_HISTORY_QUERY, { account: validAccount, limit, offset });

      return parseAccountRewardsHistoryPage(response.accountRewardsHistory, limit, offset);
    },
    refreshInterval: offset === 0 ? CONFIG_UPDATE_INTERVAL : COMPLETED_HISTORY_REFRESH_INTERVAL,
    revalidateOnFocus: false,
  });

  return useMemo(
    () => ({
      data: data?.entries,
      totalCount: data?.totalCount,
      hasNextPage: data?.hasNextPage ?? false,
      error,
      loading: isLoading,
      isValidating,
      mutate,
      endpoint,
    }),
    [data, endpoint, error, isLoading, isValidating, mutate]
  );
}
