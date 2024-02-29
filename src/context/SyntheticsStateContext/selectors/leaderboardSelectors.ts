import { BigNumber } from "ethers";
import { SyntheticsTradeState } from "../SyntheticsStateContextProvider";
import { createEnhancedSelector } from "../utils";
import { LeaderboardAccount, LeaderboardPositionBase } from "domain/synthetics/leaderboard";
import { selectMarketsInfoData } from "./globalSelectors";
import { MarketInfo } from "domain/synthetics/markets";
import { BASIS_POINTS_DIVISOR } from "config/factors";

export const selectLeaderboardAccountBases = (s: SyntheticsTradeState) => s.leaderboard.accounts;
export const selectLeaderboardAccountsError = (s: SyntheticsTradeState) => s.leaderboard.accountsError;
export const selectLeaderboardPositionBases = (s: SyntheticsTradeState) => s.leaderboard.positions;
export const selectLeaderboardPositionsError = (s: SyntheticsTradeState) => s.leaderboard.positionsError;

const selectPositionBasesByAccount = createEnhancedSelector((q) => {
  const positionBases = q(selectLeaderboardPositionBases);
  if (!positionBases) return undefined;
  return positionBases.reduce((acc, position) => {
    if (!acc[position.account]) {
      acc[position.account] = [];
    }
    acc[position.account].push(position);
    return acc;
  }, {} as Record<string, LeaderboardPositionBase[]>);
});

export const selectLeaderboardAccounts = createEnhancedSelector((q) => {
  const baseAccounts = q(selectLeaderboardAccountBases);
  const positionBasesByAccount = q(selectPositionBasesByAccount);
  const marketsInfoData = q(selectMarketsInfoData);

  if (!baseAccounts) return undefined;
  if (!positionBasesByAccount) return undefined;

  return baseAccounts.map((base) => {
    const account: LeaderboardAccount = {
      ...base,
      totalCount: base.closedCount,
      totalPnl: base.realizedPnl,
      totalPnlAfterFees: BigNumber.from(0),
      pendingPnl: BigNumber.from(0),
      pendingFees: BigNumber.from(0),
      totalFees: base.paidFees,
      pnlPercentage: BigNumber.from(0),
      averageSize: BigNumber.from(0),
      averageLeverage: BigNumber.from(0),
    };

    for (const p of positionBasesByAccount[base.account] || []) {
      const market = (marketsInfoData || {})[p.market];
      const pendingPnl = getPositionPnl(p, market);
      account.totalCount++;
      account.sumMaxSize = account.sumMaxSize.add(p.maxSize);
      account.pendingFees = account.pendingFees.add(p.pendingFees);
      account.pendingPnl = account.pendingPnl.add(pendingPnl).sub(p.pendingFees);
    }

    account.totalFees = account.totalFees.add(account.pendingFees).sub(account.startPendingFees);
    account.totalPnl = account.totalPnl.add(account.pendingPnl).sub(account.startPendingPnl);
    account.totalPnlAfterFees = account.totalPnl.sub(account.totalFees);

    if (account.maxCollateral.gt(0)) {
      account.pnlPercentage = account.totalPnlAfterFees.mul(BASIS_POINTS_DIVISOR).div(account.maxCollateral);
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

export const selectLeaderboardAccountsRanks = createEnhancedSelector((q) => {
  const accounts = q(selectLeaderboardAccounts);
  const ranks = { pnl: new Map<string, number>(), pnlPercentage: new Map<string, number>() };
  if (!accounts) return ranks;

  const accountsCopy = [...accounts];

  accountsCopy
    .sort((a, b) => (b.totalPnl.sub(a.totalPnl).gt(0) ? 1 : -1))
    .forEach((pnl, index) => {
      ranks.pnl.set(pnl.account, index + 1);
    });

  accountsCopy
    .sort((a, b) => (b.pnlPercentage.sub(a.pnlPercentage).gt(0) ? 1 : -1))
    .forEach((pnl, index) => {
      ranks.pnlPercentage.set(pnl.account, index + 1);
    });

  return ranks;
});

export const selectLeaderboardPositions = createEnhancedSelector((q) => {
  const positionBases = q(selectLeaderboardPositionBases);
  const marketsInfoData = q(selectMarketsInfoData);

  if (!positionBases) return undefined;

  return positionBases.map((position) => {
    const market = (marketsInfoData || {})[position.market];
    const pendingPnl = getPositionPnl(position, market);
    return {
      ...position,
      pendingPnl,
    };
  });
});

function getPositionPnl(position: LeaderboardPositionBase, market: MarketInfo) {
  if (position.isSnapshot) {
    return position.pendingPnl;
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
