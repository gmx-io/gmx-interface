import { tz } from "@date-fns/tz";
import { format } from "date-fns";
import { useMemo } from "react";

import type { Bar } from "domain/tradingview/types";
import { GMX_DECIMALS } from "lib/legacy";
import { bigintToNumber } from "lib/numbers";
import { periodToSeconds } from "sdk/utils/time";

import type { BuybackWeekData, BuybackWeeklyStatsResponse } from "./useBuybackWeeklyStats";

const SECONDS_PER_WEEK = periodToSeconds(7, "1d");

const RATE_WINDOW_WEEKS = 4;

export type BuybackChartPoint = {
  label: string;
  weekStart: number;
  weekEnd: number;
  weeklyAccrued: number;
  cumulativeAccrued: number;
  weeklyAccruedRaw: bigint;
  cumulativeAccruedRaw: bigint;
  weeklyUsd: number | undefined;
  cumulativeUsd: number | undefined;
};

export type BuybackDerivedMetrics = {
  totalBoughtGmx: number;
  totalBoughtUsd: number | undefined;
  annualizedRate: number | undefined;
};

type WeeklyUsdPoint = {
  weeklyUsd: number | undefined;
  cumulativeUsd: number | undefined;
};

function getWeekAveragePrice(candles: readonly Bar[], weekStart: number, weekEnd: number): number | undefined {
  let sum = 0;
  let count = 0;

  for (const candle of candles) {
    if (candle.time >= weekStart && candle.time < weekEnd) {
      sum += candle.close;
      count += 1;
    }
  }

  return count > 0 ? sum / count : undefined;
}

function computeWeeklyUsdSeries(
  weeks: BuybackWeekData[],
  weeklyAvgPrices: (number | undefined)[] | undefined
): WeeklyUsdPoint[] {
  let runningUsd = 0;
  let cumulativeValid = true;

  return weeks.map((week, i) => {
    const weeklyGmx = bigintToNumber(BigInt(week.weeklyAccrued), GMX_DECIMALS);
    const avgPrice = weeklyAvgPrices?.[i];

    let weeklyUsd: number | undefined;
    if (weeklyGmx === 0) {
      weeklyUsd = 0;
    } else if (avgPrice !== undefined) {
      weeklyUsd = weeklyGmx * avgPrice;
    }

    if (weeklyUsd === undefined) {
      cumulativeValid = false;
    } else if (cumulativeValid) {
      runningUsd += weeklyUsd;
    }

    return {
      weeklyUsd,
      cumulativeUsd: cumulativeValid ? runningUsd : undefined,
    };
  });
}

export function useBuybackChartData(
  data: BuybackWeeklyStatsResponse | undefined,
  candles: readonly Bar[] | undefined,
  totalGmxSupply: number | undefined
) {
  const weeklyAvgPrices = useMemo<(number | undefined)[] | undefined>(() => {
    if (!data?.weeks || !candles?.length) return undefined;
    return data.weeks.map((week) => getWeekAveragePrice(candles, week.weekStart, week.weekEnd));
  }, [data, candles]);

  const weeklyUsdSeries = useMemo<WeeklyUsdPoint[]>(() => {
    if (!data?.weeks) return [];
    return computeWeeklyUsdSeries(data.weeks, weeklyAvgPrices);
  }, [data, weeklyAvgPrices]);

  const chartData = useMemo<BuybackChartPoint[]>(() => {
    if (!data?.weeks) return [];

    const allPoints = data.weeks.map((week, i) => ({
      label: format(week.weekStart * 1000, "MMM d", { in: tz("UTC") }).toUpperCase(),
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      weeklyAccrued: bigintToNumber(BigInt(week.weeklyAccrued), GMX_DECIMALS),
      cumulativeAccrued: bigintToNumber(BigInt(week.cumulativeAccrued), GMX_DECIMALS),
      weeklyAccruedRaw: BigInt(week.weeklyAccrued),
      cumulativeAccruedRaw: BigInt(week.cumulativeAccrued),
      weeklyUsd: weeklyUsdSeries[i]?.weeklyUsd,
      cumulativeUsd: weeklyUsdSeries[i]?.cumulativeUsd,
    }));

    const firstNonZero = allPoints.findIndex((p) => p.cumulativeAccruedRaw > 0n);
    if (firstNonZero === -1) return [];
    return firstNonZero > 0 ? allPoints.slice(firstNonZero) : allPoints;
  }, [data, weeklyUsdSeries]);

  const metrics = useMemo<BuybackDerivedMetrics | undefined>(() => {
    if (!data?.summary || !data.weeks) return undefined;

    const totalBoughtGmx = bigintToNumber(BigInt(data.summary.totalAccrued), GMX_DECIMALS);
    const totalBoughtUsd = weeklyUsdSeries.at(-1)?.cumulativeUsd;

    // The API may append the current partial bucket (weekEnd = serverNow) as the last entry.
    // Only count buckets aligned to a full week so the rate window is stable across refreshes.
    const nonZeroCompletedWeeks = data.weeks.filter(
      (w) => w.weekEnd - w.weekStart >= SECONDS_PER_WEEK && BigInt(w.weeklyAccrued) > 0n
    );
    const rateWindow = nonZeroCompletedWeeks.slice(-RATE_WINDOW_WEEKS);

    let annualizedRate: number | undefined;
    if (rateWindow.length >= RATE_WINDOW_WEEKS && totalGmxSupply !== undefined && totalGmxSupply > 0) {
      const avgWeeklyBoughtGmx =
        rateWindow.reduce((sum, w) => sum + bigintToNumber(BigInt(w.weeklyAccrued), GMX_DECIMALS), 0) /
        rateWindow.length;
      annualizedRate = (avgWeeklyBoughtGmx * 52) / totalGmxSupply;
    }

    return {
      totalBoughtGmx,
      totalBoughtUsd,
      annualizedRate,
    };
  }, [data, weeklyUsdSeries, totalGmxSupply]);

  return { chartData, metrics };
}
