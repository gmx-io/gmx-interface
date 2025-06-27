import { getTimestampByDaysAgo, normalizeDateRange } from "lib/dates";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { ApyPeriod } from "lib/oracleKeeperFetcher";

export const POOLS_TIME_RANGE_OPTIONS = ["total", "180d", "90d", "30d"] as const;

export type PoolsTimeRange = (typeof POOLS_TIME_RANGE_OPTIONS)[number];

export type Period = {
  periodStart: number;
  periodEnd: number;
};

export function usePoolsTimeRange() {
  const [timeRange, setTimeRange] = useLocalStorageSerializeKey<PoolsTimeRange>("pools-time-range", "90d");

  return { timeRange: timeRange ?? "90d", setTimeRange };
}

function getStartDate(days: number) {
  return new Date(getTimestampByDaysAgo(days) * 1000);
}

const TIME_RANGE_TO_DAYS = {
  total: new Date(0),
  "30d": getStartDate(30),
  "90d": getStartDate(90),
  "180d": getStartDate(180),
} as const;

export function convertPoolsTimeRangeToPeriod(timeRange: PoolsTimeRange): Period {
  const [periodStart, periodEnd] = normalizeDateRange(
    TIME_RANGE_TO_DAYS[timeRange] ?? TIME_RANGE_TO_DAYS["90d"],
    new Date()
  );
  return {
    periodStart: Math.max(periodStart, 0),
    periodEnd: Math.min(periodEnd, Date.now()),
  };
}

export const convertPoolsTimeRangeToApyPeriod = (timeRange: PoolsTimeRange): ApyPeriod => {
  switch (timeRange) {
    case "total":
      return "total";
    case "30d":
      return "30d";
    case "90d":
      return "90d";
    case "180d":
      return "180d";
    default:
      return "90d";
  }
};
