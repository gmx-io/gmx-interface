import { sub } from "date-fns";
import { describe, expect, it } from "vitest";

import { getPnlSummaryBucketForDateRange } from "./pnlSummaryBuckets";

const utcDayStart = (date: Date) => Math.trunc(date.getTime() / 1000 / 86400) * 86400;

describe("getPnlSummaryBucketForDateRange", () => {
  const now = new Date("2026-06-15T14:30:00.000Z");
  const today = new Date(2026, 5, 15);

  it("matches all time when no range is selected", () => {
    expect(getPnlSummaryBucketForDateRange(undefined, undefined, now)).toEqual({
      bucketLabel: "all",
      fromTimestamp: undefined,
      toTimestamp: undefined,
      isFallback: false,
    });
  });

  it("matches the exact UTC today and yesterday ranges", () => {
    expect(getPnlSummaryBucketForDateRange(today, today, now)).toEqual({
      bucketLabel: "today",
      fromTimestamp: utcDayStart(now),
      toTimestamp: undefined,
      isFallback: false,
    });

    const yesterday = new Date(2026, 5, 14);
    expect(getPnlSummaryBucketForDateRange(yesterday, yesterday, now)).toEqual({
      bucketLabel: "yesterday",
      fromTimestamp: utcDayStart(now) - 86400,
      toTimestamp: utcDayStart(now) - 1,
      isFallback: false,
    });
  });

  it("matches the exact 7d, 30d, and year ranges", () => {
    expect(getPnlSummaryBucketForDateRange(new Date(2026, 5, 8), today, now).bucketLabel).toBe("week");
    expect(getPnlSummaryBucketForDateRange(new Date(2026, 4, 16), today, now).bucketLabel).toBe("month");

    const year = getPnlSummaryBucketForDateRange(new Date(2026, 0, 1), today, now);
    expect(year).toEqual({
      bucketLabel: "year",
      fromTimestamp: Date.UTC(2026, 0, 1) / 1000,
      toTimestamp: undefined,
      isFallback: false,
    });
  });

  it("uses UTC boundaries even when the local calendar day differs", () => {
    const nearUtcMidnight = new Date("2026-06-15T23:30:00.000Z");

    expect(getPnlSummaryBucketForDateRange(today, today, nearUtcMidnight)).toEqual({
      bucketLabel: "today",
      fromTimestamp: Date.UTC(2026, 5, 15) / 1000,
      toTimestamp: undefined,
      isFallback: false,
    });
  });

  it("uses the nearest available bucket for unmatched ranges", () => {
    expect(getPnlSummaryBucketForDateRange(sub(today, { days: 90 }), today, now)).toEqual({
      bucketLabel: "month",
      fromTimestamp: utcDayStart(now) - 30 * 86400,
      toTimestamp: undefined,
      isFallback: true,
    });

    expect(getPnlSummaryBucketForDateRange(new Date(2026, 1, 15), today, now)).toEqual({
      bucketLabel: "year",
      fromTimestamp: Date.UTC(2026, 0, 1) / 1000,
      toTimestamp: undefined,
      isFallback: true,
    });

    expect(getPnlSummaryBucketForDateRange(sub(today, { days: 365 }), today, now)).toEqual({
      bucketLabel: "year",
      fromTimestamp: Date.UTC(2026, 0, 1) / 1000,
      toTimestamp: undefined,
      isFallback: true,
    });
  });

  it("marks a historical range as a fallback even when its start matches a bucket", () => {
    expect(getPnlSummaryBucketForDateRange(new Date(2026, 4, 16), new Date(2026, 4, 20), now)).toEqual({
      bucketLabel: "month",
      fromTimestamp: utcDayStart(now) - 30 * 86400,
      toTimestamp: undefined,
      isFallback: true,
    });
  });

  it("uses today as the nearest bucket for a future range", () => {
    expect(getPnlSummaryBucketForDateRange(new Date(2026, 5, 20), new Date(2026, 5, 25), now)).toEqual({
      bucketLabel: "today",
      fromTimestamp: utcDayStart(now),
      toTimestamp: undefined,
      isFallback: true,
    });
  });

  it("falls back to all time only when the selected range exceeds 18 months", () => {
    expect(getPnlSummaryBucketForDateRange(sub(today, { months: 18 }), today, now)).toEqual({
      bucketLabel: "year",
      fromTimestamp: Date.UTC(2026, 0, 1) / 1000,
      toTimestamp: undefined,
      isFallback: true,
    });

    expect(getPnlSummaryBucketForDateRange(sub(today, { months: 18, days: 1 }), today, now)).toEqual({
      bucketLabel: "all",
      fromTimestamp: undefined,
      toTimestamp: undefined,
      isFallback: true,
    });
  });

  it("does not use all time for a short historical range older than 18 months", () => {
    expect(getPnlSummaryBucketForDateRange(new Date(2024, 0, 1), new Date(2024, 0, 2), now)).toEqual({
      bucketLabel: "year",
      fromTimestamp: Date.UTC(2026, 0, 1) / 1000,
      toTimestamp: undefined,
      isFallback: true,
    });
  });
});
