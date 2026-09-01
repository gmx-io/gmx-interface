import { describe, expect, it } from "vitest";

import {
  getRewardsVestingDebugPreset,
  simulateRewardsGmxStake,
  simulateRewardsEsGmxClaim,
  simulateRewardsVestingClaim,
  simulateRewardsVestingDeposit,
  simulateRewardsVestingStop,
  simulateRewardsVestingUnlock,
} from "../rewardsVestingDebug";

const TOKEN_UNIT = 10n ** 18n;

describe("rewardsVestingDebug", () => {
  it("provides a zero-state preset without sharing mutable vesting data", () => {
    const zeroData = getRewardsVestingDebugPreset("zero");

    expect(zeroData).toMatchObject({
      walletGmxBalance: 0n,
      walletEsGmxBalance: 0n,
      claimableEsGmxRewards: 0n,
      stakedGmxBalance: 0n,
      freePairAmount: 0n,
      vestingInfo: {
        pairAmount: 0n,
        vestedAmount: 0n,
        escrowedBalance: 0n,
        claimedAmounts: 0n,
        claimable: 0n,
        maxVestableAmount: 0n,
        averageStakedAmount: 0n,
      },
    });

    zeroData.vestingInfo.maxVestableAmount = TOKEN_UNIT;
    expect(getRewardsVestingDebugPreset("zero").vestingInfo.maxVestableAmount).toBe(0n);
  });

  it("simulates staking collateral before depositing when no GMX is staked", () => {
    const idleData = getRewardsVestingDebugPreset("idle");
    const claimedData = simulateRewardsEsGmxClaim(idleData);
    const unstakedData = {
      ...claimedData,
      stakedGmxBalance: 0n,
      freePairAmount: 0n,
      vestingInfo: {
        ...claimedData.vestingInfo,
        averageStakedAmount: 0n,
      },
    };
    const stakedData = simulateRewardsGmxStake(unstakedData, 40n * TOKEN_UNIT);
    const nextData = simulateRewardsVestingDeposit(stakedData, 40n * TOKEN_UNIT);

    expect(stakedData.walletGmxBalance).toBe(40n * TOKEN_UNIT);
    expect(stakedData.stakedGmxBalance).toBe(40n * TOKEN_UNIT);
    expect(stakedData.freePairAmount).toBe(40n * TOKEN_UNIT);
    expect(nextData.walletGmxBalance).toBe(40n * TOKEN_UNIT);
    expect(nextData.walletEsGmxBalance).toBe(0n);
    expect(nextData.stakedGmxBalance).toBe(40n * TOKEN_UNIT);
    expect(nextData.freePairAmount).toBe(0n);
    expect(nextData.vestingInfo.pairAmount).toBe(40n * TOKEN_UNIT);
    expect(nextData.vestingInfo.vestedAmount).toBe(40n * TOKEN_UNIT);
    expect(nextData.vestingInfo.escrowedBalance).toBe(40n * TOKEN_UNIT);
  });

  it("claims all pending esGMX rewards into the wallet before vesting", () => {
    const nextData = simulateRewardsEsGmxClaim(getRewardsVestingDebugPreset("idle"));

    expect(nextData.claimableEsGmxRewards).toBe(0n);
    expect(nextData.walletEsGmxBalance).toBe(40n * TOKEN_UNIT);
  });

  it("simulates claiming vested GMX", () => {
    const nextData = simulateRewardsVestingClaim(getRewardsVestingDebugPreset("active"));

    expect(nextData.walletGmxBalance).toBe(75n * TOKEN_UNIT);
    expect(nextData.vestingInfo.claimedAmounts).toBe(150n * TOKEN_UNIT);
    expect(nextData.vestingInfo.claimable).toBe(0n);
  });

  it("can deposit more esGMX after claiming an active vest", () => {
    const activeData = getRewardsVestingDebugPreset("active");
    const claimedVestedGmxData = simulateRewardsVestingClaim({
      ...activeData,
      claimableEsGmxRewards: 75n * TOKEN_UNIT,
    });
    const claimedEsGmxData = simulateRewardsEsGmxClaim(claimedVestedGmxData);
    const nextData = simulateRewardsVestingDeposit(claimedEsGmxData, 10n * TOKEN_UNIT);

    expect(nextData.walletEsGmxBalance).toBe(65n * TOKEN_UNIT);
    expect(nextData.vestingInfo.vestedAmount).toBe(510n * TOKEN_UNIT);
  });

  it("simulates stopping an active vest and returning unvested esGMX and collateral", () => {
    const nextData = simulateRewardsVestingStop(getRewardsVestingDebugPreset("active"));

    expect(nextData.walletGmxBalance).toBe(75n * TOKEN_UNIT);
    expect(nextData.walletEsGmxBalance).toBe(350n * TOKEN_UNIT);
    expect(nextData.freePairAmount).toBe(500n * TOKEN_UNIT);
    expect(nextData.vestingInfo).toMatchObject({
      pairAmount: 0n,
      vestedAmount: 0n,
      escrowedBalance: 0n,
      claimedAmounts: 0n,
      claimable: 0n,
    });
  });

  it("simulates unlocking collateral from a completed vest", () => {
    const nextData = simulateRewardsVestingUnlock(getRewardsVestingDebugPreset("complete"));

    expect(nextData.walletGmxBalance).toBe(180n * TOKEN_UNIT);
    expect(nextData.freePairAmount).toBe(500n * TOKEN_UNIT);
    expect(nextData.vestingInfo.pairAmount).toBe(0n);
    expect(nextData.vestingInfo.vestedAmount).toBe(0n);
  });
});
