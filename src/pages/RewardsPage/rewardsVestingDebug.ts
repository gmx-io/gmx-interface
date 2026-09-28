import { USD_DECIMALS } from "config/factors";
import {
  getRewardsVestingAvailableAmount,
  getRewardsVestingEffectiveRemainingAmount,
  getRewardsVestingPairAmounts,
} from "domain/vesting/rewardsVesting";
import type { RewardsVestingData } from "domain/vesting/useRewardsVestingData";
import { GMX_DECIMALS } from "lib/legacy";

import type { RewardsDebugMode } from "./rewardsDebug";

const TOKEN_UNIT = 10n ** BigInt(GMX_DECIMALS);
const USD_PRICE_UNIT = 10n ** BigInt(USD_DECIMALS);
const VESTING_DURATION = 365n * 24n * 60n * 60n;

const EMPTY_VESTING_INFO: RewardsVestingData["vestingInfo"] = {
  pairAmount: 0n,
  vestedAmount: 0n,
  escrowedBalance: 0n,
  claimedAmounts: 0n,
  claimable: 0n,
  maxVestableAmount: 0n,
  averageStakedAmount: 0n,
};

const ZERO_VESTING_DATA: RewardsVestingData = {
  walletGmxBalance: 0n,
  walletEsGmxBalance: 0n,
  claimableEsGmxRewards: 0n,
  stakedGmxBalance: 0n,
  freePairAmount: 0n,
  vestingInfo: EMPTY_VESTING_INFO,
  vestingDuration: VESTING_DURATION,
  gmxPrice: 45n * USD_PRICE_UNIT,
};

const IDLE_VESTING_DATA: RewardsVestingData = {
  walletGmxBalance: 80n * TOKEN_UNIT,
  walletEsGmxBalance: 0n,
  claimableEsGmxRewards: 40n * TOKEN_UNIT,
  stakedGmxBalance: 420n * TOKEN_UNIT,
  freePairAmount: 120n * TOKEN_UNIT,
  vestingInfo: {
    ...EMPTY_VESTING_INFO,
    maxVestableAmount: 400n * TOKEN_UNIT,
    averageStakedAmount: 400n * TOKEN_UNIT,
  },
  vestingDuration: VESTING_DURATION,
  gmxPrice: 45n * USD_PRICE_UNIT,
};

const ACTIVE_VESTING_DATA: RewardsVestingData = {
  walletGmxBalance: 25n * TOKEN_UNIT,
  walletEsGmxBalance: 0n,
  claimableEsGmxRewards: 40n * TOKEN_UNIT,
  stakedGmxBalance: 500n * TOKEN_UNIT,
  freePairAmount: 380n * TOKEN_UNIT,
  vestingInfo: {
    pairAmount: 120n * TOKEN_UNIT,
    vestedAmount: 500n * TOKEN_UNIT,
    escrowedBalance: 350n * TOKEN_UNIT,
    claimedAmounts: 100n * TOKEN_UNIT,
    claimable: 50n * TOKEN_UNIT,
    maxVestableAmount: 1_000n * TOKEN_UNIT,
    averageStakedAmount: 500n * TOKEN_UNIT,
  },
  vestingDuration: VESTING_DURATION,
  gmxPrice: 45n * USD_PRICE_UNIT,
};

const COMPLETE_VESTING_DATA: RewardsVestingData = {
  walletGmxBalance: 180n * TOKEN_UNIT,
  walletEsGmxBalance: 0n,
  claimableEsGmxRewards: 0n,
  stakedGmxBalance: 500n * TOKEN_UNIT,
  freePairAmount: 300n * TOKEN_UNIT,
  vestingInfo: {
    pairAmount: 200n * TOKEN_UNIT,
    vestedAmount: 500n * TOKEN_UNIT,
    escrowedBalance: 0n,
    claimedAmounts: 500n * TOKEN_UNIT,
    claimable: 0n,
    maxVestableAmount: 1_000n * TOKEN_UNIT,
    averageStakedAmount: 500n * TOKEN_UNIT,
  },
  vestingDuration: VESTING_DURATION,
  gmxPrice: 45n * USD_PRICE_UNIT,
};

