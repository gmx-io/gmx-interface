import { describe, expect, it } from "vitest";

import { createEmptyRewardsHistoryEntry, fillRewardsHistoryPage } from "../useAccountRewardsHistory";

describe("fillRewardsHistoryPage", () => {
  const entries = [
    { ...createEmptyRewardsHistoryEntry(100), tradingVolume: 1n },
    { ...createEmptyRewardsHistoryEntry(300), tradingVolume: 3n },
  ];

  it.each([
    {
      offset: 0,
      expected: [
        [300, 3n],
        [200, 0n],
      ],
      hasNextPage: true,
    },
    { offset: 2, expected: [[100, 1n]], hasNextPage: false },
  ])("fills every skipped epoch before paginating at offset $offset", ({ offset, expected, hasNextPage }) => {
    const page = fillRewardsHistoryPage({
      entries,
      programStartTimestamp: 100,
      currentEpoch: 300,
      epochDuration: 100,
      limit: 2,
      offset,
    });

    expect(page.entries.map((entry) => [entry.epoch, entry.tradingVolume])).toEqual(expected);
    expect(page.totalCount).toBe(3);
    expect(page.hasNextPage).toBe(hasNextPage);
  });
});
