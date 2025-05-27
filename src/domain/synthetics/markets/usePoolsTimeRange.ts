import { getTimestampByDaysAgo, normalizeDateRange } from "lib/dates";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { ApyPeriod } from "lib/oracleKeeperFetcher";
import { mustNeverExist } from "lib/types";

export const POOLS_TIME_RANGE_OPTIONS = ["total", "90d", "30d", "7d"] as const;

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
  const today = new Date();

  const getStartDate = (days: number) => {
    return new Date(getTimestampByDaysAgo(days) * 1000);
  };

  switch (timeRange) {
    case "total": {
      const [_, periodEnd] = normalizeDateRange(new Date(0), today);
      return {
        periodStart: 0,
        periodEnd: periodEnd ?? 0,
      };
    }
    case "7d": {
      const [periodStart, periodEnd] = normalizeDateRange(getStartDate(7), today);
      return {
        periodStart: periodStart ?? 0,
        periodEnd: periodEnd ?? 0,
      };
    }
    case "30d": {
      const [periodStart, periodEnd] = normalizeDateRange(getStartDate(30), today);
      return {
        periodStart: periodStart ?? 0,
        periodEnd: periodEnd ?? 0,
      };
    }
    case "90d": {
      const [periodStart, periodEnd] = normalizeDateRange(getStartDate(90), today);
      return {
        periodStart: periodStart ?? 0,
        periodEnd: periodEnd ?? 0,
      };
    }
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