export type RewardsVestingDebugSnapshot = {
  data?: RewardsVestingData;
  isLoading: boolean;
  error?: Error;
};

export type RewardsVestingDebugPreset = "zero" | "idle" | "active" | "complete";

function cloneRewardsVestingData(data: RewardsVestingData): RewardsVestingData {
  return {
    ...data,
    vestingInfo: {
      ...data.vestingInfo,
    },
  };
}

export function getRewardsVestingDebugPreset(preset: RewardsVestingDebugPreset): RewardsVestingData {
  const presetData = {
    zero: ZERO_VESTING_DATA,
    idle: IDLE_VESTING_DATA,
    active: ACTIVE_VESTING_DATA,
    complete: COMPLETE_VESTING_DATA,
  }[preset];

  return cloneRewardsVestingData(presetData);
}

export function getRewardsVestingDebugSnapshot(
  mode: RewardsDebugMode | undefined
): RewardsVestingDebugSnapshot | undefined {
  switch (mode) {
    case "vesting-idle":
      return { data: getRewardsVestingDebugPreset("idle"), isLoading: false };
    case "vesting-active":
      return { data: getRewardsVestingDebugPreset("active"), isLoading: false };
    case "vesting-complete":
      return { data: getRewardsVestingDebugPreset("complete"), isLoading: false };
    case "vesting-error":
      return { isLoading: false, error: new Error("Rewards vesting debug error") };
    case "vesting-loading":
      return { isLoading: true };
    default:
      return undefined;
  }
}

function clearVestingPosition(
  data: RewardsVestingData,
  balances: Pick<RewardsVestingData, "walletGmxBalance" | "walletEsGmxBalance" | "freePairAmount">
): RewardsVestingData {
  return {
    ...data,
    ...balances,
    vestingInfo: {
      ...data.vestingInfo,
      pairAmount: 0n,
      vestedAmount: 0n,
      escrowedBalance: 0n,
      claimedAmounts: 0n,
      claimable: 0n,
    },
  };
}

export function getRewardsVestingDebugCalculationData(data: RewardsVestingData): RewardsVestingData {
  if (data.vestingInfo.averageStakedAmount > 0n || data.vestingInfo.maxVestableAmount === 0n) {
    return data;
  }

  return {
    ...data,
    vestingInfo: {
      ...data.vestingInfo,
      averageStakedAmount: data.vestingInfo.maxVestableAmount,
    },
  };
}

export function simulateRewardsGmxStake(data: RewardsVestingData, stakeAmount: bigint): RewardsVestingData {
  if (stakeAmount <= 0n || stakeAmount > data.walletGmxBalance) {
    return data;
  }

  return {
    ...data,
    walletGmxBalance: data.walletGmxBalance - stakeAmount,
    stakedGmxBalance: data.stakedGmxBalance + stakeAmount,
    freePairAmount: data.freePairAmount + stakeAmount,
  };
}

