import useSWR from "swr";

import { GT_PRICES_INDEXER_URL } from "config/indexers";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

import { fetchIncentivesGraphql } from "./client";
import { GT_MINTING_STATS_QUERY } from "./queries";

type RawGtMintingStats = {
  totalMinted: string | null;
  remainingToNextStep: string | null;
};

export function useGtMintingStats() {
  return useSWR(
    ["gtMintingStats", GT_PRICES_INDEXER_URL],
    async ([, endpoint]) => {
      const { gtPriceSyncById: stats } = await fetchIncentivesGraphql<{
        gtPriceSyncById: RawGtMintingStats | null;
      }>(endpoint, GT_MINTING_STATS_QUERY);

      return {
        totalMinted: stats?.totalMinted != null ? BigInt(stats.totalMinted) : undefined,
        remainingToNextStep: stats?.remainingToNextStep != null ? BigInt(stats.remainingToNextStep) : undefined,
      };
    },
    { refreshInterval: CONFIG_UPDATE_INTERVAL, revalidateOnFocus: false }
  );
}
