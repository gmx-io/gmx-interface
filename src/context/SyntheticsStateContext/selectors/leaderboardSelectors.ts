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
export const selectLeaderboardSnapshotPositionBases = (s: SyntheticsTradeState) => s.leaderboard.snapshotPositions;
export const selectLeaderboardSnapshotPositionsError = (s: SyntheticsTradeState) => s.leaderboard.snapshotsError;

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
  const accounts = q(selectLeaderboardAccountBases);
  const positionBasesByAccount = q(selectPositionBasesByAccount);
  const marketsInfoData = q(selectMarketsInfoData);

  if (!accounts) return undefined;
  if (!positionBasesByAccount) return undefined;

  return accounts.map((base) => {
    const account: LeaderboardAccount = {
      ...base,
      totalCount: base.closedCount,
      totalRealizedPnl: base.totalPnl,
      totalPendingPnl: BigNumber.from(0),
      totalPendingCost: BigNumber.from(0),
      totalCost: base.totalPaidCost,
      pnlPercentage: BigNumber.from(0),
      averageSize: BigNumber.from(0),
      averageLeverage: BigNumber.from(0),
    };

    for (const p of positionBasesByAccount[base.account] || []) {
      const market = (marketsInfoData || {})[p.market];
      const pendingPnl = getPositionPnl(p, market);
      account.totalCount++;
      account.totalPnl = account.totalPnl.add(pendingPnl);
      account.sumMaxSize = account.sumMaxSize.add(p.maxSize);
      account.totalCost = account.totalCost.add(p.totalPendingCost);
      account.totalPendingCost = account.totalPendingCost.add(p.totalPendingCost);
      account.totalPendingPnl = account.totalPendingPnl.add(pendingPnl);
    }

    try {
      account.pnlPercentage = account.totalPnl.mul(BASIS_POINTS_DIVISOR).div(account.maxCollateral);
    } catch (err) {
      // pass
    }

    try {
      account.averageSize = base.sumMaxSize.div(account.totalCount);
    } catch (err) {
      // pass
    }

    try {
      account.averageLeverage = base.cumsumSize.mul(BASIS_POINTS_DIVISOR).div(base.cumsumCollateral);
    } catch (err) {
      // pass
    }

    return account;
  });
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
