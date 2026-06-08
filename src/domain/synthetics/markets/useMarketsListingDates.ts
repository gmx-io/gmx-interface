import { useMemo } from "react";
import useSWR from "swr";

import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import type { ContractsChainId } from "sdk/configs/chains";

export type MarketsListingDates = Record<string, number>;

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
        if (!m.listingDate || !m.indexToken) continue;
        const ts = Date.parse(m.listingDate);
        if (Number.isFinite(ts)) {
          map[m.indexToken] = ts;
        }
      }
      return map;
    },
    {
      revalidateOnFocus: false,
    }
  );

  return useMemo(() => ({ listingDateByIndexToken: data ?? {}, isLoading }), [data, isLoading]);
}
