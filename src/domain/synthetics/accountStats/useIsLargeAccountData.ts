import { useMemo } from "react";
import useSWR from "swr";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { getIndexerUrl } from "config/indexers";
import { getTimePeriodsInSeconds } from "lib/dates";
import { expandDecimals } from "lib/numbers";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { bigMath } from "sdk/utils/bigmath";
import graphqlFetcher from "sdk/utils/graphqlFetcher";

const LARGE_ACCOUNT_CHAINS = [ARBITRUM, AVALANCHE];
const TIME_PERIODS = getTimePeriodsInSeconds();

const accountVolumeStatsQuery = /* GraphQL */ `
  query AccountVolumeStats($account: String!, $from14: Int, $to14: Int, $from30: Int, $to30: Int) {
    total: accountStatById(id: $account) {
      volume
    }
    monthly: periodAccountVolume(where: { account: $account }) {
      maxDailyVolume
    }
    periodAccountStats14Days: periodAccountStats(where: { id_eq: $account, from: $from14, to: $to14 }) {
      volume
    }
    periodAccountStats30Days: periodAccountStats(where: { id_eq: $account, from: $from30, to: $to30 }) {
      volume
    }
  }
`;

// Thresholds to recognise large accounts
const MAX_DAILY_VOLUME = expandDecimals(340_000n, USD_DECIMALS);
const AGG_14_DAYS_VOLUME = expandDecimals(1_800_000n, USD_DECIMALS);
const AGG_ALL_TIME_VOLUME = expandDecimals(5_800_000n, USD_DECIMALS);

export function useIsLargeAccountData(account?: string) {
  const { data, error, isLoading } = useIsLargeAccountVolumeStats({ account });

  const isLargeAccount = useMemo(() => {
    if (!data || isLoading || error) return undefined;

    const { totalVolume, maxDailyVolumeInLast30Days, last14DaysVolume } = data;

    return (
      maxDailyVolumeInLast30Days >= MAX_DAILY_VOLUME ||
      last14DaysVolume >= AGG_14_DAYS_VOLUME ||
      totalVolume >= AGG_ALL_TIME_VOLUME
    );
  }, [data, isLoading, error]);

  return isLargeAccount;
}
export function useIsLargeAccountVolumeStats(params: { account?: string }) {
  const { account } = params;

  const { data, error, isLoading } = useSWR<{
    totalVolume: bigint;
    maxDailyVolumeInLast30Days: bigint;
    last14DaysVolume: bigint;
    last30DaysVolume: bigint;
  }>(account ? ["useIsLargeAccountVolumeStats", account] : null, {
    refreshInterval: CONFIG_UPDATE_INTERVAL,
    fetcher: async () => {
      const [from14, to14] = TIME_PERIODS.last14Days;
      const [from30, to30] = TIME_PERIODS.month;

      const chainPromises = LARGE_ACCOUNT_CHAINS.map(async (chainId) => {
        const url = getIndexerUrl(chainId, "subsquid");
        if (!url) {
          return {
            totalVolume: 0n,
            maxDailyVolumeInLast30Days: 0n,
            last14DaysVolume: 0n,
            last30DaysVolume: 0n,
          };
        }

        const res = await graphqlFetcher<{
          total: { volume: string };
          monthly: { maxDailyVolume: string };
          periodAccountStats14Days: Array<{ volume: string }>;
          periodAccountStats30Days: Array<{ volume: string }>;
        }>(url, accountVolumeStatsQuery, { account, from14, to14, from30, to30 });

        const totalVolume = BigInt(res?.total?.volume ?? 0);
        const monthly = res?.monthly;
        const last30DaysVolume = BigInt(res?.periodAccountStats30Days?.[0]?.volume ?? 0);
        const last14DaysVolume = BigInt(res?.periodAccountStats14Days?.[0]?.volume ?? 0);

        return {
          totalVolume,
          maxDailyVolumeInLast30Days: BigInt(monthly?.maxDailyVolume ?? 0),
          last14DaysVolume,
          last30DaysVolume,
        };
      });

      const chainResults = await Promise.all(chainPromises);
      const totalVolume = chainResults.reduce((acc, result) => acc + result.totalVolume, 0n);

      const { maxDailyVolumeInLast30Days, last14DaysVolume, last30DaysVolume } = chainResults.reduce(
        (acc, result) => ({
          maxDailyVolumeInLast30Days: bigMath.max(acc.maxDailyVolumeInLast30Days, result.maxDailyVolumeInLast30Days),
          last14DaysVolume: acc.last14DaysVolume + result.last14DaysVolume,
          last30DaysVolume: acc.last30DaysVolume + result.last30DaysVolume,
        }),
        { maxDailyVolumeInLast30Days: 0n, last14DaysVolume: 0n, last30DaysVolume: 0n }
      );

      return {
        totalVolume,
        maxDailyVolumeInLast30Days,
        last14DaysVolume,
        last30DaysVolume,
      };
    },
  });

  return useMemo(() => ({ data, error, isLoading }), [data, error, isLoading]);
}
