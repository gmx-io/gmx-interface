import { useMemo } from "react";
import { format } from "date-fns";

import { GMX_DECIMALS } from "lib/legacy";
import { bigintToNumber } from "lib/numbers";

import type { BuybackWeeklyStatsResponse } from "./useBuybackWeeklyStats";

export type BuybackChartPoint = {
  label: string;
  weekStart: number;
  weekEnd: number;
  weeklyAccrued: number;
  cumulativeAccrued: number;
  weeklyAccruedRaw: bigint;
  cumulativeAccruedRaw: bigint;
};

export type BuybackDerivedMetrics = {
  weeklyBoughtGmx: number;
  weeklyBoughtUsd: number;
  totalBoughtGmx: number;
  totalBoughtUsd: number;
  weeklyRate: number;
  annualizedRate: number;
};

export function useBuybackChartData(
  data: BuybackWeeklyStatsResponse | undefined,
  gmxPrice: number | undefined,
  totalStakedGmx: number | undefined
) {
  const chartData = useMemo<BuybackChartPoint[]>(() => {
    if (!data?.weeks) return [];

    const allPoints = data.weeks.map((week) => ({
      label: format(week.weekStart * 1000, "MMM d").toUpperCase(),
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      weeklyAccrued: bigintToNumber(BigInt(week.weeklyAccrued), GMX_DECIMALS),
      cumulativeAccrued: bigintToNumber(BigInt(week.cumulativeAccrued), GMX_DECIMALS),
      weeklyAccruedRaw: BigInt(week.weeklyAccrued),
      cumulativeAccruedRaw: BigInt(week.cumulativeAccrued),
    }));

    const firstNonZero = allPoints.findIndex((p) => p.cumulativeAccruedRaw > 0n);
    return firstNonZero > 0 ? allPoints.slice(firstNonZero) : allPoints;
  }, [data]);

  const metrics = useMemo<BuybackDerivedMetrics | undefined>(() => {
    if (!data?.summary || gmxPrice === undefined || totalStakedGmx === undefined) return undefined;

    const weeklyBoughtGmx = bigintToNumber(BigInt(data.summary.latestWeekAccrued), GMX_DECIMALS);
    const totalBoughtGmx = bigintToNumber(BigInt(data.summary.totalAccrued), GMX_DECIMALS);
    const weeklyBoughtUsd = weeklyBoughtGmx * gmxPrice;
    const totalBoughtUsd = totalBoughtGmx * gmxPrice;

    const weeklyRate = totalStakedGmx && totalStakedGmx > 0 ? weeklyBoughtGmx / totalStakedGmx : 0;
    const annualizedRate = weeklyRate * 52;

    return {
      weeklyBoughtGmx,
      weeklyBoughtUsd,
      totalBoughtGmx,
      totalBoughtUsd,
      weeklyRate,
      annualizedRate,
    };
  }, [data, gmxPrice, totalStakedGmx]);

  return { chartData, metrics };
}
