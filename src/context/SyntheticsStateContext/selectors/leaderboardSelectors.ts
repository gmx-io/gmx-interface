import { BigNumber } from "ethers";
import { SyntheticsTradeState } from "../SyntheticsStateContextProvider";
import { createEnhancedSelector } from "../utils";
import { LeaderboardAccount, LeaderboardPositionBase } from "domain/synthetics/leaderboard";
import { selectAccount, selectMarketsInfoData } from "./globalSelectors";
import { MarketInfo } from "domain/synthetics/markets";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { mustNeverExist } from "lib/types";

export const selectLeaderboardAccountBases = (s: SyntheticsTradeState) => s.leaderboard.accounts;
export const selectLeaderboardPositionBases = (s: SyntheticsTradeState) => s.leaderboard.positions;

export const selectLeaderboardType = (s: SyntheticsTradeState) => s.leaderboard.leaderboardType;
export const selectLeaderboardSetType = (s: SyntheticsTradeState) => s.leaderboard.setLeaderboardType;

export const selectLeaderboardTimeframe = (s: SyntheticsTradeState) => s.leaderboard.timeframe;
export const selectLeaderboardIsEndInFuture = (s: SyntheticsTradeState) => s.leaderboard.isEndInFuture;
export const selectLeaderboardIsStartInFuture = (s: SyntheticsTradeState) => s.leaderboard.isStartInFuture;

export const selectLeaderboardIsCompetition = createEnhancedSelector((q) => {
  const pageKey = q((s) => s.leaderboard.leaderboardPageKey);

  switch (pageKey) {
    case "leaderboard":
      return false;

    case "march24":
    case "test1":
    case "test2":
      return true;

    default:
      throw mustNeverExist(pageKey);
  }
});

export const selectLeaderboardCurrentAccount = createEnhancedSelector((q): LeaderboardAccount | undefined => {
  const accounts = q(selectLeaderboardAccounts);
  const currentAccount = q(selectAccount);
  const leaderboardAccount = accounts?.find((a) => a.account === currentAccount);
  if (leaderboardAccount) return leaderboardAccount;
  if (!currentAccount) return undefined;

  return {
    account: currentAccount,
    averageLeverage: BigNumber.from(0),
    averageSize: BigNumber.from(0),
    closedCount: 0,
    cumsumCollateral: BigNumber.from(0),
    cumsumSize: BigNumber.from(0),
    hasRank: false,
    losses: 0,
    maxCapital: BigNumber.from(0),
    netCapital: BigNumber.from(0),
    realizedFees: BigNumber.from(0),
    realizedPriceImpact: BigNumber.from(0),
    pnlPercentage: BigNumber.from(0),
    realizedPnl: BigNumber.from(0),
    startUnrealizedFees: BigNumber.from(0),
    startUnrealizedPnl: BigNumber.from(0),
    startUnrealizedPriceImpact: BigNumber.from(0),
    unrealizedFees: BigNumber.from(0),
    unrealizedPnl: BigNumber.from(0),
    sumMaxSize: BigNumber.from(0),
    totalCount: 0,
    totalFees: BigNumber.from(0),
    totalPnl: BigNumber.from(0),
    totalQualifyingPnl: BigNumber.from(0),
    volume: BigNumber.from(0),
    wins: 0,
  };
});

const selectPositionBasesByAccount = createEnhancedSelector((q) => {
  const positionBases = q(selectLeaderboardPositionBases);

  if (!positionBases) return {};

  return positionBases.reduce((acc, position) => {
    if (!acc[position.account]) {
      acc[position.account] = [];
    }
    acc[position.account].push(position);
    return acc;
  }, {} as Record<string, LeaderboardPositionBase[]>);
});

