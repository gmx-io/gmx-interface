import { useHomePageContext } from "landing/pages/Home/contexts/HomePageContext";
import { useTotalVolume } from "landing/pages/Home/hooks/useTotalVolume";

import { ARBITRUM, AVALANCHE, MEGAETH } from "config/chains";
import {
  getProtocolStatsNetworkFreshness,
  useProtocolStatsSummary,
} from "domain/protocolStats/useProtocolStatsSummary";
import { parseProtocolStatsUsd } from "domain/protocolStats/utils";
import { V1_UNIQUE_USERS } from "domain/stats/v1Totals";
import useUsers from "domain/synthetics/stats/useUsers";
import { sumKnownBigInts } from "lib/sumBigInts";
import type { Freshness } from "lib/useSWRWithFreshness";

import {
  getStaleEntries,
  summarizeChainsStats,
  type ChainsStatsStaleEntry,
  type ChainsStatsSummary,
} from "components/StatsTooltip/summarizeChainsStats";

export type HeroStat = {
  summary: ChainsStatsSummary;
  staleEntries: ChainsStatsStaleEntry[];
};

const ARBITRUM_ENTRY = "Arbitrum";
const AVALANCHE_ENTRY = "Avalanche";
const MEGAETH_ENTRY = "MegaETH";
const SOLANA_ENTRY = "Solana";

// each figure is summed the way the dashboard sums it: a network that has not answered is named, never counted as zero
export function useHeroStats(): { traders: HeroStat; openInterest: HeroStat; totalVolume: HeroStat } {
  const { poolsData } = useHomePageContext();
  const arbitrumUsers = useUsers(ARBITRUM);
  const avalancheUsers = useUsers(AVALANCHE);
  const megaethUsers = useUsers(MEGAETH);
  const totalVolume = useTotalVolume();
  const gmtradeSummary = useProtocolStatsSummary({ networks: ["solana"] });
  const gmtradeStats = gmtradeSummary.data?.byNetwork.solana;
  const gmtradeFreshness = getProtocolStatsNetworkFreshness(gmtradeSummary, "solana");
  const staleEntriesOf = (evmFreshness: Freshness | undefined) =>
    getStaleEntries([evmFreshness, ARBITRUM_ENTRY, AVALANCHE_ENTRY], [gmtradeFreshness, SOLANA_ENTRY]);

  return {
    traders: {
      summary: summarizeChainsStats({
        [ARBITRUM_ENTRY]: sumKnownBigInts(V1_UNIQUE_USERS[ARBITRUM], arbitrumUsers?.totalUsers),
        [AVALANCHE_ENTRY]: sumKnownBigInts(V1_UNIQUE_USERS[AVALANCHE], avalancheUsers?.totalUsers),
        [MEGAETH_ENTRY]: megaethUsers?.totalUsers,
        [SOLANA_ENTRY]: gmtradeStats?.users.all ?? undefined,
      }),
      // the v1 part is a frozen constant (domain/stats/v1Totals), so only Solana can be stale here
      staleEntries: getStaleEntries([gmtradeFreshness, SOLANA_ENTRY]),
    },
    openInterest: {
      summary: summarizeChainsStats({
        [ARBITRUM_ENTRY]: poolsData.openInterestByChain?.[ARBITRUM],
        [AVALANCHE_ENTRY]: poolsData.openInterestByChain?.[AVALANCHE],
        [SOLANA_ENTRY]: parseProtocolStatsUsd(gmtradeStats?.openInterest?.total),
      }),
      staleEntries: staleEntriesOf(poolsData.openInterestFreshness),
    },
    totalVolume: {
      summary: summarizeChainsStats({
        [ARBITRUM_ENTRY]: totalVolume.data?.[ARBITRUM],
        [AVALANCHE_ENTRY]: totalVolume.data?.[AVALANCHE],
        [SOLANA_ENTRY]: parseProtocolStatsUsd(gmtradeStats?.volume.total),
      }),
      staleEntries: staleEntriesOf(totalVolume.freshness),
    },
  };
}
