import { describe, expect, it } from "vitest";

import { getRecentAvgWeeklyBuybackGmx } from "./useBuybackChartData";
import type { BuybackWeekData, BuybackWeeklyStatsResponse } from "./useBuybackWeeklyStats";

const SECONDS_PER_WEEK = 7 * 24 * 60 * 60;

function gmx(amount: number): string {
  return (BigInt(amount) * 10n ** 18n).toString();
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
  };
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
