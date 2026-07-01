import { describe, expect, it } from "vitest";

import { getEmptyPnlSummaryData } from "./usePnlSummaryData";

describe("getEmptyPnlSummaryData", () => {
  it("returns one zero-filled row per bucket in display order", () => {
    const data = getEmptyPnlSummaryData();

    expect(data.map((row) => row.bucketLabel)).toEqual(["today", "yesterday", "week", "month", "year", "all"]);

    for (const row of data) {
      expect(row.volume).toBe(0n);
      expect(row.pnlUsd).toBe(0n);
      expect(row.pnlBps).toBe(0n);
      expect(row.usedCapitalUsd).toBe(0n);
      expect(row.wins).toBe(0);
      expect(row.losses).toBe(0);
      expect(row.volumeRank).toBeUndefined();
      expect(row.pnlUsdRank).toBeUndefined();
      expect(row.pnlBpsRank).toBeUndefined();
      expect(row.winsLossesRatioBps).toBeUndefined();
    }
  });
});
