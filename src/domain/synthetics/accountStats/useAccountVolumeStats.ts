import { gql } from "@apollo/client";
import { getSubsquidGraphClient } from "lib/subgraph";
import { useMemo } from "react";
import useSWR from "swr";
import { subDays, format, eachDayOfInterval } from "date-fns";
import { toUtcDayStart } from "lib/dates";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { ARBITRUM, AVALANCHE } from "config/chains";

const LARGE_ACCOUNT_CHAINS = [ARBITRUM, AVALANCHE];

export function useAccountVolumeStats(params: { account?: string }) {
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
  }>(account ? ["useAccountVolumeStats", account] : null, {
    fetcher: async () => {
      const clientPromises = LARGE_ACCOUNT_CHAINS.map(async (chainId) => {
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

      const results = await Promise.all(clientPromises);

      const totalVolume = results.reduce((acc, result) => acc + result.totalVolume, 0n);

      const dailyVolume = last30dList.map((day, index) => {
        const volume = results.reduce((acc, result) => acc + result.dailyVolume[index]?.volume ?? 0n, 0n);
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
    refreshInterval: CONFIG_UPDATE_INTERVAL,
  });

  return useMemo(() => ({ data, error, isLoading }), [data, error, isLoading]);
}
