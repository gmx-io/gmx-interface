export type OldVestVault = "gmx" | "glp" | "affiliate";
export type VestVault = "orphan" | OldVestVault;

export const OLD_VEST_VAULTS: OldVestVault[] = ["gmx", "glp", "affiliate"];

export const RATIO_VESTER_PAIR_RATIO_DECIMALS = 30;

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
};

export type OldVestVaultState = {
  isClosed: boolean | undefined;
  vestedAmount: bigint | undefined;
};

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
    ,
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
  };
}

// an eligible amount alone is enough, so the vault shows up before the first deposit
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
  oldVaults,
  isOrphanAlwaysVisible,
}: {
  orphan: OrphanVestingData | undefined;
  oldVaults: Record<OldVestVault, OldVestVaultState>;
  isOrphanAlwaysVisible: boolean;
}): VestVault[] {
  const vaults: VestVault[] = [];

  if (getHasOrphanVaultEntry(orphan) || (orphan !== undefined && isOrphanAlwaysVisible)) {
    vaults.push("orphan");
  }

  for (const vault of OLD_VEST_VAULTS) {
    const { isClosed, vestedAmount } = oldVaults[vault];
    const hasPosition = vestedAmount !== undefined && vestedAmount > 0n;
    // GLP vesting has no deposit flow here, so the GLP vault only matters to accounts with a position
    const acceptsDeposits = vault !== "glp" && isClosed !== true;

    if (hasPosition || acceptsDeposits) {
      vaults.push(vault);
    }
  }

  return vaults.length > 0 ? vaults : ["gmx"];
}
