import { toSeconds } from "lib/dates";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { ApyPeriod } from "lib/oracleKeeperFetcher";
import { mustNeverExist } from "lib/types";

export const POOLS_TIME_RANGE_OPTIONS = ["total" as const, "90d" as const, "30d" as const, "7d" as const];

export type PoolsTimeRange = (typeof POOLS_TIME_RANGE_OPTIONS)[number];

export type Period = {
  periodStart: number;
  periodEnd: number;
};

export function usePoolsTimeRange() {
  const [timeRange, setTimeRange] = useLocalStorageSerializeKey<PoolsTimeRange>("pools-time-range", "90d");

  return { timeRange: timeRange ?? "90d", setTimeRange };
}

export function convertPoolsTimeRangeToPeriod(timeRange: PoolsTimeRange): Period {
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

export const convertPoolsTimeRangeToApyPeriod = (timeRange: PoolsTimeRange): ApyPeriod => {
  switch (timeRange) {
    case "total":
      return "total";
    case "7d":
      return "7d";
    case "30d":
      return "30d";
    case "90d":
      return "90d";
    default:
      return mustNeverExist(timeRange);
  }
};
