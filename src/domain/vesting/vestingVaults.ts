import { bigMath } from "sdk/utils/bigmath";
import { roundUpDivision } from "sdk/utils/numbers/utils";

export type OldVestVault = "gmx" | "glp" | "affiliate";
export type VestVault = "orphan" | OldVestVault;

export const OLD_VEST_VAULTS: OldVestVault[] = ["gmx", "glp", "affiliate"];

export const RATIO_VESTER_PAIR_RATIO_DECIMALS = 30;
const RATIO_VESTER_PAIR_RATIO_PRECISION = 10n ** BigInt(RATIO_VESTER_PAIR_RATIO_DECIMALS);

export type OrphanVestingData = {
  eligibleAmount: bigint;
  usedAmount: bigint;
  depositedAmount: bigint;
  convertedAmount: bigint;
  reservedAmount: bigint;
  claimableAmount: bigint;
  pairRatioFactor: bigint;
  vestingDuration: bigint;
  vestingEndTime: bigint | undefined;
  deactivatedAt: bigint;
};

export type OrphanVaultData = OrphanVestingData & {
  isOpen: boolean;
  isDepositPaused: boolean;
  isClaimPaused: boolean;
  freePairAmount: bigint;
  unbackedPairAmount: bigint;
};

export type OrphanDepositError = "notOpen" | "closed" | "paused" | "enterAmount" | "maxExceeded" | "insufficientStaked";

// vestingInfo is the 12-value layout of RatioVesterReader.getVestingInfo for a single vester
export function parseOrphanVestingInfo({
  vestingInfo,
  trancheStartTimes,
}: {
  vestingInfo: readonly bigint[];
  trancheStartTimes: readonly bigint[];
}): OrphanVestingData {
  const [
    balance,
    pairAmount,
    claimable,
    cumulativeClaimAmount,
    claimedAmount,
    unpaidClaimAmount,
    totalConvertedAmount,
    vestingCap,
    ,
    vestingDuration,
    deactivatedAt,
    pairRatioFactor,
  ] = vestingInfo;

  const lastTrancheStartTime = trancheStartTimes.reduce((max, startTime) => (startTime > max ? startTime : max), 0n);

  return {
    eligibleAmount: vestingCap,
    usedAmount: balance + totalConvertedAmount,
    depositedAmount: balance + cumulativeClaimAmount,
    // claimable includes conversion that is not settled yet and unpaid GMX from withdrawn sessions,
    // so this is what the current session has converted so far
    convertedAmount: claimable + claimedAmount - unpaidClaimAmount,
    reservedAmount: pairAmount,
    claimableAmount: claimable,
    pairRatioFactor,
    vestingDuration,
    vestingEndTime: balance > 0n && lastTrancheStartTime > 0n ? lastTrancheStartTime + vestingDuration : undefined,
    deactivatedAt,
  };
}

// RewardRouterV3 first moves sbfGMX held above the stake back to the GMX vault, so only the rest can back a deposit,
// and it reverts every deposit while the wallet can't cover that excess
export function getWalletPairAmounts({
  walletPairAmount,
  stakedPairAmount,
  gmxVaultPairAmount,
  orphanPairAmount,
}: {
  walletPairAmount: bigint;
  stakedPairAmount: bigint;
  gmxVaultPairAmount: bigint;
  orphanPairAmount: bigint;
}): { freePairAmount: bigint; unbackedPairAmount: bigint } {
  const heldAmount = walletPairAmount + gmxVaultPairAmount + orphanPairAmount;
  const excessAmount = heldAmount > stakedPairAmount ? heldAmount - stakedPairAmount : 0n;

  if (walletPairAmount >= excessAmount) {
    return { freePairAmount: walletPairAmount - excessAmount, unbackedPairAmount: 0n };
  }

  return { freePairAmount: 0n, unbackedPairAmount: excessAmount - walletPairAmount };
}

export function getOrphanDepositState({
  data,
  walletEsGmxBalance,
  depositAmount,
  now,
}: {
  data: OrphanVaultData;
  walletEsGmxBalance: bigint;
  depositAmount: bigint | undefined;
  now: bigint;
}): {
  maxDepositAmount: bigint;
  additionalPairAmount: bigint;
  stakeShortfallAmount: bigint;
  error: OrphanDepositError | undefined;
} {
  const leftAmount = data.eligibleAmount > data.usedAmount ? data.eligibleAmount - data.usedAmount : 0n;
  const unvestedAmount = data.depositedAmount - data.convertedAmount;
  const availablePairAmount = data.reservedAmount + data.freePairAmount;

  // the vester locks ceil(unvested * ratio) of pair tokens, so this is the largest unvested balance they can back
  const maxBackedAmount =
    data.pairRatioFactor > 0n
      ? (availablePairAmount * RATIO_VESTER_PAIR_RATIO_PRECISION) / data.pairRatioFactor
      : walletEsGmxBalance + unvestedAmount;
  const maxByPairAmount =
    data.unbackedPairAmount === 0n && maxBackedAmount > unvestedAmount ? maxBackedAmount - unvestedAmount : 0n;
  const maxDepositAmount = bigMath.min(walletEsGmxBalance, leftAmount, maxByPairAmount);

  const requiredPairAmount = roundUpDivision(
    (unvestedAmount + (depositAmount ?? 0n)) * data.pairRatioFactor,
    RATIO_VESTER_PAIR_RATIO_PRECISION
  );
  const additionalPairAmount =
    depositAmount !== undefined && depositAmount > 0n && requiredPairAmount > data.reservedAmount
      ? requiredPairAmount - data.reservedAmount
      : 0n;
  const stakeShortfallAmount =
    data.unbackedPairAmount +
    (additionalPairAmount > data.freePairAmount ? additionalPairAmount - data.freePairAmount : 0n);

  let error: OrphanDepositError | undefined;

  if (!data.isOpen) {
    error = "notOpen";
  } else if (data.deactivatedAt !== 0n && now >= data.deactivatedAt) {
    error = "closed";
  } else if (data.isDepositPaused) {
    error = "paused";
  } else if (depositAmount === undefined || depositAmount === 0n) {
    error = "enterAmount";
  } else if (depositAmount > walletEsGmxBalance || depositAmount > leftAmount) {
    error = "maxExceeded";
  } else if (stakeShortfallAmount > 0n) {
    error = "insufficientStaked";
  }

  return { maxDepositAmount, additionalPairAmount, stakeShortfallAmount, error };
}

// an eligible amount alone is enough, so the Vest entry shows up before the first deposit
export function getHasOrphanVaultEntry(orphan: OrphanVestingData | undefined) {
  return (
    orphan !== undefined &&
    (orphan.eligibleAmount > 0n ||
      orphan.depositedAmount > 0n ||
      orphan.reservedAmount > 0n ||
      orphan.claimableAmount > 0n)
  );
}

export function getVisibleVestVaults({
  orphan,
  oldVaultVestedAmounts,
}: {
  orphan: OrphanVestingData | undefined;
  oldVaultVestedAmounts: Record<OldVestVault, bigint | undefined>;
}): VestVault[] {
  const vaults: VestVault[] = [];

  if (orphan !== undefined) {
    vaults.push("orphan");
  }

  // the old vaults take no deposits, so they only matter to accounts that still have a position there
  for (const vault of OLD_VEST_VAULTS) {
    const vestedAmount = oldVaultVestedAmounts[vault];

    if (vestedAmount !== undefined && vestedAmount > 0n) {
      vaults.push(vault);
    }
  }

  return vaults.length > 0 ? vaults : ["gmx"];
}
