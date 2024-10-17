import { useMemo } from "react";
import { USD_DECIMALS } from "config/factors";
import { expandDecimals } from "lib/numbers";

import { gql } from "@apollo/client";
import { getSubsquidGraphClient } from "lib/subgraph";
import useSWR from "swr";
import { subDays, format, eachDayOfInterval } from "date-fns";
import { toUtcDayStart } from "lib/dates";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { ARBITRUM, AVALANCHE } from "config/chains";

const LARGE_ACCOUNT_CHAINS = [ARBITRUM, AVALANCHE];

// Thresholds to recognise large accounts
const MAX_DAILY_VOLUME = expandDecimals(220_000n, USD_DECIMALS);
const AGG_14_DAYS_VOLUME = expandDecimals(1_200_000n, USD_DECIMALS);
const AGG_ALL_TIME_VOLUME = expandDecimals(3_500_000n, USD_DECIMALS);

export function useIsLargeAccountData(account?: string) {
  const { data, error, isLoading } = useIsLargeAccountVolumeStats({ account });

  const isLargeAccount = useMemo(() => {
    if (!data || isLoading || error) return undefined;

    const { totalVolume, dailyVolume } = data;

    const maxDailyVolume = dailyVolume.reduce((max, day) => (day.volume > max ? day.volume : max), 0n);

    const last14DaysVolume = dailyVolume.slice(-14).reduce((acc, day) => acc + day.volume, 0n);

    return (
      maxDailyVolume >= MAX_DAILY_VOLUME || last14DaysVolume >= AGG_14_DAYS_VOLUME || totalVolume >= AGG_ALL_TIME_VOLUME
    );
  }, [data, isLoading, error]);

  return isLargeAccount;
}

function useIsLargeAccountVolumeStats(params: { account?: string }) {
  const { account } = params;

  const now = new Date();
  const date30dAgo = subDays(now, 30);
  const last30dList = eachDayOfInterval({
    start: date30dAgo,
    end: now,
  });

  const { data, error, isLoading } = useSWR<{
    totalVolume: bigint;
    dailyVolume: { date: string; volume: bigint }[];
  }>(account ? ["useIsLargeAccountVolumeStats", account] : null, {
    refreshInterval: CONFIG_UPDATE_INTERVAL,
    fetcher: async () => {
      const chainPromises = LARGE_ACCOUNT_CHAINS.map(async (chainId) => {
        const client = getSubsquidGraphClient(chainId);

        const dailyQueries = last30dList.map((day, index) => {
          const from = Math.floor(toUtcDayStart(day));
          const to = Math.floor(toUtcDayStart(day) + 24 * 60 * 60);

          return `
              day${index}: periodAccountStats(
                where: { id_eq: "${account}", from: ${from}, to: ${to} }
              ) {
                volume
              }
            `;
        });

        const query = gql`
            query AccountVolumeStats {
              total: accountStats(where: { id_eq: "${account}" }) {
                volume
              }
              ${dailyQueries.join("\n")}
            }
          `;

        const res = await client?.query({
          query,
          fetchPolicy: "no-cache",
        });

        const totalVolume = BigInt(res?.data?.total?.[0]?.volume ?? 0);

        const dailyVolume = last30dList.map((day, index) => {
          const volume = BigInt(res?.data[`day${index}`]?.[0]?.volume ?? 0);
          return {
            date: format(day, "yyyy-MM-dd"),
            volume,
          };
        });

        return {
          totalVolume,
          dailyVolume,
        };
      });

      const chainResults = await Promise.all(chainPromises);

      const totalVolume = chainResults.reduce((acc, result) => acc + result.totalVolume, 0n);

      const dailyVolume = last30dList.map((day, index) => {
        const volume = chainResults.reduce((acc, { dailyVolume }) => acc + dailyVolume[index].volume, 0n);

        return {
          date: format(day, "yyyy-MM-dd"),
          volume,
        };
      });

      return {
        totalVolume,
        dailyVolume,
      };
    },
  });

  return useMemo(() => ({ data, error, isLoading }), [data, error, isLoading]);
}
