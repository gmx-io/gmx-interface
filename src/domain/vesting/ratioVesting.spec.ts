import { describe, expect, it } from "vitest";

import {
  getRatioVestingDepositPreview,
  getRatioVestingEndTimestamp,
  getRatioVestingMaxDepositAmount,
  getRatioVestingPairAmount,
  isRatioVestingDepositDisabled,
  PAIR_RATIO_PRECISION,
  type RatioVestingData,
} from "./ratioVesting";
import type { RewardsVestingData } from "./useRewardsVestingData";

const U = 10n ** 18n;

const ratio: RatioVestingData = {
  pairRatioFactor: 5n * PAIR_RATIO_PRECISION,
  capUsedAmount: 0n,
  unpaidClaimAmount: 0n,
  deactivatedAt: 0n,
  isFrozen: false,
  isIssuerBindingConfirmed: true,
  esTokenAllowance: 0n,
  pairTokenAllowance: 0n,
  tranches: [],
};

const data: RewardsVestingData = {
  walletGmxBalance: 0n,
  walletEsGmxBalance: 100n * U,
  claimableEsGmxRewards: 0n,
  stakedGmxBalance: 0n,
  freePairAmount: 500n * U,
  vestingDuration: 31536000n,
  vestingInfo: {
    pairAmount: 0n,
    vestedAmount: 0n,
    escrowedBalance: 0n,
    claimedAmounts: 0n,
    claimable: 0n,
    maxVestableAmount: 100n * U,
    averageStakedAmount: 0n,
  },
  ratioVesting: ratio,
};

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

describe("getRatioVestingDepositPreview", () => {
  it.each([
    {
      name: "approves both tokens before depositing",
      overrides: {},
      amount: 100n * U,
      expected: [100n * U, 100n * U, 500n * U],
      steps: ["approveEsGmx", "approvePair", "deposit"],
    },
    {
      name: "claims pending rewards first",
      overrides: { walletEsGmxBalance: 0n, claimableEsGmxRewards: 100n * U },
      amount: 100n * U,
      expected: [100n * U, 100n * U, 500n * U],
      steps: ["claim", "approveEsGmx", "approvePair", "deposit"],
    },
    {
      name: "skips an existing esGMX approval",
      overrides: {},
      ratioOverrides: { esTokenAllowance: 100n * U },
      amount: 100n * U,
      expected: [100n * U, 100n * U, 500n * U],
      steps: ["approvePair", "deposit"],
    },
    {
      name: "deposits directly when both allowances cover the amount",
      overrides: {},
      ratioOverrides: { esTokenAllowance: 100n * U, pairTokenAllowance: 500n * U },
      amount: 100n * U,
      expected: [100n * U, 100n * U, 500n * U],
      steps: ["deposit"],
    },
    {
      name: "limits the maximum by free sbfGMX",
      overrides: { freePairAmount: 50n * U },
      amount: 0n,
      expected: [100n * U, 10n * U, 0n],
      steps: ["deposit"],
    },
    {
      name: "limits the maximum by the lifetime cap",
      overrides: {},
      ratioOverrides: { capUsedAmount: 50n * U },
      amount: 0n,
      expected: [50n * U, 50n * U, 0n],
      steps: ["deposit"],
    },
    {
      name: "requires no collateral without a pair ratio",
      overrides: { freePairAmount: 0n },
      ratioOverrides: { pairRatioFactor: 0n },
      amount: 100n * U,
      expected: [100n * U, 100n * U, 0n],
      steps: ["approveEsGmx", "deposit"],
    },
    {
      name: "reuses locked collateral and exact allowances",
      overrides: {
        vestingInfo: { ...data.vestingInfo, pairAmount: 100n * U, vestedAmount: 20n * U, escrowedBalance: 20n * U },
      },
      ratioOverrides: { esTokenAllowance: 10n * U, pairTokenAllowance: 50n * U },
      amount: 10n * U,
      expected: [100n * U, 100n * U, 50n * U],
      steps: ["deposit"],
    },
  ])("$name", ({ overrides, ratioOverrides, amount, expected, steps }) => {
    const [availableEsGmx, maxDepositAmount, additionalPairAmount] = expected;
    const preview = getRatioVestingDepositPreview(
      { ...data, ...overrides, ratioVesting: { ...ratio, ...ratioOverrides } },
      amount
    );

    expect(preview).toEqual({ availableEsGmx, maxDepositAmount, additionalPairAmount, action: steps[0], steps });
  });
});

describe("isRatioVestingDepositDisabled", () => {
  it.each([
    { name: "open", overrides: {}, now: 100n, expected: false },
    { name: "frozen", overrides: { isFrozen: true }, now: 100n, expected: true },
    { name: "issuer binding unconfirmed", overrides: { isIssuerBindingConfirmed: false }, now: 100n, expected: true },
    { name: "before deactivation", overrides: { deactivatedAt: 100n }, now: 99n, expected: false },
    { name: "at deactivation", overrides: { deactivatedAt: 100n }, now: 100n, expected: true },
  ])("$name", ({ overrides, now, expected }) => {
    expect(isRatioVestingDepositDisabled({ ...ratio, ...overrides }, now)).toBe(expected);
  });
});
