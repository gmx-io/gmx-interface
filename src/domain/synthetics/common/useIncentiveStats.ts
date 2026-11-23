import { addDays, set, startOfWeek } from "date-fns";
import mapValues from "lodash/mapValues";
import { useMemo } from "react";
import useSWR from "swr";

import { isSolanaNetwork } from "config/chains";
import { useChainId } from "lib/chains";
import type { RawIncentivesStats } from "lib/oracleKeeperFetcher";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import { ContractsChainId } from "sdk/configs/chains";

export default function useIncentiveStats(overrideChainId?: number) {
  const { chainId: defaultChainId, networkId } = useChainId();
  const isEvm = !isSolanaNetwork(networkId);
  const chainId = overrideChainId ?? defaultChainId;
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId as ContractsChainId);

  const { data } = useSWR<RawIncentivesStats | null>(isEvm ? ["incentiveStats", chainId] : null, async () => {
    if (!oracleKeeperFetcher) {
      return null;
    }
    return oracleKeeperFetcher.fetchIncentivesRewards();
  });

  return isEvm ? data ?? null : null;
}

export const useLiquidityProvidersIncentives = (chainId: number) => {
  const lpStats = useIncentiveStats(chainId)?.lp;

  return useMemo(() => {
    if (!lpStats || !lpStats.isActive) return null;
    return {
      totalRewards: BigInt(lpStats.totalRewards),
      period: lpStats.period,
      rewardsPerMarket: mapValues(lpStats.rewardsPerMarket, (x) => BigInt(x)),
      token: lpStats.token,
      excludeHolders: lpStats.excludeHolders,
    };
  }, [lpStats]);
};

export const useTradingIncentives = (chainId: number) => {
  const incentiveStats = useIncentiveStats(chainId);

  const startOfPeriod = useMemo(() => {
    const currentDate = new Date();
    const thisWeekWednesday = addDays(startOfWeek(currentDate), 3);
    const wednesday =
      currentDate.valueOf() > thisWeekWednesday.valueOf() ? thisWeekWednesday : addDays(thisWeekWednesday, -7);
    const timezoneOffset = currentDate.getTimezoneOffset() * 60;

    return (
      Math.floor(set(wednesday, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 }).valueOf() / 1000) -
      timezoneOffset
    );
  }, []);

  return useMemo(() => {
    const raw = incentiveStats?.trading;
    if (!raw || !raw.isActive) {
      return null;
    }

    const maxRebatePercent = BigInt(raw.maxRebatePercent);
    if (maxRebatePercent === 0n) return null;

    const estimatedRebatePercent = BigInt(raw.estimatedRebatePercent);

    const allocation = BigInt(raw.allocation);
    const nextPeriodStart = addDays(new Date(startOfPeriod * 1000), 7);

    return {
      allocation,
      period: raw.period,
      nextPeriodStart,
      maxRebatePercent,
      estimatedRebatePercent,
      token: raw.token,
    };
  }, [incentiveStats, startOfPeriod]);
};
