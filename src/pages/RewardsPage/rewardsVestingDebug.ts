import { USD_DECIMALS } from "config/factors";
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

const IDLE_VESTING_DATA: RewardsVestingData = {
  walletGmxBalance: 80n * TOKEN_UNIT,
  walletEsGmxBalance: 40n * TOKEN_UNIT,
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
  walletEsGmxBalance: 40n * TOKEN_UNIT,
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

export function getRewardsVestingDebugSnapshot(
  mode: RewardsDebugMode | undefined
): RewardsVestingDebugSnapshot | undefined {
  switch (mode) {
    case "vesting-idle":
      return { data: IDLE_VESTING_DATA, isLoading: false };
    case "vesting-active":
      return { data: ACTIVE_VESTING_DATA, isLoading: false };
    case "vesting-complete":
      return { data: COMPLETE_VESTING_DATA, isLoading: false };
    case "vesting-error":
      return { isLoading: false, error: new Error("Rewards vesting debug error") };
    case "vesting-loading":
      return { isLoading: true };
    default:
      return undefined;
  }
}
