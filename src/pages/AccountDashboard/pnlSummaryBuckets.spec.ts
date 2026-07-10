import { sub } from "date-fns";
import { describe, expect, it } from "vitest";

import { getPnlSummaryBucketForFromDate } from "./pnlSummaryBuckets";

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
      toTimestamp: undefined,
      isFallback: false,
    });
  });

  it("matches a same-local-day pick to today", () => {
    const fromDate = new Date(2026, 5, 15); // local midnight today
    const bucket = getPnlSummaryBucketForFromDate(fromDate, now);
    expect(bucket.bucketLabel).toBe("today");
    expect(bucket.fromTimestamp).toBe(utcDayStart(now));
    expect(bucket.toTimestamp).toBeUndefined();
    expect(bucket.isFallback).toBe(false);
  });

  it("matches yesterday", () => {
    const fromDate = new Date(2026, 5, 14);
    const bucket = getPnlSummaryBucketForFromDate(fromDate, now);
    expect(bucket.bucketLabel).toBe("yesterday");
    expect(bucket.fromTimestamp).toBe(utcDayStart(now) - 86400);
    expect(bucket.toTimestamp).toBe(utcDayStart(now) - 1);
    expect(bucket.isFallback).toBe(false);
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
    expect(bucket.fromTimestamp).toBe(Date.UTC(now.getUTCFullYear(), 0, 1) / 1000);
    expect(bucket.toTimestamp).toBeUndefined();
    expect(bucket.isFallback).toBe(false);
  });

  it("uses the nearest available bucket for unmatched selections", () => {
    // The 30d bucket starts closer to the 90d preset than the start of the year.
    expect(getPnlSummaryBucketForFromDate(sub(now, { days: 90 }), now)).toEqual({
      bucketLabel: "month",
      fromTimestamp: utcDayStart(now) - 30 * 86400,
      toTimestamp: undefined,
      isFallback: true,
    });

    // The start of the year is closer than the 30d bucket to this calendar pick.
    expect(getPnlSummaryBucketForFromDate(new Date(2026, 1, 15), now)).toEqual({
      bucketLabel: "year",
      fromTimestamp: Date.UTC(now.getUTCFullYear(), 0, 1) / 1000,
      toTimestamp: undefined,
      isFallback: true,
    });

    expect(getPnlSummaryBucketForFromDate(sub(now, { days: 365 }), now)).toEqual({
      bucketLabel: "year",
      fromTimestamp: Date.UTC(now.getUTCFullYear(), 0, 1) / 1000,
      toTimestamp: undefined,
      isFallback: true,
    });

    // Future dates (DateSelect MAX_DATE allows them) use today as the nearest bucket.
    expect(getPnlSummaryBucketForFromDate(new Date(2026, 5, 20), now)).toEqual({
      bucketLabel: "today",
      fromTimestamp: utcDayStart(now),
      toTimestamp: undefined,
      isFallback: true,
    });
  });

  it("prefers the broader period when two buckets are equally near", () => {
    expect(getPnlSummaryBucketForFromDate(sub(now, { days: 4 }), now)).toEqual({
      bucketLabel: "week",
      fromTimestamp: utcDayStart(now) - 7 * 86400,
      toTimestamp: undefined,
      isFallback: true,
    });
  });

  it("falls back to all time only for selections older than 18 months", () => {
    expect(getPnlSummaryBucketForFromDate(sub(now, { months: 18 }), now)).toEqual({
      bucketLabel: "year",
      fromTimestamp: Date.UTC(now.getUTCFullYear(), 0, 1) / 1000,
      toTimestamp: undefined,
      isFallback: true,
    });

    expect(getPnlSummaryBucketForFromDate(sub(now, { months: 18, days: 1 }), now)).toEqual({
      bucketLabel: "all",
      fromTimestamp: undefined,
      toTimestamp: undefined,
      isFallback: true,
    });
  });
});
