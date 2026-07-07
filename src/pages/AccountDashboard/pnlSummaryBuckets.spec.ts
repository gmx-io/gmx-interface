import { subDays } from "date-fns";
import { describe, expect, it } from "vitest";

import { toUtcDayStart } from "lib/dates";

import { getPnlSummaryBucketForFromDate } from "./pnlSummaryBuckets";

describe("getPnlSummaryBucketForFromDate", () => {
  const now = new Date(Date.UTC(2026, 6, 6, 15, 30));

  it("returns the all bucket when no date is selected", () => {
    expect(getPnlSummaryBucketForFromDate(undefined, now)).toEqual({ bucketLabel: "all", fromTimestamp: undefined });
  });

  it("maps a date within the current UTC day to the today bucket", () => {
    const fromDate = new Date(Date.UTC(2026, 6, 6, 3, 0));
    expect(getPnlSummaryBucketForFromDate(fromDate, now)).toEqual({
      bucketLabel: "today",
      fromTimestamp: toUtcDayStart(fromDate),
    });
  });

  it("maps 7 days back to the week bucket", () => {
    const fromDate = subDays(now, 7);
    expect(getPnlSummaryBucketForFromDate(fromDate, now)).toEqual({
      bucketLabel: "week",
      fromTimestamp: toUtcDayStart(fromDate),
    });
  });

  it("maps 30 days back to the month bucket", () => {
    const fromDate = subDays(now, 30);
    expect(getPnlSummaryBucketForFromDate(fromDate, now)).toEqual({
      bucketLabel: "month",
      fromTimestamp: toUtcDayStart(fromDate),
    });
  });

  it("maps the UTC start of the current year to the year bucket", () => {
    const fromDate = new Date(Date.UTC(2026, 0, 1, 8, 0));
    expect(getPnlSummaryBucketForFromDate(fromDate, now)).toEqual({
      bucketLabel: "year",
      fromTimestamp: toUtcDayStart(fromDate),
    });
  });

  it("falls back to the all bucket for periods without a matching bucket", () => {
    expect(getPnlSummaryBucketForFromDate(subDays(now, 90), now)).toEqual({
      bucketLabel: "all",
      fromTimestamp: undefined,
    });
    expect(getPnlSummaryBucketForFromDate(subDays(now, 365), now)).toEqual({
      bucketLabel: "all",
      fromTimestamp: undefined,
    });
    expect(getPnlSummaryBucketForFromDate(new Date(Date.UTC(2026, 2, 15)), now)).toEqual({
      bucketLabel: "all",
      fromTimestamp: undefined,
    });
  });

  it("falls back to the all bucket when the picked local day starts in the previous UTC day", () => {
    // local midnight east of UTC lands on the previous UTC day and must not be labeled today
    const fromDate = new Date(Date.UTC(2026, 6, 5, 21, 0));
    expect(getPnlSummaryBucketForFromDate(fromDate, now)).toEqual({
      bucketLabel: "all",
      fromTimestamp: undefined,
    });
  });
});
