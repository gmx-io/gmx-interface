import { format } from "date-fns";
import { useMemo } from "react";

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
  totalBoughtGmx: number;
  totalBoughtUsd: number;
  weeklyRate: number | undefined;
  annualizedRate: number | undefined;
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
    if (firstNonZero === -1) return [];
    return firstNonZero > 0 ? allPoints.slice(firstNonZero) : allPoints;
  }, [data]);

  const metrics = useMemo<BuybackDerivedMetrics | undefined>(() => {
    if (!data?.summary || !data.weeks || gmxPrice === undefined || totalStakedGmx === undefined) return undefined;

    const now = Math.floor(Date.now() / 1000);

    const completedWeeks = data.weeks.filter((w) => w.weekEnd <= now);
    const firstNonZero = completedWeeks.findIndex((w) => BigInt(w.weeklyAccrued) > 0n);
    const trackedWeeks = firstNonZero >= 0 ? completedWeeks.slice(firstNonZero) : [];

    const rateWindow = trackedWeeks.slice(-4);

    const totalBoughtGmx = bigintToNumber(BigInt(data.summary.totalAccrued), GMX_DECIMALS);
    const totalBoughtUsd = totalBoughtGmx * gmxPrice;

    let weeklyRate: number | undefined;
    let annualizedRate: number | undefined;

    if (rateWindow.length >= 2 && totalStakedGmx > 0) {
      const avgWeeklyBoughtGmx =
        rateWindow.reduce((sum, w) => sum + bigintToNumber(BigInt(w.weeklyAccrued), GMX_DECIMALS), 0) /
        rateWindow.length;
      weeklyRate = avgWeeklyBoughtGmx / totalStakedGmx;
      annualizedRate = weeklyRate * 52;
    }

    return {
      totalBoughtGmx,
      totalBoughtUsd,
      weeklyRate,
      annualizedRate,
    };
  }, [data, gmxPrice, totalStakedGmx]);

  return { chartData, metrics };
}
