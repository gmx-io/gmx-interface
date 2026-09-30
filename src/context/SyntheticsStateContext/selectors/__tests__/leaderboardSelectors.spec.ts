import { describe, expect, it } from "vitest";

import { LeaderboardAccount, LeaderboardPositionBase } from "domain/synthetics/leaderboard";
import { DeepPartial } from "lib/types";

import { SyntheticsState } from "../../SyntheticsStateContextProvider";
import {
  selectLeaderboardAccountsRanks,
  selectLeaderboardRankedAccounts,
  selectLeaderboardRankedAccountsByPnl,
  selectLeaderboardRankedAccountsByPnlPercentage,
} from "../leaderboardSelectors";

function createAccount(overrides: Partial<LeaderboardAccount> = {}): LeaderboardAccount {
  return {
    account: "0x0000000000000000000000000000000000000001",
    averageLeverage: 0n,
    averageSize: 0n,
    closedCount: 1,
    cumsumCollateral: 0n,
    cumsumSize: 0n,
    hasRank: true,
    losses: 0,
    maxCapital: 10_000n,
    netCapital: 0n,
    pnlPercentage: 0n,
    realizedFees: 1_000n,
    realizedPnl: 10_000n,
    realizedPriceImpact: -200n,
    realizedSwapFees: 500n,
    realizedSwapImpact: -300n,
    positiveFundingFeesUsd: 400n,
    startUnrealizedFees: 50n,
    startUnrealizedPnl: 200n,
    startUnrealizedPriceImpact: 0n,
    sumMaxSize: 0n,
    totalCount: 0,
    totalFees: 0n,
    totalPnl: 0n,
    totalQualifyingPnl: 0n,
    unrealizedFees: 0n,
    unrealizedPnl: 0n,
    volume: 0n,
    wins: 1,
    ...overrides,
  };
}

function createPosition(overrides: Partial<LeaderboardPositionBase> = {}): LeaderboardPositionBase {
  return {
    key: "position-key",
    account: "0x0000000000000000000000000000000000000001",
    collateralAmount: 0n,
    collateralToken: "0x0000000000000000000000000000000000000002",
    entryPrice: 0n,
    isLong: true,
    isSnapshot: false,
    market: "0x0000000000000000000000000000000000000003",
    maxSize: 0n,
    realizedFees: 0n,
    realizedPnl: 0n,
    realizedPriceImpact: 0n,
    sizeInTokens: 0n,
    sizeInUsd: 0n,
    snapshotTimestamp: 0,
    unrealizedFees: 0n,
    unrealizedPnl: 0n,
    unrealizedPriceImpact: 0n,
    ...overrides,
  };
}

function createState(accounts: LeaderboardAccount[], positions: LeaderboardPositionBase[] = []): SyntheticsState {
  const state: DeepPartial<SyntheticsState> = {
    leaderboard: {
      accounts,
      positions,
      leaderboardDataType: "accounts",
      leaderboardPageKey: "leaderboard",
    },
  };

  return state as SyntheticsState;
}

