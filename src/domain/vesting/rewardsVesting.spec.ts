import { describe, expect, it } from "vitest";

import { SECONDS_IN_DAY } from "lib/dates";

import {
  getRewardsVestingDaysLeft,
  getRewardsVestingDepositCapacity,
  getRewardsVestingEffectiveRemainingAmount,
  getRewardsVestingEndTimestamp,
  getRewardsVestingMaxDepositAmount,
  getRewardsVestingPairAmounts,
  getRewardsVestingProgress,
  getRewardsVestingRemainingDuration,
} from "./rewardsVesting";

describe("getRewardsVestingEffectiveRemainingAmount", () => {
  it("subtracts only the time-accrued part of claimable GMX from the stored balance", () => {
    expect(
      getRewardsVestingEffectiveRemainingAmount({
        totalVestedAmount: 1000n,
        escrowedBalance: 600n,
        claimedAmount: 350n,
        claimableAmount: 100n,
      })
    ).toBe(550n);
  });

  it("matches an active onchain Vester snapshot", () => {
    expect(
      getRewardsVestingEffectiveRemainingAmount({
        totalVestedAmount: 297000000000000000000n,
        escrowedBalance: 54972865296803652970n,
        claimedAmount: 242025822393455098933n,
        claimableAmount: 1706980974124809740n,
      })
    ).toBe(53267196632420091327n);
  });

  it("does not subtract previously accrued but unclaimed GMX twice", () => {
    expect(
      getRewardsVestingEffectiveRemainingAmount({
        totalVestedAmount: 1000n,
        escrowedBalance: 600n,
        claimedAmount: 350n,
        claimableAmount: 50n,
      })
    ).toBe(600n);
  });

  it("clamps pending vesting to the stored escrowed balance", () => {
    expect(
      getRewardsVestingEffectiveRemainingAmount({
        totalVestedAmount: 1000n,
        escrowedBalance: 600n,
        claimedAmount: 350n,
        claimableAmount: 1000n,
      })
    ).toBe(0n);
  });
});

describe("getRewardsVestingPairAmounts", () => {
  const baseParams = {
    effectiveRemainingAmount: 50n,
    depositAmount: 20n,
    averageStakedAmount: 200n,
    maxVestableAmount: 100n,
    currentPairAmount: 100n,
    availablePairAmount: 50n,
  };

  it("calculates required and additional pair amounts from projected unvested balance", () => {
    expect(getRewardsVestingPairAmounts(baseParams)).toEqual({
      projectedRemainingAmount: 70n,
      requiredPairAmount: 140n,
      additionalPairAmount: 40n,
      stakeShortfallAmount: 0n,
    });
  });

  it("reports the amount that must be staked when free pair tokens are insufficient", () => {
    expect(getRewardsVestingPairAmounts({ ...baseParams, availablePairAmount: 25n })).toEqual({
      projectedRemainingAmount: 70n,
      requiredPairAmount: 140n,
      additionalPairAmount: 40n,
      stakeShortfallAmount: 15n,
    });
  });

  it("does not require more pair tokens when the currently locked amount is enough", () => {
    expect(getRewardsVestingPairAmounts({ ...baseParams, currentPairAmount: 150n })).toEqual({
      projectedRemainingAmount: 70n,
      requiredPairAmount: 140n,
      additionalPairAmount: 0n,
      stakeShortfallAmount: 0n,
    });
  });

  it("uses the same floor division as Vester.getPairAmount", () => {
    expect(
      getRewardsVestingPairAmounts({
        effectiveRemainingAmount: 1n,
        depositAmount: 1n,
        averageStakedAmount: 2n,
        maxVestableAmount: 3n,
        currentPairAmount: 0n,
        availablePairAmount: 0n,
      })
    ).toEqual({
      projectedRemainingAmount: 2n,
      requiredPairAmount: 1n,
      additionalPairAmount: 1n,
      stakeShortfallAmount: 1n,
    });
  });

  it("does not require pair tokens without an average staked amount", () => {
    expect(getRewardsVestingPairAmounts({ ...baseParams, averageStakedAmount: 0n })).toEqual({
      projectedRemainingAmount: 70n,
      requiredPairAmount: 0n,
      additionalPairAmount: 0n,
      stakeShortfallAmount: 0n,
    });
  });

  it("does not require pair tokens without a vesting allowance", () => {
    expect(getRewardsVestingPairAmounts({ ...baseParams, maxVestableAmount: 0n })).toEqual({
      projectedRemainingAmount: 70n,
      requiredPairAmount: 0n,
      additionalPairAmount: 0n,
      stakeShortfallAmount: 0n,
    });
  });

  it("uses effective remaining rather than lifetime vested amount for an active account", () => {
    expect(
      getRewardsVestingPairAmounts({
        effectiveRemainingAmount: 53267196632420091327n,
        depositAmount: 170000000000000000000n,
        averageStakedAmount: 5904693168605697364940n,
        maxVestableAmount: 746939521732033525540n,
        currentPairAmount: 2110677281288406948718n,
        availablePairAmount: 261494345489020737034n,
      })
    ).toEqual({
      projectedRemainingAmount: 223267196632420091327n,
      requiredPairAmount: 1764967915571279816564n,
      additionalPairAmount: 0n,
      stakeShortfallAmount: 0n,
    });
  });
});

