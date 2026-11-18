import { describe, expect, it } from "vitest";

import {
  getOrphanClaimableGmx,
  getOrphanDepositState,
  getOrphanTransferState,
  getOrphanWalletShortfallActions,
  getVisibleVestVaults,
  getWalletPairAmounts,
  type OrphanVaultData,
  parseOrphanVestingInfo,
} from "./vestingVaults";

const UNIT = 10n ** 18n;
const YEAR = 365n * 86400n;
const RATIO_10 = 10n ** 31n;

const orphanWith = ({ cap = 0n }: { cap?: bigint }) =>
  parseOrphanVestingInfo({
    vestingInfo: [0n, 0n, 0n, 0n, 0n, 0n, 0n, cap, 0n, YEAR, 0n, RATIO_10],
    trancheStartTimes: [],
  });

const NO_POSITIONS = { gmx: 0n, glp: 0n, affiliate: 0n };

describe("parseOrphanVestingInfo", () => {
  it("splits the session into converted and deposited amounts and ends a year after the last tranche", () => {
    // balance 70 still includes 5 pending conversion; 30 settled, 10 claimed, 2 unpaid from a withdrawn session
    const data = parseOrphanVestingInfo({
      vestingInfo: [
        ...[70n, 700n, 27n, 30n, 10n, 2n, 50n, 200n].map((amount) => amount * UNIT),
        2n,
        YEAR,
        0n,
        RATIO_10,
      ],
      trancheStartTimes: [1_000n, 5_000n],
    });

    expect(data).toEqual({
      eligibleAmount: 200n * UNIT,
      usedAmount: 120n * UNIT,
      depositedAmount: 100n * UNIT,
      convertedAmount: 35n * UNIT,
      reservedAmount: 700n * UNIT,
      claimableAmount: 27n * UNIT,
      pairRatioFactor: RATIO_10,
      vestingDuration: YEAR,
      vestingEndTime: 5_000n + YEAR,
      deactivatedAt: 0n,
    });
  });
});

describe("getVisibleVestVaults", () => {
  it.each([
    { name: "before the vesting data loads", orphan: undefined, oldVaults: NO_POSITIONS, expected: ["gmx"] },
    {
      name: "Legacy vault without an eligible amount",
      orphan: orphanWith({}),
      oldVaults: NO_POSITIONS,
      expected: ["orphan"],
    },
    {
      name: "old vaults show only while they hold a position",
      orphan: orphanWith({ cap: 10n * UNIT }),
      oldVaults: { gmx: 5n * UNIT, glp: 2n * UNIT, affiliate: 0n },
      expected: ["orphan", "gmx", "glp"],
    },
    {
      name: "chain without the Legacy vault",
      orphan: undefined,
      oldVaults: { gmx: 0n, glp: undefined, affiliate: 3n * UNIT },
      expected: ["affiliate"],
    },
  ])("$name", ({ orphan, oldVaults, expected }) => {
    expect(getVisibleVestVaults({ orphan, oldVaultVestedAmounts: oldVaults })).toEqual(expected);
  });
});

describe("getWalletPairAmounts", () => {
  it.each([
    {
      name: "all wallet sbfGMX is backed by the stake",
      wallet: 6n,
      staked: 6n,
      gmxVault: 0n,
      orphan: 0n,
      free: 6n,
      unbacked: 0n,
    },
    {
      name: "the GMX vault reserve is synced back first",
      wallet: 10n,
      staked: 12n,
      gmxVault: 5n,
      orphan: 0n,
      free: 7n,
      unbacked: 0n,
    },
    {
      name: "the excess is larger than the wallet",
      wallet: 2n,
      staked: 1n,
      gmxVault: 4n,
      orphan: 0n,
      free: 0n,
      unbacked: 3n,
    },
  ])("$name", ({ wallet, staked, gmxVault, orphan, free, unbacked }) => {
    expect(
      getWalletPairAmounts({
        walletPairAmount: wallet * UNIT,
        stakedPairAmount: staked * UNIT,
        gmxVaultPairAmount: gmxVault * UNIT,
        orphanPairAmount: orphan * UNIT,
      })
    ).toEqual({ freePairAmount: free * UNIT, unbackedPairAmount: unbacked * UNIT });
  });
});