describe("leaderboardSelectors", () => {
  it("includes realized swap fees, swap impact, and positive funding in account PnL and PnL percentage", () => {
    const [account] = selectLeaderboardRankedAccounts(createState([createAccount()]))!;

    expect(account.totalQualifyingPnl).toBe(8_250n);
    expect(account.pnlPercentage).toBe(8_250n);
  });

  it("uses Squid position PnL for live positions to match Account Performance", () => {
    const longAccount = createAccount({
      account: "0x0000000000000000000000000000000000000001",
      realizedFees: 0n,
      realizedPnl: 0n,
      realizedPriceImpact: 0n,
      realizedSwapFees: 0n,
      realizedSwapImpact: 0n,
      positiveFundingFeesUsd: 0n,
      startUnrealizedFees: 0n,
      startUnrealizedPnl: 0n,
    });
    const shortAccount = createAccount({
      ...longAccount,
      account: "0x0000000000000000000000000000000000000002",
    });
    const positions = [
      createPosition({
        account: longAccount.account,
        isLong: true,
        unrealizedPnl: 123n,
      }),
      createPosition({
        key: "short-position-key",
        account: shortAccount.account,
        isLong: false,
        unrealizedPnl: -456n,
      }),
    ];

    const accounts = selectLeaderboardRankedAccounts(createState([longAccount, shortAccount], positions))!;

    expect(accounts.find((account) => account.account === longAccount.account)?.unrealizedPnl).toBe(123n);
    expect(accounts.find((account) => account.account === shortAccount.account)?.unrealizedPnl).toBe(-456n);
  });

  it("reproduces the reported account performance PnL", () => {
    const reportedAccount = createAccount({
      account: "0x8B262bD986f98Cf5F1e5dC13329Ab44e01364AD5",
      maxCapital: 971639106271148873083323948823830n,
      realizedPnl: 181616261023240050511226098557319059n,
      realizedFees: 76234346270514491573918899491895957n,
      realizedSwapFees: 563005008666748828343063631827190n,
      realizedPriceImpact: -19827344546320417876682895216332189n,
      realizedSwapImpact: -1771696578537105146428031407200800n,
      positiveFundingFeesUsd: 1057038746736718298403207028128434n,
      startUnrealizedFees: 0n,
      startUnrealizedPnl: 0n,
    });

    const [account] = selectLeaderboardRankedAccounts(createState([reportedAccount]))!;

    expect(account.totalQualifyingPnl).toBe(84276907365938005384256415838191357n);
    expect(account.pnlPercentage).toBe(867368n);
  });

  it("uses realized swap fees and negative swap impact for sorting and ranks", () => {
    const firstBeforeSwapAdjustments = createAccount({
      account: "0x0000000000000000000000000000000000000001",
      maxCapital: 1_000n,
      realizedFees: 0n,
      realizedPnl: 1_000n,
      realizedPriceImpact: 0n,
      realizedSwapFees: 300n,
      realizedSwapImpact: -300n,
      positiveFundingFeesUsd: 0n,
      startUnrealizedFees: 0n,
      startUnrealizedPnl: 0n,
    });
    const firstAfterSwapAdjustments = createAccount({
      account: "0x0000000000000000000000000000000000000002",
      maxCapital: 1_000n,
      realizedFees: 0n,
      realizedPnl: 500n,
      realizedPriceImpact: 0n,
      realizedSwapFees: 0n,
      realizedSwapImpact: 0n,
      positiveFundingFeesUsd: 0n,
      startUnrealizedFees: 0n,
      startUnrealizedPnl: 0n,
    });
    const state = createState([firstBeforeSwapAdjustments, firstAfterSwapAdjustments]);

    expect(selectLeaderboardRankedAccountsByPnl(state)?.map((account) => account.account)).toEqual([
      firstAfterSwapAdjustments.account,
      firstBeforeSwapAdjustments.account,
    ]);
    expect(selectLeaderboardRankedAccountsByPnlPercentage(state)?.map((account) => account.account)).toEqual([
      firstAfterSwapAdjustments.account,
      firstBeforeSwapAdjustments.account,
    ]);
    expect(selectLeaderboardAccountsRanks(state).pnl.get(firstAfterSwapAdjustments.account)).toBe(1);
    expect(selectLeaderboardAccountsRanks(state).pnlPercentage.get(firstAfterSwapAdjustments.account)).toBe(1);
  });

  it("uses positive swap impact and funding for PnL and percentage ranks", () => {
    const firstByPnl = createAccount({
      account: "0x0000000000000000000000000000000000000001",
      maxCapital: 1_000n,
      realizedFees: 0n,
      realizedPnl: 100n,
      realizedPriceImpact: 0n,
      realizedSwapFees: 0n,
      realizedSwapImpact: 200n,
      positiveFundingFeesUsd: 200n,
      startUnrealizedFees: 0n,
      startUnrealizedPnl: 0n,
    });
    const firstByPnlPercentage = createAccount({
      account: "0x0000000000000000000000000000000000000002",
      maxCapital: 100n,
      realizedFees: 0n,
      realizedPnl: 400n,
      realizedPriceImpact: 0n,
      realizedSwapFees: 0n,
      realizedSwapImpact: 0n,
      positiveFundingFeesUsd: 0n,
      startUnrealizedFees: 0n,
      startUnrealizedPnl: 0n,
    });
    const state = createState([firstByPnlPercentage, firstByPnl]);

    expect(selectLeaderboardRankedAccountsByPnl(state)?.map((account) => account.account)).toEqual([
      firstByPnl.account,
      firstByPnlPercentage.account,
    ]);
    expect(selectLeaderboardRankedAccountsByPnlPercentage(state)?.map((account) => account.account)).toEqual([
      firstByPnlPercentage.account,
      firstByPnl.account,
    ]);
    expect(selectLeaderboardAccountsRanks(state).pnl.get(firstByPnl.account)).toBe(1);
    expect(selectLeaderboardAccountsRanks(state).pnlPercentage.get(firstByPnlPercentage.account)).toBe(1);
  });

  it("uses consistent ranks when account PnL percentages are equal", () => {
    const higherPnl = createAccount({
      account: "0x0000000000000000000000000000000000000001",
      maxCapital: 200n,
      realizedFees: 0n,
      realizedPnl: 200n,
      realizedPriceImpact: 0n,
      realizedSwapFees: 0n,
      realizedSwapImpact: 0n,
      positiveFundingFeesUsd: 0n,
      startUnrealizedFees: 0n,
      startUnrealizedPnl: 0n,
    });
    const lowerPnl = createAccount({
      account: "0x0000000000000000000000000000000000000002",
      maxCapital: 100n,
      realizedFees: 0n,
      realizedPnl: 100n,
      realizedPriceImpact: 0n,
      realizedSwapFees: 0n,
      realizedSwapImpact: 0n,
      positiveFundingFeesUsd: 0n,
      startUnrealizedFees: 0n,
      startUnrealizedPnl: 0n,
    });
    const state = createState([lowerPnl, higherPnl]);

    expect(selectLeaderboardRankedAccountsByPnl(state)?.map((account) => account.account)).toEqual([
      higherPnl.account,
      lowerPnl.account,
    ]);
    expect(selectLeaderboardRankedAccountsByPnlPercentage(state)?.map((account) => account.account)).toEqual([
      lowerPnl.account,
      higherPnl.account,
    ]);
    expect(selectLeaderboardAccountsRanks(state).pnl.get(higherPnl.account)).toBe(1);
    expect(selectLeaderboardAccountsRanks(state).pnlPercentage.get(lowerPnl.account)).toBe(1);
    expect(selectLeaderboardAccountsRanks(state).pnlPercentage.get(higherPnl.account)).toBe(2);
  });
});
