import type { ProtocolStatsTimeseriesPoint } from "sdk/utils/stats/types";

export type ProtocolStatsFeesWindows = {
  epochFees: bigint;
  weeklyFees: bigint;
};

export function parseProtocolStatsUsd(value: string | null | undefined): bigint | undefined {
  return value === null || value === undefined ? undefined : BigInt(value);
}

// same windows as the V1 and V2 fee hooks: a day counts from its start timestamp, the open day included
export function getProtocolStatsFeesWindows(
  points: ProtocolStatsTimeseriesPoint[],
  windows: { epochStartedTimestamp: number; weekAgoTimestamp: number }
): ProtocolStatsFeesWindows {
  let epochFees = 0n;
  let weeklyFees = 0n;

  for (const point of points) {
    if (point.value === null) {
      continue;
    }
    const value = BigInt(point.value);
    if (point.day >= windows.weekAgoTimestamp) {
      weeklyFees += value;
    }
    if (point.day >= windows.epochStartedTimestamp) {
      epochFees += value;
    }
  }

  return { epochFees, weeklyFees };
}
