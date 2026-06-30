import { useMemo } from "react";
import useSWR from "swr";

import type { Bar } from "domain/tradingview/types";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { ARBITRUM } from "sdk/configs/chains";
import { periodToSeconds } from "sdk/utils/time";

const SECONDS_PER_DAY = periodToSeconds(1, "1d");

const LIMIT_STEP = 100;

export function useGmxDailyPrices(fromTimestamp: number | undefined) {
  const oracleKeeperFetcher = useOracleKeeperFetcher(ARBITRUM);

  const limit = useMemo(() => {
    if (fromTimestamp === undefined) return undefined;
    const daysNeeded = Math.ceil((Date.now() / 1000 - fromTimestamp) / SECONDS_PER_DAY) + 7;
    return Math.ceil(Math.max(daysNeeded, 1) / LIMIT_STEP) * LIMIT_STEP;
  }, [fromTimestamp]);

  const { data, error, isLoading } = useSWR<Bar[]>(
    limit === undefined ? null : ["gmxDailyCandles", ARBITRUM, limit],
    async () => oracleKeeperFetcher.fetchOracleCandles("GMX", "1d", limit!),
    {
      refreshInterval: CONFIG_UPDATE_INTERVAL,
    }
  );

  return { candles: data, error, isLoading };
}
