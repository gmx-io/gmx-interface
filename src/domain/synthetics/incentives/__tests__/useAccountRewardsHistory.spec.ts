import { describe, expect, it } from "vitest";

import type { RewardsHistoryEntry } from "../types";
import {
  createEmptyCurrentEpochRewardsHistoryEntry,
  getManualAllocatedPointsFromRewardsHistoryEntries,
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