describe("getRewardsVestingDepositCapacity", () => {
  const baseParams = {
    walletEsGmxAmount: 100n,
    totalVestedAmount: 0n,
    maxVestableAmount: 100n,
    effectiveRemainingAmount: 0n,
    averageStakedAmount: 0n,
    currentPairAmount: 0n,
    availablePairAmount: 0n,
  };

  it("limits the deposit by the remaining lifetime vesting allowance", () => {
    expect(
      getRewardsVestingDepositCapacity({
        ...baseParams,
        totalVestedAmount: 80n,
      })
    ).toEqual({
      remainingVestableAmount: 20n,
      maxDepositByPairAmount: undefined,
      maxDepositAmount: 20n,
    });
  });

  it("limits the deposit by the esGMX wallet balance", () => {
    expect(getRewardsVestingMaxDepositAmount({ ...baseParams, walletEsGmxAmount: 5n })).toBe(5n);
  });

  it("finds the exact maximum accepted by floored pair requirements", () => {
    const capacity = getRewardsVestingDepositCapacity({
      ...baseParams,
      maxVestableAmount: 10n,
      averageStakedAmount: 3n,
      currentPairAmount: 1n,
      availablePairAmount: 1n,
    });

    expect(capacity).toEqual({
      remainingVestableAmount: 10n,
      maxDepositByPairAmount: 9n,
      maxDepositAmount: 9n,
    });
    expect(
      getRewardsVestingPairAmounts({
        effectiveRemainingAmount: 0n,
        depositAmount: capacity.maxDepositAmount,
        averageStakedAmount: 3n,
        maxVestableAmount: 10n,
        currentPairAmount: 1n,
        availablePairAmount: 1n,
      }).stakeShortfallAmount
    ).toBe(0n);
    expect(
      getRewardsVestingPairAmounts({
        effectiveRemainingAmount: 0n,
        depositAmount: capacity.maxDepositAmount + 1n,
        averageStakedAmount: 3n,
        maxVestableAmount: 10n,
        currentPairAmount: 1n,
        availablePairAmount: 1n,
      }).stakeShortfallAmount
    ).toBe(1n);
  });

  it("inverts a non-divisible floored pair requirement without dropping an accepted wei", () => {
    const capacity = getRewardsVestingDepositCapacity({
      ...baseParams,
      maxVestableAmount: 10n,
      averageStakedAmount: 3n,
      availablePairAmount: 1n,
    });

    expect(capacity.maxDepositByPairAmount).toBe(6n);
    expect(capacity.maxDepositAmount).toBe(6n);
    expect(
      getRewardsVestingPairAmounts({
        effectiveRemainingAmount: 0n,
        depositAmount: 7n,
        averageStakedAmount: 3n,
        maxVestableAmount: 10n,
        currentPairAmount: 0n,
        availablePairAmount: 1n,
      }).stakeShortfallAmount
    ).toBe(1n);
  });

  it("subtracts the amount that is already still vesting from pair capacity", () => {
    expect(
      getRewardsVestingDepositCapacity({
        ...baseParams,
        effectiveRemainingAmount: 20n,
        averageStakedAmount: 3n,
        currentPairAmount: 1n,
        availablePairAmount: 1n,
      })
    ).toEqual({
      remainingVestableAmount: 100n,
      maxDepositByPairAmount: 79n,
      maxDepositAmount: 79n,
    });
  });

  it("allows the full wallet balance for an active account with enough locked and free pair tokens", () => {
    expect(
      getRewardsVestingDepositCapacity({
        walletEsGmxAmount: 170000000000000000000n,
        totalVestedAmount: 297000000000000000000n,
        maxVestableAmount: 746939521732033525540n,
        effectiveRemainingAmount: 53267196632420091327n,
        averageStakedAmount: 5904693168605697364940n,
        currentPairAmount: 2110677281288406948718n,
        availablePairAmount: 261494345489020737034n,
      })
    ).toEqual({
      remainingVestableAmount: 449939521732033525540n,
      maxDepositByPairAmount: 246810841256520946958n,
      maxDepositAmount: 170000000000000000000n,
    });
  });

  it("returns no capacity when the lifetime vesting allowance is exhausted", () => {
    expect(
      getRewardsVestingDepositCapacity({
        ...baseParams,
        totalVestedAmount: 100n,
        averageStakedAmount: 3n,
      })
    ).toEqual({
      remainingVestableAmount: 0n,
      maxDepositByPairAmount: 33n,
      maxDepositAmount: 0n,
    });
  });

  it("returns no capacity when the maximum vestable amount is zero", () => {
    expect(
      getRewardsVestingDepositCapacity({
        ...baseParams,
        maxVestableAmount: 0n,
        averageStakedAmount: 3n,
      })
    ).toEqual({
      remainingVestableAmount: 0n,
      maxDepositByPairAmount: 0n,
      maxDepositAmount: 0n,
    });
  });
});

