import { useState } from "react";

import { toSeconds } from "lib/dates";

import { GlvAprPeriod } from "./aprByPeriod/useGlvAprByPeriod";

export const POOLS_TIME_RANGE_OPTIONS = ["total" as const, "7d" as const, "30d" as const, "90d" as const];

export type PoolsTimeRange = (typeof POOLS_TIME_RANGE_OPTIONS)[number];

export function usePoolsTimeRange() {
  const [timeRange, setTimeRange] = useState<PoolsTimeRange>("90d");

  return { timeRange, setTimeRange };
}

export function convertPoolsTimeRangeToPeriod(timeRange: PoolsTimeRange): GlvAprPeriod {
  const today = new Date(new Date().setHours(0, 0, 0, 0));

  const getPeriodStart = (days: number) => {
    const periodStart = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    return toSeconds(periodStart);
  };

  switch (timeRange) {
    case "total":
      return {
        periodStart: 0,
        periodEnd: toSeconds(today),
      };
    case "7d":
      return {
        periodStart: getPeriodStart(7),
        periodEnd: toSeconds(today),
      };
    case "30d":
      return {
        periodStart: getPeriodStart(30),
        periodEnd: toSeconds(today),
      };
    case "90d":
      return {
        periodStart: getPeriodStart(90),
        periodEnd: toSeconds(today),
      };
  }
}
