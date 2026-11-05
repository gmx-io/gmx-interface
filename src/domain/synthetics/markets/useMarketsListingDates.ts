import { useMemo } from "react";
import useSWR from "swr";

import { isSolanaNetwork } from "config/chains";
import { useChainId } from "lib/chains";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import type { ContractsChainId } from "sdk/configs/chains";

export type MarketsListingDates = Record<string, number>;

export function useMarketsListingDates(chainId: ContractsChainId): {
  listingDateByIndexToken: MarketsListingDates;
  isLoading: boolean;
} {
  const { networkId } = useChainId();
  const isSolana = isSolanaNetwork(networkId);
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);

  const { data, isLoading } = useSWR(
    isSolana ? null : ["markets-listing-dates", chainId],
    async () => {
      const markets = await oracleKeeperFetcher.fetchMarkets();
      const map: MarketsListingDates = {};
      for (const m of markets) {
        if (!m.listingDate || !m.indexToken) continue;
        const ts = Date.parse(m.listingDate);
        if (Number.isFinite(ts)) {
          map[m.indexToken] = Math.min(map[m.indexToken] ?? ts, ts);
        }
      }
      return map;
    },
    {
      revalidateOnFocus: false,
    }
  );

  // Solana has no confirmed listing dates yet; never reuse the EVM cache or migration date.
  return useMemo(
    () => ({ listingDateByIndexToken: isSolana ? {} : data ?? {}, isLoading: !isSolana && isLoading }),
    [data, isLoading, isSolana]
  );
}
