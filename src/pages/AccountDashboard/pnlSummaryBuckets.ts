import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/macro";
import { sub } from "date-fns";

import type { PnlSummaryBucketLabel } from "domain/synthetics/accountStats/usePnlSummaryData";
import { SECONDS_IN_DAY, toUtcDayStartByCalendarDate } from "lib/dates";

export const PNL_SUMMARY_BUCKET_LABELS: Record<PnlSummaryBucketLabel, MessageDescriptor> = {
  today: msg`Today`,
  yesterday: msg`Yesterday`,
  week: msg`Last 7d`,
  month: msg`Last 30d`,
  year: msg`This year`,
  all: msg`All time`,
};

export type PnlSummaryBucket = {
  bucketLabel: PnlSummaryBucketLabel;
  fromTimestamp: number | undefined;
  toTimestamp: number | undefined;
  isFallback: boolean;
};

const ALL_TIME_FALLBACK_MONTHS = 18;

type AvailableBucket = {
  bucketLabel: Exclude<PnlSummaryBucketLabel, "all">;
  fromTimestamp: number;
  toDayTimestamp: number;
  toTimestamp: number | undefined;
};

export function getPnlSummaryBucketForDateRange(
  fromDate: Date | undefined,
  toDate: Date | undefined,
  now = new Date()
): PnlSummaryBucket {
  if (!fromDate && !toDate) {
    return { bucketLabel: "all", fromTimestamp: undefined, toTimestamp: undefined, isFallback: false };
  }

  const rangeEndDate = toDate ?? now;
  const selectedFromTimestamp = toUtcDayStartByCalendarDate(fromDate ?? rangeEndDate);
  const selectedToTimestamp = toUtcDayStartByCalendarDate(rangeEndDate);
  const allTimeFallbackDate = sub(rangeEndDate, { months: ALL_TIME_FALLBACK_MONTHS });

  if (selectedFromTimestamp < toUtcDayStartByCalendarDate(allTimeFallbackDate)) {
    return { bucketLabel: "all", fromTimestamp: undefined, toTimestamp: undefined, isFallback: true };
  }

  const utcTodayStart = Math.trunc(now.getTime() / 1000 / SECONDS_IN_DAY) * SECONDS_IN_DAY;
  const availableBuckets: AvailableBucket[] = [
    {
      bucketLabel: "today",
      fromTimestamp: utcTodayStart,
      toDayTimestamp: utcTodayStart,
      toTimestamp: undefined,
    },
    {
      bucketLabel: "yesterday",
      fromTimestamp: utcTodayStart - SECONDS_IN_DAY,
      toDayTimestamp: utcTodayStart - SECONDS_IN_DAY,
      toTimestamp: utcTodayStart - 1,
    },
    {
      bucketLabel: "week",
      fromTimestamp: utcTodayStart - 7 * SECONDS_IN_DAY,
      toDayTimestamp: utcTodayStart,
      toTimestamp: undefined,
    },
    {
      bucketLabel: "month",
      fromTimestamp: utcTodayStart - 30 * SECONDS_IN_DAY,
      toDayTimestamp: utcTodayStart,
      toTimestamp: undefined,
    },
    {
      bucketLabel: "year",
      fromTimestamp: Date.UTC(now.getUTCFullYear(), 0, 1) / 1000,
      toDayTimestamp: utcTodayStart,
      toTimestamp: undefined,
    },
  ];

  const nearestBucket = availableBuckets.reduce((nearest, candidate) => {
    const nearestDistance = getBucketDistance(selectedFromTimestamp, selectedToTimestamp, nearest);
    const candidateDistance = getBucketDistance(selectedFromTimestamp, selectedToTimestamp, candidate);

    if (candidateDistance < nearestDistance) {
      return candidate;
    }

    const nearestDuration = nearest.toDayTimestamp - nearest.fromTimestamp;
    const candidateDuration = candidate.toDayTimestamp - candidate.fromTimestamp;
    if (candidateDistance === nearestDistance && candidateDuration > nearestDuration) {
      return candidate;
    }

    return nearest;
  });
  const isFallback =
    selectedFromTimestamp !== nearestBucket.fromTimestamp || selectedToTimestamp !== nearestBucket.toDayTimestamp;

  return {
    bucketLabel: nearestBucket.bucketLabel,
    fromTimestamp: nearestBucket.fromTimestamp,
    toTimestamp: nearestBucket.toTimestamp,
    isFallback,
  };
}

function getBucketDistance(fromTimestamp: number, toTimestamp: number, bucket: AvailableBucket) {
  return Math.abs(fromTimestamp - bucket.fromTimestamp) + Math.abs(toTimestamp - bucket.toDayTimestamp);
}
