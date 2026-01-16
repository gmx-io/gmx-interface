import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { getSubsquidGraphClient } from "lib/indexers";
import { expandDecimals } from "lib/numbers";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import type { AccountStat } from "sdk/types/subsquid";
import { bigMath } from "sdk/utils/bigmath";

const LARGE_ACCOUNT_CHAINS = [ARBITRUM, AVALANCHE];

// Thresholds to recognise large accounts
const MAX_DAILY_VOLUME = expandDecimals(340_000n, USD_DECIMALS);
const AGG_14_DAYS_VOLUME = expandDecimals(1_800_000n, USD_DECIMALS);
const AGG_ALL_TIME_VOLUME = expandDecimals(5_800_000n, USD_DECIMALS);

export function useIsLargeAccountData(account?: string) {
  const { data, error, isLoading } = useIsLargeAccountVolumeStats({ account });

  const isLargeAccount = useMemo(() => {
    if (!data || isLoading || error) return undefined;

    const { totalVolume, volumeInLast30DaysInfo } = data;
    const { maxDailyVolume, last14DaysVolume } = volumeInLast30DaysInfo;

    return (
      maxDailyVolume >= MAX_DAILY_VOLUME || last14DaysVolume >= AGG_14_DAYS_VOLUME || totalVolume >= AGG_ALL_TIME_VOLUME
    );
  }, [data, isLoading, error]);

  return isLargeAccount;
}

function useIsLargeAccountVolumeStats(params: { account?: string }) {
  const { account } = params;

  const { data, error, isLoading } = useSWR<{
    totalVolume: bigint;
    volumeInLast30DaysInfo: { maxDailyVolume: bigint; last14DaysVolume: bigint };
  }>(account ? ["useIsLargeAccountVolumeStats", account] : null, {
    refreshInterval: CONFIG_UPDATE_INTERVAL,
    fetcher: async () => {
      const chainPromises = LARGE_ACCOUNT_CHAINS.map(async (chainId) => {
        const client = getSubsquidGraphClient(chainId);

        const query = gql`
            query AccountVolumeStats {
              total: accountStatById(id: "${account}") {
                volume
              }
              monthly: periodAccountVolume(
                where: { account: "${account}"}
              ) {
                maxDailyVolume
                last14DaysVolume
              }
            }
          `;

        const res = await client?.query<{
          total: AccountStat;
          monthly: { maxDailyVolume: string; last14DaysVolume: string };
        }>({
          query,
          fetchPolicy: "no-cache",
        });

        const totalVolume = BigInt(res?.data?.total?.volume ?? 0);
        const volumeInLast30DaysInfo = res?.data?.monthly;

        return {
          totalVolume,
          volumeInLast30DaysInfo: {
            maxDailyVolume: BigInt(volumeInLast30DaysInfo?.maxDailyVolume ?? 0),
            last14DaysVolume: BigInt(volumeInLast30DaysInfo?.last14DaysVolume ?? 0),
          },
        };
      });

      const chainResults = await Promise.all(chainPromises);
      const totalVolume = chainResults.reduce((acc, result) => acc + result.totalVolume, 0n);

      const volumeInLast30DaysInfo = chainResults.reduce(
        (acc, { volumeInLast30DaysInfo }) => {
          const maxChainVolume = volumeInLast30DaysInfo?.maxDailyVolume ?? 0n;
          const last14DaysVolume = volumeInLast30DaysInfo?.last14DaysVolume ?? 0n;
          return {
            maxDailyVolume: bigMath.max(acc.maxDailyVolume, maxChainVolume),
            last14DaysVolume: acc.last14DaysVolume + last14DaysVolume,
          };
        },
        { maxDailyVolume: 0n, last14DaysVolume: 0n }
      );

      return {
        totalVolume,
        volumeInLast30DaysInfo,
      };
    },
  });

  return useMemo(() => ({ data, error, isLoading }), [data, error, isLoading]);
}
