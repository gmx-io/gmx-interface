import { LeaderboardAccount, LeaderboardPosition, LeaderboardPositionBase } from "domain/synthetics/leaderboard";
import { LEADERBOARD_PAGES } from "domain/synthetics/leaderboard/constants";
import { MarketInfo } from "domain/synthetics/markets";
import { SyntheticsTradeState } from "../SyntheticsStateContextProvider";
import { createEnhancedSelector } from "../utils";
import { selectAccount, selectMarketsInfoData, selectTokensData } from "./globalSelectors";

const BASIS_POINTS_DIVISOR = 10000n;

export const selectLeaderboardAccountBases = (s: SyntheticsTradeState) => s.leaderboard.accounts;

export const selectLeaderboardPositionBases = (s: SyntheticsTradeState) => s.leaderboard.positions;

export const selectLeaderboardTimeframeType = (s: SyntheticsTradeState) => s.leaderboard.leaderboardTimeframeType;

export const selectLeaderboardSetTimeframeType = (s: SyntheticsTradeState) => s.leaderboard.setLeaderboardTimeframeType;

export const selectLeaderboardDataType = (s: SyntheticsTradeState) => s.leaderboard.leaderboardDataType;

export const selectLeaderboardSetDataType = (s: SyntheticsTradeState) => s.leaderboard.setLeaderboardDataType;

export const selectLeaderboardTimeframe = (s: SyntheticsTradeState) => s.leaderboard.timeframe;

export const selectLeaderboardIsEndInFuture = (s: SyntheticsTradeState) => s.leaderboard.isEndInFuture;

export const selectLeaderboardIsStartInFuture = (s: SyntheticsTradeState) => s.leaderboard.isStartInFuture;

export const selectLeaderboardIsLoading = (s: SyntheticsTradeState) => s.leaderboard.isLoading;

export const selectLeaderboardIsCompetition = createEnhancedSelector(function selectLeaderboardIsCompetition(q) {
  const pageKey = q((s) => s.leaderboard.leaderboardPageKey);
  return LEADERBOARD_PAGES[pageKey].isCompetition;
});

export const selectLeaderboardIsCompetitionOver = createEnhancedSelector(function selectLeaderboardIsCompetitionOver(
  q
) {
  const isEndInFuture = q(selectLeaderboardIsEndInFuture);
  if (isEndInFuture) return false;

  const timeframe = q(selectLeaderboardTimeframe);

  if (timeframe.to === undefined) return false;

  return q(selectLeaderboardIsCompetition);
});

export const selectLeaderboardCurrentAccount = createEnhancedSelector(function selectLeaderboardCurrentAccount(
  q
): LeaderboardAccount | undefined {
  const accounts = q(selectLeaderboardAccounts);
  const currentAccount = q(selectAccount);
  const leaderboardAccount = accounts?.find((a) => a.account === currentAccount);
  if (leaderboardAccount) return leaderboardAccount;
  if (!currentAccount) return undefined;

  return {
    account: currentAccount,
    averageLeverage: 0n,
    averageSize: 0n,
    closedCount: 0,
    cumsumCollateral: 0n,
    cumsumSize: 0n,
    hasRank: false,
    losses: 0,
    maxCapital: 0n,
    netCapital: 0n,
    realizedFees: 0n,
    realizedPriceImpact: 0n,
    pnlPercentage: 0n,
    realizedPnl: 0n,
    startUnrealizedFees: 0n,
    startUnrealizedPnl: 0n,
    startUnrealizedPriceImpact: 0n,
    unrealizedFees: 0n,
    unrealizedPnl: 0n,
    sumMaxSize: 0n,
    totalCount: 0,
    totalFees: 0n,
    totalPnl: 0n,
    totalQualifyingPnl: 0n,
    volume: 0n,
    wins: 0,
  };
});

