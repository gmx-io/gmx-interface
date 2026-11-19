import type { TraderReferralStats } from "domain/referrals";
import { SECONDS_IN_DAY } from "lib/dates";

import type { SolanaTraderPoint } from "./solanaReferralsTypes";

function getBucketSizeSeconds(days: number) {
  if (days === 1) return 3600;
  if (days === 7) return 6 * 3600;
  if (days === 0) return 7 * SECONDS_IN_DAY;
  return SECONDS_IN_DAY;
}

// Turns hourly trader points into the same shape the EVM Overview charts use.
export function buildSolanaTraderStats({
  trader,
  points,
  periodStart,
  periodEnd,
  days,
}: {
  trader: string | undefined;
  points: SolanaTraderPoint[];
  periodStart: number;
  periodEnd: number;
  days: number;
}): TraderReferralStats | undefined {
  if (!trader) return undefined;

  const isTotal = days === 0;
  const bucketSizeSeconds = getBucketSizeSeconds(days);
  const firstTimestamp = points.reduce((min, point) => Math.min(min, point.timestamp), periodEnd);
  const from = isTotal ? firstTimestamp : periodStart;
  const compareFrom = from - (periodEnd - from);

  const buckets = new Map<number, { volumeUsd: bigint; discountsUsd: bigint }>();
  for (let timestamp = Math.floor(from / bucketSizeSeconds) * bucketSizeSeconds; timestamp <= periodEnd; ) {
    buckets.set(timestamp, { volumeUsd: 0n, discountsUsd: 0n });
    timestamp += bucketSizeSeconds;
  }

  let volumeUsd = 0n;
  let discountsUsd = 0n;
  let previousVolumeUsd = 0n;
  let previousDiscountsUsd = 0n;

  for (const point of points) {
    if (point.timestamp >= from && point.timestamp <= periodEnd) {
      const bucket = buckets.get(Math.floor(point.timestamp / bucketSizeSeconds) * bucketSizeSeconds);
      if (bucket) {
        bucket.volumeUsd += point.volumeUsd;
        bucket.discountsUsd += point.discountsUsd;
      }
      volumeUsd += point.volumeUsd;
      discountsUsd += point.discountsUsd;
    } else if (!isTotal && point.timestamp >= compareFrom && point.timestamp < from) {
      previousVolumeUsd += point.volumeUsd;
      previousDiscountsUsd += point.discountsUsd;
    }
  }

  return {
    trader,
    from,
    to: periodEnd,
    compareFrom: isTotal ? undefined : compareFrom,
    compareTo: isTotal ? undefined : from,
    hasComparison: !isTotal,
    bucketSizeSeconds,
    summary: {
      volumeUsd,
      volumeUsdDelta: isTotal ? undefined : volumeUsd - previousVolumeUsd,
      discountsUsd,
      discountsUsdDelta: isTotal ? undefined : discountsUsd - previousDiscountsUsd,
    },
    points: Array.from(buckets, ([timestamp, bucket]) => ({ timestamp, ...bucket })),
  };
}
