import { describe, expect, it } from "vitest";

import { expandDecimals } from "lib/numbers";

import { getUserEstimatedApr } from "./stakingPowerUtils";

describe("getUserEstimatedApr", () => {
  const baseParams = {
    avgWeeklyBuybackGmx: 10_000,
    userStakingPower: expandDecimals(1000, 18),
    totalNetworkStakingPower: expandDecimals(1_000_000, 18),
    userStakedGmxAndEsGmx: expandDecimals(5000, 18),
  };

  it("computes annualized rate from buyback pace, power share and staked amount", () => {
    // 10_000 GMX/week * 52 = 520_000 GMX/year; share 0.001 -> 520 GMX/year; staked 5000 -> 0.104
    expect(getUserEstimatedApr(baseParams)).toBeCloseTo(0.104);
  });

  it("is independent of power decimals as long as they match", () => {
    expect(
      getUserEstimatedApr({
        ...baseParams,
        userStakingPower: 1000n,
        totalNetworkStakingPower: 1_000_000n,
      })
    ).toBeCloseTo(0.104);
  });

  it("returns undefined when avgWeeklyBuybackGmx is undefined", () => {
    expect(getUserEstimatedApr({ ...baseParams, avgWeeklyBuybackGmx: undefined })).toBeUndefined();
  });

  it("returns undefined when user staking power is undefined", () => {
    expect(getUserEstimatedApr({ ...baseParams, userStakingPower: undefined })).toBeUndefined();
  });

  it("returns undefined when total network staking power is undefined", () => {
    expect(getUserEstimatedApr({ ...baseParams, totalNetworkStakingPower: undefined })).toBeUndefined();
  });

  it("returns undefined when user staking power is zero", () => {
    expect(getUserEstimatedApr({ ...baseParams, userStakingPower: 0n })).toBeUndefined();
  });

  it("returns undefined when total network staking power is zero", () => {
    expect(getUserEstimatedApr({ ...baseParams, totalNetworkStakingPower: 0n })).toBeUndefined();
  });

  it("returns undefined when staked amount is undefined", () => {
    expect(getUserEstimatedApr({ ...baseParams, userStakedGmxAndEsGmx: undefined })).toBeUndefined();
  });

  it("returns undefined when staked amount is zero", () => {
    expect(getUserEstimatedApr({ ...baseParams, userStakedGmxAndEsGmx: 0n })).toBeUndefined();
  });
});
