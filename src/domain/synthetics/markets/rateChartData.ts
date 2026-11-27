import { bigintToNumber, PRECISION_DECIMALS } from "lib/numbers";
import type { RatesSnapshot } from "sdk/utils/rates/types";

export type RateType = "netRate" | "borrowingRate" | "fundingRate";
export type RateProjection = "1h" | "8h" | "24h" | "1y";

export const RATE_SNAPSHOT_INTERVAL_SECONDS = 3600;
const PROJECTION_SECONDS: Record<RateProjection, number> = { "1h": 3600, "8h": 28800, "24h": 86400, "1y": 31536000 };

export type ChartDataPoint = {
  timestamp: Date;
  timestampMs: number;
  longRate: number | null;
  shortRate: number | null;
  longRateLive: number | null;
  shortRateLive: number | null;
  raw: RatesSnapshot | null;
};

export function rateToProjectedPercent(rateString: string, projection: RateProjection): number {
  return bigintToNumber(BigInt(rateString) * BigInt(PROJECTION_SECONDS[projection]) * 100n, PRECISION_DECIMALS);
}

export function hourlyRateToProjectedPercent(rateHourly: bigint, projection: RateProjection): number {
  const hours = PROJECTION_SECONDS[projection] / RATE_SNAPSHOT_INTERVAL_SECONDS;
  return bigintToNumber(rateHourly * BigInt(hours) * 100n, PRECISION_DECIMALS);
}

// The API returns positive borrowing costs; the UI shows costs as negative rates.
export function borrowingRateToProjectedPercent(rateString: string, projection: RateProjection): number {
  return -rateToProjectedPercent(rateString, projection);
}

const RATE_FIELDS = {
  netRate: ["netRateLong", "netRateShort"],
  borrowingRate: ["borrowingRateLong", "borrowingRateShort"],
  fundingRate: ["fundingRateLong", "fundingRateShort"],
} as const;

export function buildRateChartData({
  snapshots,
  rateType,
  projection,
  liveRates,
  now = Date.now(),
}: {
  snapshots: RatesSnapshot[];
  rateType: RateType;
  projection: RateProjection;
  liveRates?: { longRate: number; shortRate: number };
  now?: number;
}): ChartDataPoint[] {
  const [longKey, shortKey] = RATE_FIELDS[rateType];
  const convert = rateType === "borrowingRate" ? borrowingRateToProjectedPercent : rateToProjectedPercent;
  const data: ChartDataPoint[] = [];
  const intervalMs = RATE_SNAPSHOT_INTERVAL_SECONDS * 1000;

  for (const snapshot of snapshots) {
    const timestampMs = snapshot.timestamp * 1000;
    const previous = data[data.length - 1];
    if (previous && timestampMs - previous.timestampMs > intervalMs) {
      // An absent observation is unknown, not zero or an interpolated rate.
      data.push({
        timestamp: new Date(previous.timestampMs + intervalMs),
        timestampMs: previous.timestampMs + intervalMs,
        longRate: null,
        shortRate: null,
        longRateLive: null,
        shortRateLive: null,
        raw: null,
      });
    }
    data.push({
      timestamp: new Date(timestampMs),
      timestampMs,
      longRate: convert(snapshot[longKey], projection),
      shortRate: convert(snapshot[shortKey], projection),
      longRateLive: null,
      shortRateLive: null,
      raw: snapshot,
    });
  }

  const last = data[data.length - 1];
  // Only join current rates to recent history, never across missing hourly observations.
  if (last && liveRates && now > last.timestampMs && now - last.timestampMs < 2 * intervalMs) {
    last.longRateLive = last.longRate;
    last.shortRateLive = last.shortRate;
    data.push({
      timestamp: new Date(now),
      timestampMs: now,
      longRate: null,
      shortRate: null,
      longRateLive: liveRates.longRate,
      shortRateLive: liveRates.shortRate,
      raw: null,
    });
  }

  return data;
}
