import { useMemo } from "react";
import useSWR from "swr";

import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import type { ContractsChainId } from "sdk/configs/chains";

export type MarketsListingDates = Record<string, number>;

/**
 * Returns a map of `indexTokenAddress` (lowercased) → `listingDate` (unix ms),
 * sourced from the `/markets` API endpoint. Markets without a listing date
 * are omitted from the map.
 *
 * The 30-day "recently listed" predicate consumes this map.
 */
export function useMarketsListingDates(chainId: ContractsChainId): {
  listingDateByIndexToken: MarketsListingDates;
  isLoading: boolean;
} {
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);

  const { data, isLoading } = useSWR(
    ["markets-listing-dates", chainId],
    async () => {
      const markets = await oracleKeeperFetcher.fetchMarkets();
      const map: MarketsListingDates = {};
      for (const m of markets) {
        if (m.listingDate !== undefined && m.indexTokenAddress) {
          map[m.indexTokenAddress.toLowerCase()] = m.listingDate;
        }
      }
      return map;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5 * 60 * 1000, // 5 minutes — listing dates rarely change
    }
  );

  return useMemo(() => ({ listingDateByIndexToken: data ?? {}, isLoading }), [data, isLoading]);
}
