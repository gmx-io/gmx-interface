import { describe, expect, it } from "vitest";

import type { Bar } from "domain/tradingview/types";

import {
  buildBuybackChartPoints,
  computeMonthlyUsdSeries,
  getRecentAvgWeeklyBuybackGmx,
  getTotalBoughtUsd,
} from "./useBuybackChartData";
import type { BuybackMonthData, BuybackWeekData, BuybackWeeklyStatsResponse } from "./useBuybackWeeklyStats";

const SECONDS_PER_DAY = 24 * 60 * 60;
const SECONDS_PER_WEEK = 7 * SECONDS_PER_DAY;

function gmx(amount: number): string {
  return (BigInt(amount) * 10n ** 18n).toString();
}

function usd(amount: number): bigint {
  return BigInt(Math.round(amount * 100)) * 10n ** 28n;
}

function makeWeek(index: number, accruedGmx: number, { partial = false }: { partial?: boolean } = {}): BuybackWeekData {
  const weekStart = index * SECONDS_PER_WEEK;
  return {
    weekStart,
    weekEnd: weekStart + (partial ? SECONDS_PER_WEEK / 2 : SECONDS_PER_WEEK),
    weeklyAccrued: gmx(accruedGmx),
    cumulativeAccrued: "0",
  };
}

function makeResponse(weeks: BuybackWeekData[]): BuybackWeeklyStatsResponse {
  return {
    summary: { totalAccrued: "0", latestWeekAccrued: "0", weeksTracked: weeks.length },
    weeks,
    months: [],
  };
}

function utc(year: number, month: number): number {
  return Date.UTC(year, month - 1, 1) / 1000;
}

function makeMonths(monthly: { year: number; month: number; accruedGmx: number }[]): BuybackMonthData[] {
  let cumulative = 0n;

  return monthly.map(({ year, month, accruedGmx }) => {
    const accrued = BigInt(gmx(accruedGmx));
    cumulative += accrued;

    return {
      monthStart: utc(year, month),
      monthEnd: utc(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1),
      monthlyAccrued: accrued.toString(),
      cumulativeAccrued: cumulative.toString(),
    };
  });
}

function makeCandles(months: BuybackMonthData[], price: number): Bar[] {
  const candles: Bar[] = [];

  for (const month of months) {
    for (let time = month.monthStart; time < month.monthEnd; time += SECONDS_PER_DAY) {
      candles.push({ time, open: price, high: price, low: price, close: price });
    }
  }

  return candles;
}

describe("getRecentAvgWeeklyBuybackGmx", () => {
  it("returns undefined for missing data", () => {
    expect(getRecentAvgWeeklyBuybackGmx(undefined)).toBeUndefined();
  });

  it("returns undefined for empty weeks", () => {
    expect(getRecentAvgWeeklyBuybackGmx(makeResponse([]))).toBeUndefined();
  });

  it("returns undefined when there are fewer than 4 completed non-zero weeks", () => {
    const data = makeResponse([makeWeek(0, 100), makeWeek(1, 200), makeWeek(2, 300)]);
    expect(getRecentAvgWeeklyBuybackGmx(data)).toBeUndefined();
  });

  it("averages exactly 4 completed non-zero weeks", () => {
    const data = makeResponse([makeWeek(0, 100), makeWeek(1, 200), makeWeek(2, 300), makeWeek(3, 400)]);
    expect(getRecentAvgWeeklyBuybackGmx(data)).toBeCloseTo(250);
  });

  it("averages only the last 4 weeks when more are available", () => {
    const data = makeResponse([
      makeWeek(0, 1000),
      makeWeek(1, 100),
      makeWeek(2, 200),
      makeWeek(3, 300),
      makeWeek(4, 400),
    ]);
    expect(getRecentAvgWeeklyBuybackGmx(data)).toBeCloseTo(250);
  });

  it("ignores the trailing partial bucket", () => {
    const data = makeResponse([
      makeWeek(0, 100),
      makeWeek(1, 200),
      makeWeek(2, 300),
      makeWeek(3, 400),
      makeWeek(4, 9000, { partial: true }),
    ]);
    expect(getRecentAvgWeeklyBuybackGmx(data)).toBeCloseTo(250);
  });

  it("skips zero-accrual weeks", () => {
    const data = makeResponse([makeWeek(0, 100), makeWeek(1, 0), makeWeek(2, 200), makeWeek(3, 300), makeWeek(4, 400)]);
    expect(getRecentAvgWeeklyBuybackGmx(data)).toBeCloseTo(250);
  });

  it("returns undefined when zero and partial weeks leave fewer than 4", () => {
    const data = makeResponse([
      makeWeek(0, 0),
      makeWeek(1, 100),
      makeWeek(2, 200),
      makeWeek(3, 300),
      makeWeek(4, 400, { partial: true }),
    ]);
    expect(getRecentAvgWeeklyBuybackGmx(data)).toBeUndefined();
  });
});

