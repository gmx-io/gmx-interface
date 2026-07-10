import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/macro";
import { differenceInCalendarDays, startOfYear, sub } from "date-fns";

import { SECONDS_IN_DAY, toUtcDayStart } from "lib/dates";

export const PNL_SUMMARY_BUCKET_LABELS: Record<string, MessageDescriptor> = {
  today: msg`Today`,
  yesterday: msg`Yesterday`,
  week: msg`Last 7d`,
  month: msg`Last 30d`,
  year: msg`This year`,
  all: msg`All time`,
};

export type PnlSummaryBucket = {
  bucketLabel: string;
  fromTimestamp: number | undefined;
  toTimestamp: number | undefined;
  isFallback: boolean;
};

const ALL_TIME_FALLBACK_MONTHS = 18;

// DateSelect presets and calendar picks are both local time, so compare by local calendar
// day (not UTC) to keep bucket matching stable across timezones and DST transitions.
export function getPnlSummaryBucketForFromDate(fromDate: Date | undefined, now = new Date()): PnlSummaryBucket {
  if (!fromDate) {
    return { bucketLabel: "all", fromTimestamp: undefined, toTimestamp: undefined, isFallback: false };
  }

  const allTimeFallbackDate = sub(now, { months: ALL_TIME_FALLBACK_MONTHS });
  if (differenceInCalendarDays(fromDate, allTimeFallbackDate) < 0) {
    return { bucketLabel: "all", fromTimestamp: undefined, toTimestamp: undefined, isFallback: true };
  }

  const utcTodayStart = toUtcDayStart(now);
  const availableBuckets = [
    { bucketLabel: "today", fromDate: now, fromTimestamp: utcTodayStart },
    {
      bucketLabel: "yesterday",
      fromDate: sub(now, { days: 1 }),
      fromTimestamp: utcTodayStart - SECONDS_IN_DAY,
    },
    { bucketLabel: "week", fromDate: sub(now, { days: 7 }), fromTimestamp: utcTodayStart - 7 * SECONDS_IN_DAY },
    { bucketLabel: "month", fromDate: sub(now, { days: 30 }), fromTimestamp: utcTodayStart - 30 * SECONDS_IN_DAY },
    {
      bucketLabel: "year",
      fromDate: startOfYear(now),
      fromTimestamp: Date.UTC(now.getUTCFullYear(), 0, 1) / 1000,
    },
  ];

  const nearestBucket = availableBuckets.reduce((nearest, candidate) => {
    const nearestDistance = Math.abs(differenceInCalendarDays(fromDate, nearest.fromDate));
    const candidateDistance = Math.abs(differenceInCalendarDays(fromDate, candidate.fromDate));

    if (candidateDistance < nearestDistance) {
      return candidate;
    }

    if (candidateDistance === nearestDistance && candidate.fromDate < nearest.fromDate) {
      return candidate;
    }

    return nearest;
  });
  const isFallback = differenceInCalendarDays(fromDate, nearestBucket.fromDate) !== 0;

  return {
    bucketLabel: nearestBucket.bucketLabel,
    fromTimestamp: nearestBucket.fromTimestamp,
    toTimestamp: nearestBucket.bucketLabel === "yesterday" ? utcTodayStart - 1 : undefined,
    isFallback,
  };
}
