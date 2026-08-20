import { useMemo } from "react";
import useSWR from "swr";

import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

import { fetchIncentivesGraphql } from "./client";
import { LATEST_GT_PRICE_QUERY } from "./queries";
import { useIncentivesIndexerUrl } from "./useIncentivesIndexerUrl";

type RawGtPrice = {
  priceUsd: string;
  timestamp: number;
};

export type LatestGtPrice = {
  priceUsd: bigint;
  timestamp: number;
};

export function useLatestGtPrice(chainId: number, params: { enabled?: boolean } = {}) {
  const { enabled = true } = params;
  const endpoint = useIncentivesIndexerUrl(chainId);
  const swrKey = enabled && endpoint ? ["useLatestGtPrice", chainId, endpoint] : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<LatestGtPrice | null>(swrKey, {
    fetcher: async () => {
      const response = await fetchIncentivesGraphql<{ gtPrices: RawGtPrice[] }>(endpoint!, LATEST_GT_PRICE_QUERY);
      const latestPrice = response.gtPrices[0];

      if (!latestPrice) {
        return null;
      }

      return {
        priceUsd: BigInt(latestPrice.priceUsd),
        timestamp: latestPrice.timestamp,
      };
    },
    refreshInterval: CONFIG_UPDATE_INTERVAL,
    revalidateOnFocus: false,
  });

  return useMemo(
    () => ({ data, error, loading: isLoading, isValidating, mutate, endpoint }),
    [data, endpoint, error, isLoading, isValidating, mutate]
  );
}