describe("getRewardsVestingProgress", () => {
  it("returns completed and remaining amounts with basis-point progress", () => {
    expect(
      getRewardsVestingProgress({
        totalVestedAmount: 10n,
        effectiveRemainingAmount: 4n,
      })
    ).toEqual({
      totalAmount: 10n,
      completedAmount: 6n,
      remainingAmount: 4n,
      progressBps: 6000n,
    });
  });

  it("floors progress to whole basis points", () => {
    expect(
      getRewardsVestingProgress({
        totalVestedAmount: 3n,
        effectiveRemainingAmount: 2n,
      }).progressBps
    ).toBe(3333n);
  });

  it("clamps inconsistent remaining amounts and handles an empty position", () => {
    expect(getRewardsVestingProgress({ totalVestedAmount: 10n, effectiveRemainingAmount: 20n })).toEqual({
      totalAmount: 10n,
      completedAmount: 0n,
      remainingAmount: 10n,
      progressBps: 0n,
    });
    expect(getRewardsVestingProgress({ totalVestedAmount: 0n, effectiveRemainingAmount: 0n })).toEqual({
      totalAmount: 0n,
      completedAmount: 0n,
      remainingAmount: 0n,
      progressBps: 0n,
    });
  });
});

describe("rewards vesting end date", () => {
  it("projects a full duration when the entire deposited amount remains", () => {
    expect(
      getRewardsVestingRemainingDuration({
        totalVestedAmount: 100n,
        effectiveRemainingAmount: 100n,
        vestingDuration: 400n,
      })
    ).toBe(400n);
  });

  it("rounds the projected remaining duration up to the next second", () => {
    const params = {
      totalVestedAmount: 3n,
      effectiveRemainingAmount: 1n,
      vestingDuration: 10n,
    };

    expect(getRewardsVestingRemainingDuration(params)).toBe(4n);
    expect(getRewardsVestingEndTimestamp({ ...params, currentTimestamp: 1000n })).toBe(1004n);
  });

  it("returns zero duration for completed vesting and undefined without an active schedule", () => {
    expect(
      getRewardsVestingRemainingDuration({
        totalVestedAmount: 100n,
        effectiveRemainingAmount: 0n,
        vestingDuration: 400n,
      })
    ).toBe(0n);
    expect(
      getRewardsVestingRemainingDuration({
        totalVestedAmount: 0n,
        effectiveRemainingAmount: 0n,
        vestingDuration: 400n,
      })
    ).toBeUndefined();
    expect(
      getRewardsVestingRemainingDuration({
        totalVestedAmount: 100n,
        effectiveRemainingAmount: 100n,
        vestingDuration: 0n,
      })
    ).toBeUndefined();
  });

  it("rounds days left up and never returns a negative value", () => {
    const day = BigInt(SECONDS_IN_DAY);

    expect(getRewardsVestingDaysLeft({ currentTimestamp: 1000n, endTimestamp: 1001n })).toBe(1n);
    expect(getRewardsVestingDaysLeft({ currentTimestamp: 1000n, endTimestamp: 1000n + day })).toBe(1n);
    expect(getRewardsVestingDaysLeft({ currentTimestamp: 1000n, endTimestamp: 1001n + day })).toBe(2n);
    expect(getRewardsVestingDaysLeft({ currentTimestamp: 1000n, endTimestamp: 999n })).toBe(0n);
  });
});
