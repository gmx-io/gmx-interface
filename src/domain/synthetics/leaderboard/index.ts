import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { BigNumber } from "ethers";
import { useMemo } from "react";
import useSWR from "swr";
import { MarketInfo } from "../markets";
import { gql } from "@apollo/client";
import { getLeaderboardGraphClient } from "lib/subgraph";
import { expandDecimals } from "lib/numbers";

type LeaderboardAccountsJson = {
  accountPerves: {
    id: string;
    closedCount: number;
    cumsumCollateral: string;
    cumsumSize: string;
    losses: number;
    maxCollateral: string;
    paidPriceImpact: string;
    sumMaxSize: string;
    totalCollateral: string;
    totalPaidCost: string;
    totalPnl: string;
    volume: string;
    wins: number;
  }[];
};

export type LeaderboardAccountBase = {
  account: string;
  closedCount: number;
  cumsumCollateral: BigNumber;
  cumsumSize: BigNumber;
  losses: number;
  maxCollateral: BigNumber;
  paidPriceImpact: BigNumber;
  sumMaxSize: BigNumber;
  totalCollateral: BigNumber;
  totalPaidCost: BigNumber;
  totalPnl: BigNumber;
  volume: BigNumber;
  wins: number;
};

export type LeaderboardAccount = LeaderboardAccountBase & {
  totalCount: number;
  totalRealizedPnl: BigNumber;
  totalCost: BigNumber;
  totalPendingCost: BigNumber;
  totalPendingPnl: BigNumber;
};

type LeaderboardPositionsJson = {
  positions: {
    id: string;
    account: string;
    totalPaidCost: string;
    totalPendingCost: string;
    isLong: boolean;
    market: string;
    maxSize: string;
    paidPriceImpact: string;
    pendingPriceImpact: string;
    realizedPnl: string;
    sizeInTokens: string;
    sizeInUsd: string;
    entryPrice: string;
    collateralToken: string;
    collateralAmount: string;
  }[];
};

export type LeaderboardPositionBase = {
  key: string;
  account: string;
  totalPaidCost: BigNumber;
  totalPendingCost: BigNumber;
  isLong: boolean;
  market: string;
  maxSize: BigNumber;
  paidPriceImpact: BigNumber;
  pendingPriceImpact: BigNumber;
  realizedPnl: BigNumber;
  sizeInTokens: BigNumber;
  sizeInUsd: BigNumber;
  entryPrice: BigNumber;
  collateralToken: string;
  collateralAmount: BigNumber;
};

export type LeaderboardPosition = LeaderboardPositionBase & {
  pendingPnl: BigNumber;
};

const fetchAccounts = async (chainId: number, account?: string): Promise<LeaderboardAccountBase[] | undefined> => {
  const client = getLeaderboardGraphClient(chainId);
  if (!client) {
    // eslint-disable-next-line
    console.error("no client");
    return;
  }

  const response = await client.query<LeaderboardAccountsJson>({
    query: gql`
      query AccountPerfQuery($account: String, $requiredMaxCollateral: BigInt) {
        accountPerves(
          limit: 100
          orderBy: totalPnl_DESC
          where: { id_eq: $account, maxCollateral_gt: $requiredMaxCollateral }
        ) {
          id
          closedCount
          cumsumCollateral
          cumsumSize
          losses
          maxCollateral
          paidPriceImpact
          sumMaxSize
          totalCollateral
          totalPaidCost
          totalPnl
          volume
          wins
        }
      }
    `,
    variables: {
      account,
      requiredMaxCollateral: expandDecimals(100, 30).toString(),
    },
  });

  return response?.data.accountPerves.map((p) => {
    return {
      account: p.id,
      closedCount: p.closedCount,
      cumsumCollateral: BigNumber.from(p.cumsumCollateral),
      cumsumSize: BigNumber.from(p.cumsumSize),
      maxCollateral: BigNumber.from(p.maxCollateral),
      paidPriceImpact: BigNumber.from(p.paidPriceImpact),
      totalCollateral: BigNumber.from(p.totalCollateral),
      totalPaidCost: BigNumber.from(p.totalPaidCost),
      totalPnl: BigNumber.from(p.totalPnl),
      volume: BigNumber.from(p.volume),
      sumMaxSize: BigNumber.from(p.sumMaxSize),
      losses: p.losses,
      wins: p.wins,
    };
  });
};

