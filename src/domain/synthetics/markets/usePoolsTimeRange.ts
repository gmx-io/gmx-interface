import { getTimestampByDaysAgo, normalizeDateRange } from "lib/dates";
import { useLocalStorageSerializeKey } from "lib/localStorage";

export const POOLS_TIME_RANGE_OPTIONS = ["30d", "90d", "180d", "total"] as const;

export type PoolsTimeRange = (typeof POOLS_TIME_RANGE_OPTIONS)[number];

export type Period = {
  periodStart: number;
  periodEnd: number;
};

export function usePoolsTimeRange() {
  const [timeRange, setTimeRange] = useLocalStorageSerializeKey<PoolsTimeRange>("pools-time-range", "90d");
  const isValidTimeRange = timeRange && POOLS_TIME_RANGE_OPTIONS.includes(timeRange);
  return { timeRange: isValidTimeRange ? timeRange : "90d", setTimeRange };
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
