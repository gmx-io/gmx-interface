import { describe, expect, it } from "vitest";

import {
  getRatioVestingEndTimestamp,
  getRatioVestingMaxDepositAmount,
  getRatioVestingPairAmount,
  PAIR_RATIO_PRECISION,
} from "./ratioVesting";
import { getRewardsVestingAvailableAmount, getRewardsVestingEffectiveRemainingAmount } from "./rewardsVesting";

describe("ratio vesting", () => {
  it("rounds the fixed collateral requirement up to the last wei", () => {
    expect(getRatioVestingPairAmount(3n, PAIR_RATIO_PRECISION / 2n)).toBe(2n);
    expect(getRatioVestingPairAmount(3n, 5n * PAIR_RATIO_PRECISION)).toBe(15n);
  });

  it("limits deposits to the pair tokens available, including reusable locked collateral", () => {
    const maximum = getRatioVestingMaxDepositAmount({
      availableEsGmx: 100n,
      remainingAmount: 10n,
      currentPairAmount: 100n,
      availablePairAmount: 27n,
      pairRatioFactor: 5n * PAIR_RATIO_PRECISION,
    });
    expect(maximum).toBe(15n);
    expect(getRatioVestingPairAmount(10n + maximum, 5n * PAIR_RATIO_PRECISION)).toBeLessThanOrEqual(127n);
    expect(getRatioVestingPairAmount(11n + maximum, 5n * PAIR_RATIO_PRECISION)).toBeGreaterThan(127n);
  });

  it("does not regain lifetime conversion capacity after a withdrawal", () => {
    expect(
      getRewardsVestingAvailableAmount({
        walletEsGmxAmount: 200n,
        totalVestedAmount: 0n,
        maxVestableAmount: 150n,
        capUsedAmount: 100n,
      })
    ).toBe(50n);
  });

  it("does not count unpaid claims from a past session as new conversion", () => {
    expect(
      getRewardsVestingEffectiveRemainingAmount({
        totalVestedAmount: 120n,
        escrowedBalance: 100n,
        claimedAmount: 15n,
        claimableAmount: 22n,
        unpaidClaimAmount: 7n,
      })
    ).toBe(90n);
  });

  it("uses the last tranche's actual completion time rather than a weighted remaining duration", () => {
    expect(
      getRatioVestingEndTimestamp(
        [
          { startTime: 100n, totalAmount: 100n, convertedAmount: 50n },
          { startTime: 150n, totalAmount: 10n, convertedAmount: 0n },
        ],
        100n
      )
    ).toBe(250n);
    expect(getRatioVestingEndTimestamp([], 100n)).toBeUndefined();
  });
});