export function useLeaderboardAccounts(chainId: number, account?: string) {
  const { data, error } = useSWR("leaderboard/useLeaderboardAccounts", () => fetchAccounts(chainId, account), {
    refreshInterval: 60_000,
  });

  return { data, error };
}

const fetchPositions = async (chainId: number, account?: string): Promise<LeaderboardPositionBase[] | undefined> => {
  const client = getLeaderboardGraphClient(chainId);
  if (!client) {
    // eslint-disable-next-line
    console.error("no endpoint");
    return;
  }

  const response = await client.query<LeaderboardPositionsJson>({
    query: gql`
      query PositionQuery($account: String) {
        positions(limit: 100, where: { account_eq: $account }) {
          id
          account
          market
          collateralToken
          isLong
          totalPaidCost
          totalPendingCost
          maxSize
          paidPriceImpact
          pendingPriceImpact
          realizedPnl
          sizeInTokens
          sizeInUsd
          entryPrice
          collateralAmount
        }
      }
    `,
    variables: {
      account,
    },
  });

  return response?.data.positions.map((p) => {
    return {
      key: p.id,
      account: p.account,
      market: p.market,
      collateralToken: p.collateralToken,
      isLong: p.isLong,
      paidPriceImpact: BigNumber.from(p.paidPriceImpact),
      totalPaidCost: BigNumber.from(p.totalPaidCost),
      collateralAmount: BigNumber.from(p.collateralAmount),
      totalPendingCost: BigNumber.from(p.totalPendingCost),
      entryPrice: BigNumber.from(p.entryPrice),
      sizeInUsd: BigNumber.from(p.sizeInUsd),
      sizeInTokens: BigNumber.from(p.sizeInTokens),
      realizedPnl: BigNumber.from(p.realizedPnl),
      pendingPriceImpact: BigNumber.from(p.pendingPriceImpact),
      maxSize: BigNumber.from(p.maxSize),
    };
  });
};

export function useLeaderboardPositions(chainId: number, account?: string) {
  const { data, error } = useSWR("leaderboard/useLeaderboardPositions", () => fetchPositions(chainId, account), {
    refreshInterval: 60_000,
  });

  return { data, error };
}

export function useLeaderboardData(
  chainId: number,
  account?: string
): {
  data: {
    accounts?: LeaderboardAccount[];
    positions?: LeaderboardPosition[];
  };
  error?: Error;
} {
  const { data: accounts, error: accountsError } = useLeaderboardAccounts(chainId, account);
  const { data: positions, error: positionsError } = useLeaderboardPositions(chainId, account);
  const marketsInfoData = useMarketsInfoData();

  const data = useMemo(() => {
    if (!accounts || !positions || !marketsInfoData) {
      return {};
    }

    const positionsByAccount = positions.reduce((memo: Record<string, LeaderboardPositionBase[]>, p) => {
      memo[p.account] = memo[p.account] || [];
      memo[p.account].push(p);
      return memo;
    }, {});

    const _accounts = accounts.map((account) => {
      const ret: LeaderboardAccount = {
        ...account,
        totalCount: account.closedCount,
        totalRealizedPnl: account.totalPnl,
        totalPendingPnl: BigNumber.from(0),
        totalPendingCost: BigNumber.from(0),
        totalCost: account.totalPaidCost,
      };

      for (const p of positionsByAccount[account.account] || []) {
        const market = (marketsInfoData || {})[p.market];

        const pendingPnl = getPositionPnl(p, market);
        ret.totalCount++;
        ret.totalPnl = ret.totalPnl.add(pendingPnl);
        ret.sumMaxSize = ret.sumMaxSize.add(p.maxSize);
        ret.totalCost = ret.totalCost.add(p.totalPendingCost);
        ret.totalPendingCost = ret.totalPendingCost.add(p.totalPendingCost);
        ret.totalPendingPnl = ret.totalPendingPnl.add(pendingPnl);
      }

      return ret;
    });

    const _positions = positions.map((position) => {
      const market = (marketsInfoData || {})[position.market];
      const pendingPnl = getPositionPnl(position, market);
      return {
        ...position,
        pendingPnl,
      };
    });

    return {
      accounts: _accounts,
      positions: _positions,
    };
  }, [accounts, positions, marketsInfoData]);

  return { data, error: accountsError || positionsError };
}

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