const selectLeaderboardAccounts = createEnhancedSelector((q) => {
  const baseAccounts = q(selectLeaderboardAccountBases);
  const positionBasesByAccount = q(selectPositionBasesByAccount);
  const marketsInfoData = q(selectMarketsInfoData);

  if (!baseAccounts) return undefined;

  return baseAccounts.map((base) => {
    const account: LeaderboardAccount = {
      ...base,
      totalCount: base.closedCount,
      totalPnl: base.realizedPnl,
      totalQualifyingPnl: BigNumber.from(0),
      unrealizedPnl: BigNumber.from(0),
      unrealizedFees: BigNumber.from(0),
      totalFees: base.realizedFees,
      pnlPercentage: BigNumber.from(0),
      averageSize: BigNumber.from(0),
      averageLeverage: BigNumber.from(0),
    };

    for (const p of positionBasesByAccount[base.account] || []) {
      const market = (marketsInfoData || {})[p.market];
      const unrealizedPnl = getPositionPnl(p, market);
      account.totalCount++;
      account.sumMaxSize = account.sumMaxSize.add(p.maxSize);
      account.unrealizedFees = account.unrealizedFees.add(p.unrealizedFees);
      account.unrealizedPnl = account.unrealizedPnl.add(unrealizedPnl);
    }

    account.totalFees = account.totalFees.add(account.unrealizedFees).sub(account.startUnrealizedFees);
    account.totalPnl = account.totalPnl.add(account.unrealizedPnl).sub(account.startUnrealizedPnl);
    account.totalQualifyingPnl = account.totalPnl.sub(account.totalFees).add(account.realizedPriceImpact);

    if (account.maxCapital.gt(0)) {
      account.pnlPercentage = account.totalQualifyingPnl.mul(BASIS_POINTS_DIVISOR).div(account.maxCapital);
    }

    if (account.totalCount > 0) {
      account.averageSize = account.sumMaxSize.div(account.totalCount);
    }

    if (base.cumsumCollateral.gt(0)) {
      account.averageLeverage = base.cumsumSize.mul(BASIS_POINTS_DIVISOR).div(base.cumsumCollateral);
    }

    return account;
  });
});

export const selectLeaderboardRankedAccounts = createEnhancedSelector((q) => {
  const accounts = q(selectLeaderboardAccounts);
  if (!accounts) return undefined;
  return accounts.filter((a) => a.hasRank);
});

export const selectLeaderboardAccountsRanks = createEnhancedSelector((q) => {
  const accounts = q(selectLeaderboardRankedAccounts);
  const ranks = { pnl: new Map<string, number>(), pnlPercentage: new Map<string, number>() };
  if (!accounts) return ranks;

  const accountsCopy = [...accounts];

  accountsCopy
    .sort((a, b) => (b.totalQualifyingPnl.sub(a.totalQualifyingPnl).gt(0) ? 1 : -1))
    .forEach((account, index) => {
      ranks.pnl.set(account.account, index + 1);
    });

  accountsCopy
    .sort((a, b) => (b.pnlPercentage.sub(a.pnlPercentage).gt(0) ? 1 : -1))
    .forEach((account, index) => {
      ranks.pnlPercentage.set(account.account, index + 1);
    });

  return ranks;
});

export const selectLeaderboardPositions = createEnhancedSelector((q) => {
  const positionBases = q(selectLeaderboardPositionBases);
  const marketsInfoData = q(selectMarketsInfoData);

  if (!positionBases) return undefined;

  return positionBases.map((position) => {
    const market = (marketsInfoData || {})[position.market];
    const unrealizedPnl = getPositionPnl(position, market);
    return {
      ...position,
      unrealizedPnl,
    };
  });
});

function getPositionPnl(position: LeaderboardPositionBase, market: MarketInfo) {
  if (position.isSnapshot) {
    return position.unrealizedPnl;
  }

  if (!market) {
    return BigNumber.from(0);
  }

  let pnl = BigNumber.from(position.sizeInTokens)
    .mul(market.indexToken.prices.minPrice.div(BigNumber.from(10).pow(market.indexToken.decimals)))
    .sub(position.sizeInUsd);
  if (!position.isLong) {
    pnl = pnl.mul(-1);
  }
  return pnl;
}
