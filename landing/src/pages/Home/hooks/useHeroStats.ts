import { useHomePageContext } from "landing/pages/Home/contexts/HomePageContext";
import { useTotalVolume } from "landing/pages/Home/hooks/useTotalVolume";

import { ARBITRUM, AVALANCHE, MEGAETH } from "config/chains";
import {
  getProtocolStatsNetworkFreshness,
  useProtocolStatsSummary,
} from "domain/protocolStats/useProtocolStatsSummary";
import { parseProtocolStatsUsd } from "domain/protocolStats/utils";
import useUniqueUsers from "domain/stats/useUniqueUsers";
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
  const uniqueUsers = useUniqueUsers();
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
        [ARBITRUM_ENTRY]: sumKnownBigInts(uniqueUsers.data?.[ARBITRUM], arbitrumUsers?.totalUsers),
        [AVALANCHE_ENTRY]: sumKnownBigInts(uniqueUsers.data?.[AVALANCHE], avalancheUsers?.totalUsers),
        [MEGAETH_ENTRY]: megaethUsers?.totalUsers,
        [SOLANA_ENTRY]: gmtradeStats?.users.all ?? undefined,
      }),
      staleEntries: staleEntriesOf(uniqueUsers.freshness),
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
