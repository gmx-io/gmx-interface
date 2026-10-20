import { describe, expect, it } from "vitest";

import { SECONDS_IN_DAY } from "lib/dates";

import {
  getRewardsVestingAvailableAmount,
  getRewardsVestingDaysLeft,
  getRewardsVestingDepositCapacity,
  getRewardsVestingEffectiveRemainingAmount,
  getRewardsVestingEndTimestamp,
  getRewardsVestingPairAmounts,
  getRewardsVestingProgress,
  getRewardsVestingRemainingDuration,
} from "./rewardsVesting";

describe("getRewardsVestingAvailableAmount", () => {
  it.each([
    { name: "empty", params: { walletEsGmxAmount: 0n, totalVestedAmount: 0n, maxVestableAmount: 0n }, expected: 0n },
    {
      name: "one wei",
      params: { walletEsGmxAmount: 1n, totalVestedAmount: 0n, maxVestableAmount: 100n },
      expected: 1n,
    },
    {
      name: "capped by lifetime allowance",
      params: { walletEsGmxAmount: 100n, totalVestedAmount: 90n, maxVestableAmount: 100n },
      expected: 10n,
    },
    {
      name: "full wallet",
      params: { walletEsGmxAmount: 100n, totalVestedAmount: 90n, maxVestableAmount: 1_000n },
      expected: 100n,
    },
    {
      name: "withdrawal does not restore cap",
      params: { walletEsGmxAmount: 200n, totalVestedAmount: 0n, maxVestableAmount: 150n, capUsedAmount: 100n },
      expected: 50n,
    },
  ])("$name", ({ params, expected }) => {
    expect(getRewardsVestingAvailableAmount(params)).toBe(expected);
  });
});

describe("getRewardsVestingEffectiveRemainingAmount", () => {
  it.each([
    {
      name: "subtracts only time-accrued claimable",
      params: { totalVestedAmount: 1000n, escrowedBalance: 600n, claimedAmount: 350n, claimableAmount: 100n },
      expected: 550n,
    },
    {
      name: "onchain Vester snapshot",
      params: {
        totalVestedAmount: 297000000000000000000n,
        escrowedBalance: 54972865296803652970n,
        claimedAmount: 242025822393455098933n,
        claimableAmount: 1706980974124809740n,
      },
      expected: 53267196632420091327n,
    },
    {
      name: "does not subtract stored unclaimed twice",
      params: { totalVestedAmount: 1000n, escrowedBalance: 600n, claimedAmount: 350n, claimableAmount: 50n },
      expected: 600n,
    },
    {
      name: "clamps to escrowed balance",
      params: { totalVestedAmount: 1000n, escrowedBalance: 600n, claimedAmount: 350n, claimableAmount: 1000n },
      expected: 0n,
    },
    {
      name: "excludes unpaid claims from a past session",
      params: {
        totalVestedAmount: 120n,
        escrowedBalance: 100n,
        claimedAmount: 15n,
        claimableAmount: 22n,
        unpaidClaimAmount: 7n,
      },
      expected: 90n,
    },
  ])("$name", ({ params, expected }) => {
    expect(getRewardsVestingEffectiveRemainingAmount(params)).toBe(expected);
  });
});

describe("getRewardsVestingPairAmounts", () => {
  const base = {
    effectiveRemainingAmount: 50n,
    depositAmount: 20n,
    averageStakedAmount: 200n,
    maxVestableAmount: 100n,
    currentPairAmount: 100n,
    availablePairAmount: 50n,
  };

  it.each([
    { name: "enough free pair", params: base, expected: [70n, 140n, 40n, 0n] },
    { name: "stake shortfall", params: { ...base, availablePairAmount: 25n }, expected: [70n, 140n, 40n, 15n] },
    { name: "locked pair is enough", params: { ...base, currentPairAmount: 150n }, expected: [70n, 140n, 0n, 0n] },
    {
      name: "floor division like Vester.getPairAmount",
      params: {
        effectiveRemainingAmount: 1n,
        depositAmount: 1n,
        averageStakedAmount: 2n,
        maxVestableAmount: 3n,
        currentPairAmount: 0n,
        availablePairAmount: 0n,
      },
      expected: [2n, 1n, 1n, 1n],
    },
    { name: "no average staked", params: { ...base, averageStakedAmount: 0n }, expected: [70n, 0n, 0n, 0n] },
    { name: "no vesting allowance", params: { ...base, maxVestableAmount: 0n }, expected: [70n, 0n, 0n, 0n] },
    {
      name: "active account uses effective remaining",
      params: {
        effectiveRemainingAmount: 53267196632420091327n,
        depositAmount: 170000000000000000000n,
        averageStakedAmount: 5904693168605697364940n,
        maxVestableAmount: 746939521732033525540n,
        currentPairAmount: 2110677281288406948718n,
        availablePairAmount: 261494345489020737034n,
      },
      expected: [223267196632420091327n, 1764967915571279816564n, 0n, 0n],
    },
  ])("$name", ({ params, expected }) => {
    const [projectedRemainingAmount, requiredPairAmount, additionalPairAmount, stakeShortfallAmount] = expected;
    expect(getRewardsVestingPairAmounts(params)).toEqual({
      projectedRemainingAmount,
      requiredPairAmount,
      additionalPairAmount,
      stakeShortfallAmount,
    });
  });
});

