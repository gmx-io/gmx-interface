import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/macro";
import { differenceInCalendarDays, isSameDay, startOfYear } from "date-fns";

import { toUtcDayStart } from "lib/dates";

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
};

// stats exist only for fixed periods, so unmatched selections fall back to all time.
// DateSelect presets and calendar picks are both local time, so compare by local calendar
// day (not UTC) to keep bucket matching stable across timezones and DST transitions.
export function getPnlSummaryBucketForFromDate(fromDate: Date | undefined, now = new Date()): PnlSummaryBucket {
  if (!fromDate) {
    return { bucketLabel: "all", fromTimestamp: undefined };
  }

  const daysDiff = differenceInCalendarDays(now, fromDate);

  let bucketLabel: string | undefined;
  if (daysDiff === 0) {
    bucketLabel = "today";
  } else if (daysDiff === 7) {
    bucketLabel = "week";
  } else if (daysDiff === 30) {
    bucketLabel = "month";
  } else if (isSameDay(fromDate, startOfYear(now))) {
    bucketLabel = "year";
  }

  if (!bucketLabel) {
    return { bucketLabel: "all", fromTimestamp: undefined };
  }

  return { bucketLabel, fromTimestamp: toUtcDayStart(fromDate) };
}
