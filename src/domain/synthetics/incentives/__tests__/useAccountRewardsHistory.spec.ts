import { describe, expect, it } from "vitest";

import type { RewardsHistoryEntry } from "../types";
import {
  createEmptyCurrentEpochRewardsHistoryEntry,
  createEmptyRewardsHistoryEntry,
  fillCurrentEpochRewardsHistoryEntryBalance,
  fillRewardsHistoryPage,
  getManualAllocatedPointsFromRewardsHistoryEntries,
  getRewardsHistoryEpochs,
  getRewardsHistoryBackendPageParams,
  mergeCurrentEpochRewardsHistoryEntry,
  shouldInsertCurrentEpochRewardsHistoryEntry,
} from "../useAccountRewardsHistory";

function makeEntry(epoch: number, overrides: Partial<RewardsHistoryEntry> = {}): RewardsHistoryEntry {
  return {
    epoch,
    volume: 1n,
    pointsEarned: 2n,
    pointsSpent: 3n,
    pointsExpired: 4n,
    pointsBalance: 5n,
    rewardsEarned: 6n,
    rewardsClaimed: 7n,
    ...overrides,
  };
}

describe("useAccountRewardsHistory current epoch helpers", () => {
  it("builds a zero-valued current epoch entry", () => {
    expect(createEmptyCurrentEpochRewardsHistoryEntry(2_000)).toEqual({
      epoch: 2_000,
      volume: 0n,
      pointsEarned: 0n,
      pointsSpent: 0n,
      pointsExpired: 0n,
      pointsBalance: 0n,
      rewardsEarned: 0n,
      rewardsClaimed: 0n,
    });
  });

  it("builds a zero-valued current epoch entry with a points balance", () => {
    expect(createEmptyCurrentEpochRewardsHistoryEntry(2_000, 42n)).toEqual({
      epoch: 2_000,
      volume: 0n,
      pointsEarned: 0n,
      pointsSpent: 0n,
      pointsExpired: 0n,
      pointsBalance: 42n,
      rewardsEarned: 0n,
      rewardsClaimed: 0n,
    });
  });

  it("fills a zero-valued current epoch entry with the status points balance", () => {
    expect(
      fillCurrentEpochRewardsHistoryEntryBalance({
        entries: [createEmptyCurrentEpochRewardsHistoryEntry(2_000), makeEntry(1_000)],
        currentEpoch: 2_000,
        currentPointsBalance: 42n,
      })
    ).toEqual([createEmptyCurrentEpochRewardsHistoryEntry(2_000, 42n), makeEntry(1_000)]);
  });

  it("keeps an existing current epoch event balance", () => {
    const currentEpochEntry = makeEntry(2_000, { pointsBalance: 5n });

    expect(
      fillCurrentEpochRewardsHistoryEntryBalance({
        entries: [currentEpochEntry],
        currentEpoch: 2_000,
        currentPointsBalance: 42n,
      })
    ).toEqual([currentEpochEntry]);
  });

  it("detects a missing current epoch from the first backend row", () => {
    expect(shouldInsertCurrentEpochRewardsHistoryEntry(2_000, makeEntry(1_000))).toBe(true);
    expect(shouldInsertCurrentEpochRewardsHistoryEntry(2_000, makeEntry(2_000))).toBe(false);
    expect(shouldInsertCurrentEpochRewardsHistoryEntry(undefined, makeEntry(1_000))).toBe(false);
  });

  it("reserves one backend row on the first virtual page when current epoch is inserted", () => {
    expect(getRewardsHistoryBackendPageParams({ shouldInsertCurrentEpoch: true, limit: 16, offset: 0 })).toEqual({
      limit: 15,
      offset: 0,
    });
  });

  it("shifts later backend pages by the inserted current epoch row", () => {
    expect(getRewardsHistoryBackendPageParams({ shouldInsertCurrentEpoch: true, limit: 16, offset: 16 })).toEqual({
      limit: 16,
      offset: 15,
    });
  });

  it("prepends the current epoch on the first page and adjusts pagination metadata", () => {
    expect(
      mergeCurrentEpochRewardsHistoryEntry({
        page: {
          entries: [makeEntry(1_000)],
          totalCount: 1,
          hasNextPage: false,
        },
        currentEpoch: 2_000,
        shouldInsertCurrentEpoch: true,
        offset: 0,
      })
    ).toEqual({
      entries: [createEmptyCurrentEpochRewardsHistoryEntry(2_000), makeEntry(1_000)],
      totalCount: 2,
      hasNextPage: false,
    });
  });
});

describe("useAccountRewardsHistory empty epoch helpers", () => {
  it("builds dense epoch timestamps from current epoch back to program start", () => {
    expect(
      getRewardsHistoryEpochs({
        programStartTimestamp: 1_000,
        currentEpoch: 1_300,
        epochDuration: 100,
      })
    ).toEqual([1_300, 1_200, 1_100, 1_000]);
  });

  it("fills missing epochs with zero-valued rows carrying the previous existing balance", () => {
    expect(
      fillRewardsHistoryPage({
        entries: [
          makeEntry(1_300, { pointsBalance: 30n }),
          createEmptyRewardsHistoryEntry(1_200),
          makeEntry(1_100, { pointsBalance: 10n }),
        ],
        programStartTimestamp: 1_000,
        currentEpoch: 1_300,
        epochDuration: 100,
        limit: 3,
        offset: 0,
      })
    ).toEqual({
      entries: [
        makeEntry(1_300, { pointsBalance: 30n }),
        createEmptyRewardsHistoryEntry(1_200, 10n),
        makeEntry(1_100, { pointsBalance: 10n }),
      ],
      totalCount: 4,
      hasNextPage: true,
    });

    expect(
      fillRewardsHistoryPage({
        entries: [makeEntry(1_300, { pointsBalance: 30n }), makeEntry(1_100, { pointsBalance: 10n })],
        programStartTimestamp: 1_000,
        currentEpoch: 1_300,
        epochDuration: 100,
        limit: 3,
        offset: 3,
      })
    ).toEqual({
      entries: [createEmptyRewardsHistoryEntry(1_000)],
      totalCount: 4,
      hasNextPage: false,
    });
  });

  it("does not render rows outside the program epoch range but can use older balances as the seed", () => {
    expect(
      fillRewardsHistoryPage({
        entries: [
          makeEntry(1_400, { pointsBalance: 40n }),
          makeEntry(1_300, { pointsBalance: 30n }),
          makeEntry(900, { pointsBalance: 9n }),
        ],
        programStartTimestamp: 1_000,
        currentEpoch: 1_300,
        epochDuration: 100,
        limit: 10,
        offset: 0,
      }).entries
    ).toEqual([
      makeEntry(1_300, { pointsBalance: 30n }),
      createEmptyRewardsHistoryEntry(1_200, 9n),
      createEmptyRewardsHistoryEntry(1_100, 9n),
      createEmptyRewardsHistoryEntry(1_000, 9n),
    ]);
  });
});

describe("getManualAllocatedPointsFromRewardsHistoryEntries", () => {
  it("sums pre-program zero-volume allocations when newer program rows come first", () => {
    const programStartTimestamp = 1_775_588_400;

    expect(
      getManualAllocatedPointsFromRewardsHistoryEntries(
        [
          makeEntry(1_778_310_000, { volume: 0n, pointsEarned: 999n }),
          makeEntry(1_775_592_000, { volume: 100n, pointsEarned: 123n }),
          makeEntry(1_775_584_800, { volume: 0n, pointsEarned: 500n }),
        ],
        programStartTimestamp
      )
    ).toBe(500n);
  });
});
