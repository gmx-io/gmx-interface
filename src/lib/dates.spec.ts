import { describe, expect, it } from "vitest";

import { normalizeDateRange, normalizeDateRangeToUtcBucketDays, SECONDS_IN_DAY } from "./dates";

function toSeconds(date: Date) {
  return Math.round(date.getTime() / 1000);
}

function floorToUtcDay(timestamp: number) {
  return Math.floor(timestamp / SECONDS_IN_DAY) * SECONDS_IN_DAY;
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

  it("converts device-local calendar filters to overlapping UTC history buckets", () => {
    const start = new Date(2026, 5, 11, 15, 30);
    const end = new Date(2026, 5, 12, 8, 10);

    const [localFromTimestamp, localToTimestamp] = normalizeDateRange(start, end);
    const [fromBucketTimestamp, toBucketTimestamp] = normalizeDateRangeToUtcBucketDays(start, end);

    expect(fromBucketTimestamp).toBe(floorToUtcDay(localFromTimestamp));
    expect(toBucketTimestamp).toBe(floorToUtcDay(localToTimestamp));
    expect(fromBucketTimestamp % SECONDS_IN_DAY).toBe(0);
    expect(toBucketTimestamp % SECONDS_IN_DAY).toBe(0);
  });
});