describe("getOrphanDepositState", () => {
  const openVault: OrphanVaultData = {
    ...orphanWith({ cap: UNIT }),
    isOpen: true,
    isDepositPaused: false,
    isClaimPaused: false,
    isFrozen: false,
    // 6.573 sbfGMX backs at most 0.6573 esGMX at 10:1
    freePairAmount: 6_573n * 10n ** 15n,
    unbackedPairAmount: 0n,
  };
  const unbackedVault: OrphanVaultData = { ...openVault, freePairAmount: 0n, unbackedPairAmount: 2n * UNIT };
  const NOW = 1_800_000_000n;

  it.each([
    {
      name: "not designated on the router",
      data: { ...openVault, isOpen: false },
      amount: UNIT / 2n,
      error: "notOpen",
    },
    { name: "deposits paused", data: { ...openVault, isDepositPaused: true }, amount: UNIT / 2n, error: "paused" },
    { name: "account frozen", data: { ...openVault, isFrozen: true }, amount: UNIT / 2n, error: "frozen" },
    {
      name: "past the deactivation time",
      data: { ...openVault, deactivatedAt: NOW },
      amount: UNIT / 2n,
      error: "closed",
    },
    { name: "no amount", data: openVault, amount: undefined, error: "enterAmount" },
    { name: "more than the eligible amount", data: openVault, amount: 2n * UNIT, error: "maxExceeded" },
    { name: "not enough staked tokens", data: openVault, amount: UNIT, error: "insufficientStaked", shortfall: 3_427n },
    { name: "within the staked tokens", data: openVault, amount: 6_573n * 10n ** 14n, error: undefined, shortfall: 0n },
    {
      name: "the GMX vault excess over the wallet adds to the stake shortfall",
      data: unbackedVault,
      amount: UNIT / 10n,
      error: "insufficientStaked",
      shortfall: 3_000n,
      max: 0n,
    },
    {
      // half of the session has vested, so the kept reserve already covers the new amount
      name: "the GMX vault excess over the wallet blocks a deposit the reserve covers",
      data: {
        ...unbackedVault,
        usedAmount: UNIT / 2n,
        depositedAmount: UNIT / 2n,
        convertedAmount: UNIT / 4n,
        reservedAmount: 5n * UNIT,
      },
      amount: UNIT / 10n,
      error: "insufficientStaked",
      shortfall: 2_000n,
      max: 0n,
    },
  ])("$name", ({ data, amount, error, shortfall, max = 6_573n * 10n ** 14n }) => {
    const state = getOrphanDepositState({ data, walletEsGmxBalance: UNIT, depositAmount: amount, now: NOW });

    expect(state.maxDepositAmount).toBe(max);
    expect(state.error).toBe(error);
    if (shortfall !== undefined) {
      expect(state.stakeShortfallAmount).toBe(shortfall * 10n ** 15n);
    }
  });

  it.each([
    {
      name: "wallet esGMX is the limit",
      vault: {},
      wallet: 0n,
      staked: 500n,
      pending: 0n,
      limited: true,
      unstake: 50n,
    },
    {
      name: "a pending request covers part",
      vault: {},
      wallet: 0n,
      staked: 500n,
      pending: 20n,
      limited: true,
      unstake: 30n,
    },
    { name: "up to the staked esGMX", vault: {}, wallet: 0n, staked: 10n, pending: 0n, limited: true, unstake: 10n },
    {
      // 0x099D…8216 on 2026-11-18, unstaking would drop its max deposit from 2,499 to 1,319
      name: "the reserve is the limit",
      vault: { eligibleAmount: 19_304n * UNIT, freePairAmount: 24_996n * UNIT },
      wallet: 7_501n,
      staked: 11_802n,
      pending: 0n,
      limited: false,
      unstake: 0n,
    },
    {
      // 0x8358…cEDF on 2026-11-18
      name: "a pending request past the balanced amount",
      vault: {
        eligibleAmount: 6_966n * UNIT,
        usedAmount: 420n * UNIT,
        depositedAmount: 420n * UNIT,
        convertedAmount: 2n * UNIT,
        reservedAmount: 4_200n * UNIT,
        freePairAmount: 2_291n * UNIT,
      },
      wallet: 0n,
      staked: 6_546n,
      pending: 2_000n,
      limited: true,
      unstake: 0n,
    },
  ])("wallet shortfall actions: $name ECO-1", ({ vault, wallet, staked, pending, limited, unstake }) => {
    const data = { ...openVault, eligibleAmount: 100n * UNIT, freePairAmount: 550n * UNIT, ...vault };
    const walletEsGmxBalance = wallet * UNIT;
    const { maxByPairAmount, walletShortfallAmount } = getOrphanDepositState({
      data,
      walletEsGmxBalance,
      depositAmount: undefined,
      now: NOW,
    });

    expect(
      getOrphanWalletShortfallActions({
        data,
        walletEsGmxBalance,
        maxByPairAmount,
        walletShortfallAmount,
        stakedEsGmxAmount: staked * UNIT,
        pendingUnstakeAmount: pending * UNIT,
      })
    ).toEqual({ isWalletLimited: limited, unstakeAmount: unstake * UNIT });
  });

  it.each([
    { name: "open", data: {}, claimable: UNIT },
    { name: "not designated", data: { isOpen: false }, claimable: 0n },
    { name: "claims paused", data: { isClaimPaused: true }, claimable: 0n },
    { name: "account frozen", data: { isFrozen: true }, claimable: 0n },
  ])("router-claimable GMX: $name", ({ data, claimable }) => {
    expect(getOrphanClaimableGmx({ ...openVault, claimableAmount: UNIT, ...data })).toBe(claimable);
  });
});