describe("getTotalBoughtUsd", () => {
  it("returns undefined when the current GMX price is unavailable", () => {
    expect(getTotalBoughtUsd(BigInt(gmx(1000)), undefined)).toBeUndefined();
  });

  it("returns undefined for a zero GMX price", () => {
    expect(getTotalBoughtUsd(BigInt(gmx(1000)), 0n)).toBeUndefined();
  });

  it("values the cumulative GMX amount at the current GMX price", () => {
    expect(getTotalBoughtUsd(BigInt(gmx(415_781)), usd(6.25))).toBeCloseTo(2_598_631.25);
  });

  it("keeps fractional GMX amounts", () => {
    expect(getTotalBoughtUsd(15n * 10n ** 17n, usd(2))).toBeCloseTo(3);
  });

  it("returns zero when nothing was bought", () => {
    expect(getTotalBoughtUsd(0n, usd(6.25))).toBe(0);
  });
});

describe("computeMonthlyUsdSeries", () => {
  it("returns an empty series for missing months", () => {
    expect(computeMonthlyUsdSeries(undefined, [])).toEqual([]);
  });

  it("prices each month with its own average GMX price", () => {
    const months = makeMonths([
      { year: 2026, month: 3, accruedGmx: 100 },
      { year: 2026, month: 4, accruedGmx: 200 },
    ]);
    const candles = [...makeCandles([months[0]!], 10), ...makeCandles([months[1]!], 20)];

    const series = computeMonthlyUsdSeries(months, candles);

    expect(series[0]!.monthlyUsd).toBeCloseTo(1000);
    expect(series[1]!.monthlyUsd).toBeCloseTo(4000);
    expect(series[1]!.cumulativeUsd).toBeCloseTo(5000);
  });

  it("prices a zero month as zero without candles and keeps the cumulative valid", () => {
    const months = makeMonths([
      { year: 2026, month: 3, accruedGmx: 100 },
      { year: 2026, month: 4, accruedGmx: 0 },
    ]);
    const candles = makeCandles([months[0]!], 10);

    const series = computeMonthlyUsdSeries(months, candles);

    expect(series[1]!.monthlyUsd).toBe(0);
    expect(series[1]!.cumulativeUsd).toBeCloseTo(1000);
  });

  it("invalidates the cumulative once a non-zero month has no price", () => {
    const months = makeMonths([
      { year: 2026, month: 3, accruedGmx: 100 },
      { year: 2026, month: 4, accruedGmx: 200 },
    ]);
    const candles = makeCandles([months[0]!], 10);

    const series = computeMonthlyUsdSeries(months, candles);

    expect(series[1]!.monthlyUsd).toBeUndefined();
    expect(series[1]!.cumulativeUsd).toBeUndefined();
  });
});

describe("buildBuybackChartPoints", () => {
  it("returns no points when nothing was bought back", () => {
    const months = makeMonths([
      { year: 2026, month: 3, accruedGmx: 0 },
      { year: 2026, month: 4, accruedGmx: 0 },
    ]);

    expect(buildBuybackChartPoints(months, computeMonthlyUsdSeries(months, undefined))).toEqual([]);
  });

  it("drops leading months before the first buyback and keeps zero months inside the range", () => {
    const months = makeMonths([
      { year: 2026, month: 3, accruedGmx: 0 },
      { year: 2026, month: 4, accruedGmx: 100 },
      { year: 2026, month: 5, accruedGmx: 0 },
      { year: 2026, month: 6, accruedGmx: 200 },
    ]);

    const points = buildBuybackChartPoints(months, computeMonthlyUsdSeries(months, undefined));

    expect(points.map((p) => p.label)).toEqual(["APR", "MAY", "JUN"]);
    expect(points.map((p) => p.monthlyAccrued)).toEqual([100, 0, 200]);
  });

  it("keeps the cumulative equal to the sum of all monthly amounts", () => {
    const months = makeMonths([
      { year: 2026, month: 3, accruedGmx: 100 },
      { year: 2026, month: 4, accruedGmx: 200 },
      { year: 2026, month: 5, accruedGmx: 300 },
    ]);
    const candles = makeCandles(months, 10);

    const points = buildBuybackChartPoints(months, computeMonthlyUsdSeries(months, candles));

    expect(points.at(-1)!.cumulativeAccrued).toBe(600);
    expect(points.at(-1)!.cumulativeUsd).toBeCloseTo(6000);
  });

  it("aligns the usd series with the visible months", () => {
    const months = makeMonths([
      { year: 2026, month: 3, accruedGmx: 0 },
      { year: 2026, month: 4, accruedGmx: 100 },
    ]);
    const candles = makeCandles(months, 10);

    const points = buildBuybackChartPoints(months, computeMonthlyUsdSeries(months, candles));

    expect(points).toHaveLength(1);
    expect(points[0]!.monthlyUsd).toBeCloseTo(1000);
  });

  it("adds the year to labels when the range spans more than one year", () => {
    const months = makeMonths([
      { year: 2026, month: 11, accruedGmx: 100 },
      { year: 2026, month: 12, accruedGmx: 100 },
      { year: 2027, month: 1, accruedGmx: 100 },
    ]);

    const points = buildBuybackChartPoints(months, computeMonthlyUsdSeries(months, undefined));

    expect(points.map((p) => p.label)).toEqual(["NOV '26", "DEC '26", "JAN '27"]);
  });
});
