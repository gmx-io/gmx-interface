import { useMemo } from "react";
import { USD_DECIMALS } from "config/factors";
import { expandDecimals } from "lib/numbers";

import { useAccountVolumeStats } from "./useAccountVolumeStats";

// Thresholds to recognise large accounts
const MAX_DAILY_VOLUME = expandDecimals(220_000n, USD_DECIMALS);
const AGG_14_DAYS_VOLUME = expandDecimals(1_200_000n, USD_DECIMALS);
const AGG_ALL_TIME_VOLUME = expandDecimals(3_500_000n, USD_DECIMALS);

export function useIsLargeAccount(account?: string) {
  const { data, error, isLoading } = useAccountVolumeStats({ account });

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
