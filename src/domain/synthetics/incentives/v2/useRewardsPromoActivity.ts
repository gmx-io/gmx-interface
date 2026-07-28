import { useMemo } from "react";
import useSWR from "swr";
import { isAddress } from "viem";

import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

import { fetchIncentivesGraphql } from "./client";
import { REWARDS_PROMO_ACTIVITY_QUERY } from "./queries";
import { useIncentivesIndexerUrl } from "./useIncentivesIndexerUrl";

type RawRewardsPromoActivity = {
  accountNetPositionFeesLast4Months: { netPositionFeeUsd: string } | null;
  tradeActions: { timestamp: number }[];
};

export type RewardsPromoActivity = {
  netPositionFeeUsd: bigint;
  firstTradeTimestamp?: number;
};

export function useRewardsPromoActivity(chainId: number, params: { account?: string; enabled?: boolean }) {
  const { account, enabled = true } = params;
  const endpoint = useIncentivesIndexerUrl(chainId);
  const validAccount = account && isAddress(account) ? account : undefined;
  const swrKey =
    enabled && endpoint && validAccount ? ["useRewardsPromoActivity", chainId, endpoint, validAccount] : null;

  const { data, error, isLoading } = useSWR<RewardsPromoActivity>(swrKey, {
    fetcher: async () => {
      const response = await fetchIncentivesGraphql<RawRewardsPromoActivity>(endpoint!, REWARDS_PROMO_ACTIVITY_QUERY, {
        account: validAccount,
      });

      return {
        netPositionFeeUsd: BigInt(response.accountNetPositionFeesLast4Months?.netPositionFeeUsd ?? 0),
        firstTradeTimestamp: response.tradeActions[0]?.timestamp,
      };
    },
    refreshInterval: CONFIG_UPDATE_INTERVAL,
    revalidateOnFocus: false,
  });

  return useMemo(() => ({ data, error, loading: isLoading, endpoint }), [data, endpoint, error, isLoading]);
}
