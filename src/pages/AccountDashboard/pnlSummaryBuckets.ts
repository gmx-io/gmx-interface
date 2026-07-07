import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/macro";

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
};

// accountPnlSummaryStats is only available for fixed UTC-based buckets, so buckets are
// matched by UTC day boundaries and chart periods without a matching bucket are shared
// as all time to keep stats and chart consistent.
export function getPnlSummaryBucketForFromDate(fromDate: Date | undefined, now = new Date()): PnlSummaryBucket {
  if (!fromDate) {
    return { bucketLabel: "all", fromTimestamp: undefined };
  }

  const fromTimestamp = toUtcDayStart(fromDate);
  const daysDiff = (toUtcDayStart(now) - fromTimestamp) / SECONDS_IN_DAY;
  const utcYearStartTimestamp = Date.UTC(now.getUTCFullYear(), 0, 1) / 1000;

  let bucketLabel: string | undefined;
  if (daysDiff === 0) {
    bucketLabel = "today";
  } else if (daysDiff === 7) {
    bucketLabel = "week";
  } else if (daysDiff === 30) {
    bucketLabel = "month";
  } else if (fromTimestamp === utcYearStartTimestamp) {
    bucketLabel = "year";
  }

  if (!bucketLabel) {
    return { bucketLabel: "all", fromTimestamp: undefined };
  }

  return { bucketLabel, fromTimestamp };
}
