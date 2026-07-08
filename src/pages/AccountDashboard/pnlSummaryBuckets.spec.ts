import { sub } from "date-fns";
import { describe, expect, it } from "vitest";

import { getPnlSummaryBucketForFromDate } from "./pnlSummaryBuckets";

// UTC day start of an instant, derived independently of the implementation's helper so the
// fromTimestamp assertions can't pass tautologically.
const utcDayStart = (date: Date) => Math.trunc(date.getTime() / 1000 / 86400) * 86400;

// `now` is passed explicitly so the cases are deterministic. Dates are built with the local
// `new Date(y, m, d, ...)` constructor, mirroring DateSelect (calendar picks are local midnight,
// presets are `sub(new Date(), duration)`), so these assertions hold under any machine timezone.
describe("getPnlSummaryBucketForFromDate", () => {
  const now = new Date(2026, 5, 15, 14, 30); // Jun 15 2026, 14:30 local

  it("falls back to all time when no date is selected", () => {
    expect(getPnlSummaryBucketForFromDate(undefined, now)).toEqual({
      bucketLabel: "all",
      fromTimestamp: undefined,
    });
  });

  it("matches a same-local-day pick to today", () => {
    const fromDate = new Date(2026, 5, 15); // local midnight today
    const bucket = getPnlSummaryBucketForFromDate(fromDate, now);
    expect(bucket.bucketLabel).toBe("today");
    expect(bucket.fromTimestamp).toBe(utcDayStart(fromDate));
  });

  // Calendar picks are local midnight, so matching must count local calendar days: a pick exactly
  // 7/30 days ago maps to week/month even for UTC-ahead users (UTC-day truncation would drift by
  // one and fall back to all time). These cases pin that regression.
  it("matches local-midnight calendar picks 7 and 30 days ago to week and month", () => {
    expect(getPnlSummaryBucketForFromDate(new Date(2026, 5, 8), now).bucketLabel).toBe("week");
    expect(getPnlSummaryBucketForFromDate(new Date(2026, 4, 16), now).bucketLabel).toBe("month");
  });

  // Presets keep local wall-clock time, so matching must stay stable across DST transitions too.
  it("matches the 7d and 30d presets to week and month", () => {
    expect(getPnlSummaryBucketForFromDate(sub(now, { days: 7 }), now).bucketLabel).toBe("week");
    expect(getPnlSummaryBucketForFromDate(sub(now, { days: 30 }), now).bucketLabel).toBe("month");
  });

  it("matches a local Jan 1 pick to the year bucket", () => {
    const fromDate = new Date(2026, 0, 1);
    const bucket = getPnlSummaryBucketForFromDate(fromDate, now);
    expect(bucket.bucketLabel).toBe("year");
    expect(bucket.fromTimestamp).toBe(utcDayStart(fromDate));
  });

  it("falls back to all time for unmatched and future selections", () => {
    // 90d preset — no matching server bucket exists.
    expect(getPnlSummaryBucketForFromDate(sub(now, { days: 90 }), now)).toEqual({
      bucketLabel: "all",
      fromTimestamp: undefined,
    });
    // Future date (DateSelect MAX_DATE allows it) — a negative day diff must not match a bucket.
    expect(getPnlSummaryBucketForFromDate(new Date(2026, 5, 20), now)).toEqual({
      bucketLabel: "all",
      fromTimestamp: undefined,
    });
  });
});
