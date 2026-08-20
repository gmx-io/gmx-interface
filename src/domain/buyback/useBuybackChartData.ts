import { tz } from "@date-fns/tz";
import { format } from "date-fns";
import { useMemo } from "react";

import type { Bar } from "domain/tradingview/types";
import { GMX_DECIMALS } from "lib/legacy";
import { bigintToNumber } from "lib/numbers";
import { periodToSeconds } from "sdk/utils/time";

import type { BuybackMonthData, BuybackWeeklyStatsResponse } from "./useBuybackWeeklyStats";

const SECONDS_PER_WEEK = periodToSeconds(7, "1d");

const RATE_WINDOW_WEEKS = 4;

export type BuybackChartPoint = {
  label: string;
  monthStart: number;
  monthEnd: number;
  monthlyAccrued: number;
  cumulativeAccrued: number;
  monthlyUsd: number | undefined;
  cumulativeUsd: number | undefined;
};

export type BuybackDerivedMetrics = {
  totalBoughtGmx: number;
  totalBoughtUsd: number | undefined;
  annualizedRate: number | undefined;
};

export type MonthlyUsdPoint = {
  monthlyUsd: number | undefined;
  cumulativeUsd: number | undefined;
};

function getAveragePrice(candles: readonly Bar[], from: number, to: number): number | undefined {
  let sum = 0;
  let count = 0;

  for (const candle of candles) {
    if (candle.time >= from && candle.time < to) {
      sum += candle.close;
      count += 1;
    }
  }

  return count > 0 ? sum / count : undefined;
}

function getUtcYear(timestamp: number): number {
  return new Date(timestamp * 1000).getUTCFullYear();
}

export function computeMonthlyUsdSeries(
  months: BuybackMonthData[] | undefined,
  candles: readonly Bar[] | undefined
): MonthlyUsdPoint[] {
  if (!months) return [];

  let runningUsd = 0;
  let cumulativeValid = true;

  return months.map((month) => {
    const monthlyGmx = bigintToNumber(BigInt(month.monthlyAccrued), GMX_DECIMALS);
    const avgPrice = candles?.length ? getAveragePrice(candles, month.monthStart, month.monthEnd) : undefined;

    let monthlyUsd: number | undefined;
    if (monthlyGmx === 0) {
      monthlyUsd = 0;
    } else if (avgPrice !== undefined) {
      monthlyUsd = monthlyGmx * avgPrice;
    }

    if (monthlyUsd === undefined) {
      cumulativeValid = false;
    } else if (cumulativeValid) {
      runningUsd += monthlyUsd;
    }

    return {
      monthlyUsd,
      cumulativeUsd: cumulativeValid ? runningUsd : undefined,
    };
  });
}

export function buildBuybackChartPoints(
  months: BuybackMonthData[] | undefined,
  usdSeries: MonthlyUsdPoint[]
): BuybackChartPoint[] {
  if (!months?.length) return [];

  const firstNonZero = months.findIndex((month) => BigInt(month.cumulativeAccrued) > 0n);
  if (firstNonZero === -1) return [];

  const visibleMonths = months.slice(firstNonZero);
  const spansMultipleYears =
    getUtcYear(visibleMonths[0]!.monthStart) !== getUtcYear(visibleMonths[visibleMonths.length - 1]!.monthStart);
  const labelFormat = spansMultipleYears ? "MMM ''yy" : "MMM";

  return visibleMonths.map((month, i) => ({
    label: format(month.monthStart * 1000, labelFormat, { in: tz("UTC") }).toUpperCase(),
    monthStart: month.monthStart,
    monthEnd: month.monthEnd,
    monthlyAccrued: bigintToNumber(BigInt(month.monthlyAccrued), GMX_DECIMALS),
    cumulativeAccrued: bigintToNumber(BigInt(month.cumulativeAccrued), GMX_DECIMALS),
    monthlyUsd: usdSeries[firstNonZero + i]?.monthlyUsd,
    cumulativeUsd: usdSeries[firstNonZero + i]?.cumulativeUsd,
  }));
}

export function getRecentAvgWeeklyBuybackGmx(data: BuybackWeeklyStatsResponse | undefined): number | undefined {
  if (!data?.weeks) return undefined;

  const nonZeroCompletedWeeks = data.weeks.filter(
    (w) => w.weekEnd - w.weekStart >= SECONDS_PER_WEEK && BigInt(w.weeklyAccrued) > 0n
  );
  const rateWindow = nonZeroCompletedWeeks.slice(-RATE_WINDOW_WEEKS);

  if (rateWindow.length < RATE_WINDOW_WEEKS) return undefined;

  return (
    rateWindow.reduce((sum, w) => sum + bigintToNumber(BigInt(w.weeklyAccrued), GMX_DECIMALS), 0) / rateWindow.length
  );
}

export function useBuybackChartData(
  data: BuybackWeeklyStatsResponse | undefined,
  candles: readonly Bar[] | undefined,
  totalGmxSupply: number | undefined
) {
  const monthlyUsdSeries = useMemo<MonthlyUsdPoint[]>(
    () => computeMonthlyUsdSeries(data?.months, candles),
    [data, candles]
  );

  const chartData = useMemo<BuybackChartPoint[]>(
    () => buildBuybackChartPoints(data?.months, monthlyUsdSeries),
    [data, monthlyUsdSeries]
  );

  const metrics = useMemo<BuybackDerivedMetrics | undefined>(() => {
    if (!data?.summary || !data.weeks) return undefined;

    const totalBoughtGmx = bigintToNumber(BigInt(data.summary.totalAccrued), GMX_DECIMALS);
    const totalBoughtUsd = monthlyUsdSeries.at(-1)?.cumulativeUsd;
    const avgWeeklyBoughtGmx = getRecentAvgWeeklyBuybackGmx(data);

    let annualizedRate: number | undefined;
    if (avgWeeklyBoughtGmx !== undefined && totalGmxSupply !== undefined && totalGmxSupply > 0) {
      annualizedRate = (avgWeeklyBoughtGmx * 52) / totalGmxSupply;
    }

    return {
      totalBoughtGmx,
      totalBoughtUsd,
      annualizedRate,
    };
  }, [data, monthlyUsdSeries, totalGmxSupply]);

  return { chartData, metrics };
}
