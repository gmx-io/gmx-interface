import { describe, expect, it } from "vitest";

import { SECONDS_IN_DAY } from "lib/dates";

import { formatEpochLabel } from "../RewardsHistoryTab.utils";

function normalizeRange(value: string) {
  return value
    .replace(/[\u2000-\u200A\u202F\u205F\u00A0]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[–—]/g, "-")
    .trim();
}

describe("formatEpochLabel", () => {
  it("shows a single date for one-day epochs", () => {
    const epoch = Date.UTC(2026, 3, 7, 0, 0, 0) / 1000;

    expect(normalizeRange(formatEpochLabel(epoch, SECONDS_IN_DAY, "en-US"))).toBe("Apr 7");
  });

  it("shows an inclusive multi-day range for longer epochs", () => {
    const epoch = Date.UTC(2026, 3, 7, 0, 0, 0) / 1000;

    expect(normalizeRange(formatEpochLabel(epoch, 7 * SECONDS_IN_DAY, "en-US"))).toBe("Apr 7 - 13");
  });

  it("shows time for sub-day epochs", () => {
    const epoch = Date.UTC(2026, 3, 7, 9, 0, 0) / 1000;
    const label = normalizeRange(formatEpochLabel(epoch, 60 * 60, "en-US"));

    expect(label).toContain("Apr 7");
    expect(label).toContain("1:00");
    expect(label).toContain("1:59");
  });
});