describe("getOrphanTransferState", () => {
  const OPEN = {
    designatedVestersLength: 1n,
    isOrphanDesignated: true,
    isTransferDisabled: false,
    isProvisioningComplete: true,
    hasSenderOpenSession: false,
    isSenderFrozen: false,
    isReceiverFresh: true,
    isReceiverFrozen: false,
  };
  const CLEAR = {
    isTransferPaused: false,
    hasSenderOpenSession: false,
    isSenderFrozen: false,
    isReceiverFresh: true,
    isReceiverFrozen: false,
  };

  it.each([
    { name: "open", reads: {}, expected: CLEAR },
    {
      name: "no designated vesters",
      reads: { designatedVestersLength: 0n, isOrphanDesignated: false },
      expected: { ...CLEAR, isTransferPaused: true },
    },
    {
      name: "Legacy vault transfers disabled",
      reads: { isTransferDisabled: true },
      expected: { ...CLEAR, isTransferPaused: true },
    },
    {
      name: "Legacy vault not provisioned",
      reads: { isProvisioningComplete: false },
      expected: { ...CLEAR, isTransferPaused: true },
    },
    {
      name: "Legacy vault blocks the sender and the receiver",
      reads: { hasSenderOpenSession: true, isSenderFrozen: true, isReceiverFresh: false, isReceiverFrozen: true },
      expected: {
        isTransferPaused: false,
        hasSenderOpenSession: true,
        isSenderFrozen: true,
        isReceiverFresh: false,
        isReceiverFrozen: true,
      },
    },
    {
      name: "the router doesn't check an undesignated Legacy vault",
      reads: {
        isOrphanDesignated: false,
        isTransferDisabled: true,
        hasSenderOpenSession: true,
        isSenderFrozen: true,
        isReceiverFresh: false,
        isReceiverFrozen: true,
      },
      expected: CLEAR,
    },
  ])("$name", ({ reads, expected }) => {
    expect(getOrphanTransferState({ ...OPEN, ...reads })).toMatchObject(expected);
  });
});
