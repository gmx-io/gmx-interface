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

// accountPnlSummaryStats is only available for fixed buckets, so chart periods
// without a matching bucket are shared as all time to keep stats and chart consistent.
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
