import { describe, expect, it } from "vitest";

import { normalizeDateRange, normalizeDateRangeToUtcBucketDays, normalizeDateRangeToUtcDays } from "./dates";

function toSeconds(date: Date) {
  return Math.round(date.getTime() / 1000);
}

describe("date range normalization", () => {
  it("converts device-local calendar filters to UTC timestamp bounds", () => {
    const start = new Date(2026, 5, 11, 15, 30);
    const end = new Date(2026, 5, 12, 8, 10);

    const expectedStart = new Date(start);
    expectedStart.setHours(0, 0, 0, 0);

    const expectedEnd = new Date(end);
    expectedEnd.setHours(23, 59, 59, 0);

    expect(normalizeDateRange(start, end)).toEqual([toSeconds(expectedStart), toSeconds(expectedEnd)]);
  });

  it("converts selected calendar dates to UTC history buckets", () => {
    const start = new Date(2026, 5, 11, 15, 30);
    const end = new Date(2026, 5, 12, 8, 10);

    const [fromBucketTimestamp, toBucketTimestamp] = normalizeDateRangeToUtcBucketDays(start, end);

    expect(fromBucketTimestamp).toBe(Date.UTC(2026, 5, 11) / 1000);
    expect(toBucketTimestamp).toBe(Date.UTC(2026, 5, 12) / 1000);
  });

  it("keeps one selected calendar date to one UTC history bucket", () => {
    const date = new Date(2026, 5, 12, 8, 10);

    expect(normalizeDateRangeToUtcBucketDays(date, date)).toEqual([
      Date.UTC(2026, 5, 12) / 1000,
      Date.UTC(2026, 5, 12) / 1000,
    ]);
  });

  it("converts selected calendar dates to UTC event timestamp bounds", () => {
    const start = new Date(2026, 5, 11, 15, 30);
    const end = new Date(2026, 5, 12, 8, 10);

    expect(normalizeDateRangeToUtcDays(start, end)).toEqual([
      Date.UTC(2026, 5, 11) / 1000,
      Date.UTC(2026, 5, 12, 23, 59, 59) / 1000,
    ]);
  });
});