describe("getRewardsVestingDepositCapacity", () => {
  const base = {
    walletEsGmxAmount: 100n,
    totalVestedAmount: 0n,
    maxVestableAmount: 100n,
    effectiveRemainingAmount: 0n,
    averageStakedAmount: 0n,
    currentPairAmount: 0n,
    availablePairAmount: 0n,
  };

  it.each([
    { name: "lifetime allowance", params: { ...base, totalVestedAmount: 80n }, expected: [20n, undefined, 20n] },
    { name: "wallet balance", params: { ...base, walletEsGmxAmount: 5n }, expected: [100n, undefined, 5n] },
    {
      name: "already vesting amount uses pair capacity",
      params: {
        ...base,
        effectiveRemainingAmount: 20n,
        averageStakedAmount: 3n,
        currentPairAmount: 1n,
        availablePairAmount: 1n,
      },
      expected: [100n, 79n, 79n],
    },
    {
      name: "active account with enough pair",
      params: {
        walletEsGmxAmount: 170000000000000000000n,
        totalVestedAmount: 297000000000000000000n,
        maxVestableAmount: 746939521732033525540n,
        effectiveRemainingAmount: 53267196632420091327n,
        averageStakedAmount: 5904693168605697364940n,
        currentPairAmount: 2110677281288406948718n,
        availablePairAmount: 261494345489020737034n,
      },
      expected: [449939521732033525540n, 246810841256520946958n, 170000000000000000000n],
    },
    {
      name: "lifetime allowance exhausted",
      params: { ...base, totalVestedAmount: 100n, averageStakedAmount: 3n },
      expected: [0n, 33n, 0n],
    },
    {
      name: "zero max vestable",
      params: { ...base, maxVestableAmount: 0n, averageStakedAmount: 3n },
      expected: [0n, 0n, 0n],
    },
  ])("$name", ({ params, expected }) => {
    const [remainingVestableAmount, maxDepositByPairAmount, maxDepositAmount] = expected;
    expect(getRewardsVestingDepositCapacity(params)).toEqual({
      remainingVestableAmount,
      maxDepositByPairAmount,
      maxDepositAmount,
    });
  });

  it.each([
    { name: "divisible", currentPairAmount: 1n, availablePairAmount: 1n, expected: 9n },
    { name: "non-divisible", currentPairAmount: 0n, availablePairAmount: 1n, expected: 6n },
  ])("inverts the floored pair requirement exactly ($name)", ({ currentPairAmount, availablePairAmount, expected }) => {
    const pairParams = { effectiveRemainingAmount: 0n, averageStakedAmount: 3n, maxVestableAmount: 10n };
    const capacity = getRewardsVestingDepositCapacity({
      ...base,
      ...pairParams,
      currentPairAmount,
      availablePairAmount,
    });
    const getShortfall = (depositAmount: bigint) =>
      getRewardsVestingPairAmounts({ ...pairParams, depositAmount, currentPairAmount, availablePairAmount })
        .stakeShortfallAmount;

    expect(capacity.maxDepositByPairAmount).toBe(expected);
    expect(capacity.maxDepositAmount).toBe(expected);
    expect(getShortfall(expected)).toBe(0n);
    expect(getShortfall(expected + 1n)).toBe(1n);
  });
});

describe("getRewardsVestingProgress", () => {
  it.each([
    { totalVestedAmount: 10n, effectiveRemainingAmount: 4n, expected: [10n, 6n, 4n, 6000n] },
    { totalVestedAmount: 3n, effectiveRemainingAmount: 2n, expected: [3n, 1n, 2n, 3333n] },
    { totalVestedAmount: 10n, effectiveRemainingAmount: 20n, expected: [10n, 0n, 10n, 0n] },
    { totalVestedAmount: 0n, effectiveRemainingAmount: 0n, expected: [0n, 0n, 0n, 0n] },
  ])("total $totalVestedAmount, remaining $effectiveRemainingAmount", ({ expected, ...params }) => {
    const [totalAmount, completedAmount, remainingAmount, progressBps] = expected;
    expect(getRewardsVestingProgress(params)).toEqual({ totalAmount, completedAmount, remainingAmount, progressBps });
  });
});

describe("rewards vesting end date", () => {
  it.each([
    { totalVestedAmount: 100n, effectiveRemainingAmount: 100n, vestingDuration: 400n, expected: 400n },
    { totalVestedAmount: 3n, effectiveRemainingAmount: 1n, vestingDuration: 10n, expected: 4n },
    { totalVestedAmount: 100n, effectiveRemainingAmount: 0n, vestingDuration: 400n, expected: 0n },
    { totalVestedAmount: 0n, effectiveRemainingAmount: 0n, vestingDuration: 400n, expected: undefined },
    { totalVestedAmount: 100n, effectiveRemainingAmount: 100n, vestingDuration: 0n, expected: undefined },
  ])(
    "total $totalVestedAmount, remaining $effectiveRemainingAmount, duration $vestingDuration",
    ({ expected, ...params }) => {
      expect(getRewardsVestingRemainingDuration(params)).toBe(expected);
      expect(getRewardsVestingEndTimestamp({ ...params, currentTimestamp: 1000n })).toBe(
        expected === undefined ? undefined : 1000n + expected
      );
    }
  );

  it.each([
    { endTimestamp: 1001n, expected: 1n },
    { endTimestamp: 1000n + BigInt(SECONDS_IN_DAY), expected: 1n },
    { endTimestamp: 1001n + BigInt(SECONDS_IN_DAY), expected: 2n },
    { endTimestamp: 999n, expected: 0n },
  ])("days left until $endTimestamp", ({ endTimestamp, expected }) => {
    expect(getRewardsVestingDaysLeft({ currentTimestamp: 1000n, endTimestamp })).toBe(expected);
  });
});
