import { useMemo } from "react";
import { USD_DECIMALS } from "config/factors";
import { expandDecimals } from "lib/numbers";

import { useAccountVolumeStats } from "./useAccountVolumeStats";

// Thresholds to recognise large accounts
const X1_MAX_DAILY_VOLUME = expandDecimals(220_000n, USD_DECIMALS);
const X2_AGG_7_DAYS_VOLUME = expandDecimals(500_000n, USD_DECIMALS);
const X3_AGG_14_DAYS_VOLUME = expandDecimals(1_200_000n, USD_DECIMALS);
const X4_AGG_30_DAYS_VOLUME = expandDecimals(3_000_000n, USD_DECIMALS);
const X5_AGG_ALL_TIME_VOLUME = expandDecimals(5_000_000n, USD_DECIMALS);

export function useIsLargeAccount(account?: string) {
  const { data, error, isLoading } = useAccountVolumeStats({ account });

  const isLargeAccount = useMemo(() => {
    if (!data || isLoading || error) return undefined;

    const { totalVolume, dailyVolume } = data;

    const maxDailyVolume = dailyVolume.reduce((max, day) => (day.volume > max ? day.volume : max), 0n);

    const last7DaysVolume = dailyVolume.slice(-7).reduce((acc, day) => acc + day.volume, 0n);

    const last14DaysVolume = dailyVolume.slice(-14).reduce((acc, day) => acc + day.volume, 0n);

    const last30DaysVolume = dailyVolume.slice(-30).reduce((acc, day) => acc + day.volume, 0n);

    return (
      maxDailyVolume >= X1_MAX_DAILY_VOLUME ||
      last7DaysVolume >= X2_AGG_7_DAYS_VOLUME ||
      last14DaysVolume >= X3_AGG_14_DAYS_VOLUME ||
      last30DaysVolume >= X4_AGG_30_DAYS_VOLUME ||
      totalVolume >= X5_AGG_ALL_TIME_VOLUME
    );
  }, [data, isLoading, error]);

  return isLargeAccount;
}