export function simulateRewardsVestingDeposit(data: RewardsVestingData, depositAmount: bigint): RewardsVestingData {
  const calculationData = getRewardsVestingDebugCalculationData(data);
  const vestableAmount = getRewardsVestingAvailableAmount({
    walletEsGmxAmount: calculationData.walletEsGmxBalance,
    totalVestedAmount: calculationData.vestingInfo.vestedAmount,
    maxVestableAmount: calculationData.vestingInfo.maxVestableAmount,
  });

  if (depositAmount <= 0n || depositAmount > vestableAmount) {
    return data;
  }

  const effectiveRemainingAmount = getRewardsVestingEffectiveRemainingAmount({
    totalVestedAmount: calculationData.vestingInfo.vestedAmount,
    escrowedBalance: calculationData.vestingInfo.escrowedBalance,
    claimedAmount: calculationData.vestingInfo.claimedAmounts,
    claimableAmount: calculationData.vestingInfo.claimable,
  });
  const pairAmounts = getRewardsVestingPairAmounts({
    effectiveRemainingAmount,
    depositAmount,
    averageStakedAmount: calculationData.vestingInfo.averageStakedAmount,
    maxVestableAmount: calculationData.vestingInfo.maxVestableAmount,
    currentPairAmount: calculationData.vestingInfo.pairAmount,
    availablePairAmount: calculationData.freePairAmount,
  });

  if (pairAmounts.stakeShortfallAmount > 0n) {
    return data;
  }

  return {
    ...data,
    walletEsGmxBalance: data.walletEsGmxBalance - depositAmount,
    freePairAmount: data.freePairAmount - pairAmounts.additionalPairAmount,
    vestingInfo: {
      ...data.vestingInfo,
      pairAmount: data.vestingInfo.pairAmount + pairAmounts.additionalPairAmount,
      vestedAmount: data.vestingInfo.vestedAmount + depositAmount,
      escrowedBalance: data.vestingInfo.escrowedBalance + depositAmount,
    },
  };
}

export function simulateRewardsEsGmxClaim(data: RewardsVestingData): RewardsVestingData {
  if (data.claimableEsGmxRewards <= 0n) {
    return data;
  }

  return {
    ...data,
    walletEsGmxBalance: data.walletEsGmxBalance + data.claimableEsGmxRewards,
    claimableEsGmxRewards: 0n,
  };
}

export function simulateRewardsVestingClaim(data: RewardsVestingData): RewardsVestingData {
  const claimableAmount = data.vestingInfo.claimable;

  if (claimableAmount <= 0n) {
    return data;
  }

  return {
    ...data,
    walletGmxBalance: data.walletGmxBalance + claimableAmount,
    vestingInfo: {
      ...data.vestingInfo,
      claimedAmounts: data.vestingInfo.claimedAmounts + claimableAmount,
      claimable: 0n,
    },
  };
}

export function simulateRewardsVestingStop(data: RewardsVestingData): RewardsVestingData {
  const effectiveRemainingAmount = getRewardsVestingEffectiveRemainingAmount({
    totalVestedAmount: data.vestingInfo.vestedAmount,
    escrowedBalance: data.vestingInfo.escrowedBalance,
    claimedAmount: data.vestingInfo.claimedAmounts,
    claimableAmount: data.vestingInfo.claimable,
  });

  if (data.vestingInfo.vestedAmount <= 0n || effectiveRemainingAmount <= 0n) {
    return data;
  }

  return clearVestingPosition(data, {
    walletGmxBalance: data.walletGmxBalance + data.vestingInfo.claimable,
    walletEsGmxBalance: data.walletEsGmxBalance + effectiveRemainingAmount,
    freePairAmount: data.freePairAmount + data.vestingInfo.pairAmount,
  });
}

export function simulateRewardsVestingUnlock(data: RewardsVestingData): RewardsVestingData {
  const effectiveRemainingAmount = getRewardsVestingEffectiveRemainingAmount({
    totalVestedAmount: data.vestingInfo.vestedAmount,
    escrowedBalance: data.vestingInfo.escrowedBalance,
    claimedAmount: data.vestingInfo.claimedAmounts,
    claimableAmount: data.vestingInfo.claimable,
  });

  if (data.vestingInfo.vestedAmount <= 0n || effectiveRemainingAmount > 0n || data.vestingInfo.pairAmount <= 0n) {
    return data;
  }

  return clearVestingPosition(data, {
    walletGmxBalance: data.walletGmxBalance + data.vestingInfo.claimable,
    walletEsGmxBalance: data.walletEsGmxBalance,
    freePairAmount: data.freePairAmount + data.vestingInfo.pairAmount,
  });
}