const selectPositionBasesByAccount = createEnhancedSelector(function selectPositionBasesByAccount(q) {
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

const selectLeaderboardAccounts = createEnhancedSelector(function selectLeaderboardAccounts(q) {
  const pageKey = q((s) => s.leaderboard.leaderboardPageKey);
  const leaderboardDataType = q(selectLeaderboardDataType);

  // top positions selected, no need to iterate accounts
  if (pageKey === "leaderboard" && leaderboardDataType === "positions") return undefined;

  const baseAccounts = q(selectLeaderboardAccountBases);
  const positionBasesByAccount = q(selectPositionBasesByAccount);
  const marketsInfoData = q(selectMarketsInfoData);

  if (!baseAccounts) return undefined;

  return baseAccounts.map((base) => {
    const account: LeaderboardAccount = {
      ...base,
      totalCount: base.closedCount,
      totalPnl: base.realizedPnl,
      totalQualifyingPnl: 0n,
      unrealizedPnl: 0n,
      unrealizedFees: 0n,
      totalFees: base.realizedFees,
      pnlPercentage: 0n,
      averageSize: 0n,
      averageLeverage: 0n,
    };

    for (const p of positionBasesByAccount[base.account] || []) {
      const market = (marketsInfoData || {})[p.market];
      const unrealizedPnl = getPositionPnl(p, market);
      account.totalCount++;
      account.sumMaxSize = account.sumMaxSize + p.maxSize;
      account.unrealizedFees = account.unrealizedFees + p.unrealizedFees;
      account.unrealizedPnl = account.unrealizedPnl + unrealizedPnl;
    }

    account.totalFees = account.totalFees + account.unrealizedFees - account.startUnrealizedFees;
    account.totalPnl = account.totalPnl + account.unrealizedPnl - account.startUnrealizedPnl;
    account.totalQualifyingPnl = account.totalPnl - account.totalFees + account.realizedPriceImpact;

    if (account.maxCapital > 0n) {
      account.pnlPercentage = (account.totalQualifyingPnl * BASIS_POINTS_DIVISOR) / account.maxCapital;
    }

    if (account.totalCount > 0) {
      account.averageSize = account.sumMaxSize / BigInt(account.totalCount);
    }

    if (base.cumsumCollateral > 0n) {
      account.averageLeverage = (base.cumsumSize * BASIS_POINTS_DIVISOR) / base.cumsumCollateral;
    }

    return account;
  });
});

export const selectLeaderboardRankedAccounts = createEnhancedSelector(function selectLeaderboardRankedAccounts(q) {
  const accounts = q(selectLeaderboardAccounts);
  if (!accounts) return undefined;
  return accounts.filter((a) => a.hasRank);
});

export const selectLeaderboardRankedAccountsByPnl = createEnhancedSelector(
  function selectLeaderboardRankedAccountsByPnl(q) {
    const accounts = q(selectLeaderboardRankedAccounts);
    if (!accounts) return undefined;
    return [...accounts].sort((a, b) => (b.totalQualifyingPnl - a.totalQualifyingPnl > 0n ? 1 : -1));
  }
);

export const selectLeaderboardRankedAccountsByPnlPercentage = createEnhancedSelector(
  function selectLeaderboardRankedAccountsByPnlPercentage(q) {
    const accounts = q(selectLeaderboardRankedAccounts);
    if (!accounts) return undefined;
    return [...accounts].sort((a, b) => (b.pnlPercentage - a.pnlPercentage > 0n ? 1 : -1));
  }
);

export const selectLeaderboardAccountsRanks = createEnhancedSelector(function selectLeaderboardAccountsRanks(q) {
  const accounts = q(selectLeaderboardRankedAccounts);
  const ranks = { pnl: new Map<string, number>(), pnlPercentage: new Map<string, number>() };
  if (!accounts) return ranks;

  const accountsCopy = [...accounts];

  accountsCopy
    .sort((a, b) => (b.totalQualifyingPnl - a.totalQualifyingPnl > 0n ? 1 : -1))
    .forEach((account, index) => {
      ranks.pnl.set(account.account, index + 1);
    });

  accountsCopy
    .sort((a, b) => (b.pnlPercentage - a.pnlPercentage > 0n ? 1 : -1))
    .forEach((account, index) => {
      ranks.pnlPercentage.set(account.account, index + 1);
    });

  return ranks;
});

export const selectLeaderboardPositions = createEnhancedSelector(function selectLeaderboardPositions(q) {
  const pageKey = q((s) => s.leaderboard.leaderboardPageKey);
  const leaderboardDataType = q(selectLeaderboardDataType);

  const shouldCalcPositions = pageKey === "leaderboard" && leaderboardDataType === "positions";

  if (!shouldCalcPositions) return undefined;

  const positionBases = q(selectLeaderboardPositionBases);

  if (!positionBases) return undefined;

  const positions = positionBases
    .map((position) => {
      const market = q((s) => selectMarketsInfoData(s)?.[position.market]);

      if (!market) return undefined;

      const unrealizedPnl = getPositionPnl(position, market);

      const pnl = position.realizedPnl + position.unrealizedPnl;
      const fees = position.realizedFees + position.unrealizedFees;
      const qualifyingPnl = pnl - fees + position.realizedPriceImpact;

      const collateralTokenPrice = q((s) =>
        selectTokensData(s)?.[position.collateralToken]?.prices.minPrice.toBigInt()
      );
      const collateralTokenDecimals = q((s) => selectTokensData(s)?.[position.collateralToken]?.decimals);

      if (!collateralTokenPrice || !collateralTokenDecimals) return undefined;

      const collateralUsd = (position.collateralAmount * collateralTokenPrice) / 10n ** BigInt(collateralTokenDecimals);

      const leverage = collateralUsd > 0n ? (position.sizeInUsd * BASIS_POINTS_DIVISOR) / collateralUsd : 0n;

      const p: LeaderboardPosition = {
        ...position,
        unrealizedPnl,
        rank: 1,
        qualifyingPnl,
        fees,
        pnl,
        leverage,
        collateralUsd,
        entryPrice: position.entryPrice * 10n ** BigInt(market.indexToken.decimals),
      };

      return p;
    })
    .filter((x: LeaderboardPosition | undefined): x is LeaderboardPosition => x !== undefined);

  positions.sort((a, b) => (b.qualifyingPnl - a.qualifyingPnl > 0n ? 1 : -1));

  positions.forEach((position, index) => {
    position.rank = index + 1;
  });

  return positions;
});

function getPositionPnl(position: LeaderboardPositionBase, market: MarketInfo) {
  if (position.isSnapshot) {
    return position.unrealizedPnl;
  }

  if (!market) {
    return 0n;
  }

  let pnl =
    (position.sizeInTokens * market.indexToken.prices.minPrice.toBigInt()) / 10n ** BigInt(market.indexToken.decimals) -
    position.sizeInUsd;

  if (!position.isLong) {
    pnl = pnl * -1n;
  }

  return pnl;
}
