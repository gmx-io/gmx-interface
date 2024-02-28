import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { BigNumber } from "ethers";
import { useMemo } from "react";
import useSWR from "swr";
import { MarketInfo } from "../markets";
import { gql } from "@apollo/client";
import { getLeaderboardGraphClient } from "lib/subgraph";
import { expandDecimals } from "lib/numbers";

type LeaderboardPeriodAccountsJson = {
  periodAccountStats: {
    id: string;
    cumsumCollateral: string;
    cumsumSize: string;
    sumMaxSize: string;

    maxCollateral: string;
    netCollateral: string;

    realizedPnl: string;
    paidPriceImpact: string;
    paidFees: string;

    startPendingPnl: string;
    startPendingPriceImpact: string;
    startPendingFees: string;

    closedCount: number;
    volume: string;
    losses: number;
    wins: number;
  }[];
};

export type LeaderboardPeriodAccountStatBase = {
  account: string;
  cumsumCollateral: BigNumber;
  cumsumSize: BigNumber;
  sumMaxSize: BigNumber;

  maxCollateral: BigNumber;
  netCollateral: BigNumber;

  paidPriceImpact: BigNumber;
  paidFees: BigNumber;
  realizedPnl: BigNumber;

  startPendingPnl: BigNumber;
  startPendingPriceImpact: BigNumber;
  startPendingFees: BigNumber;

  closedCount: number;
  volume: BigNumber;
  losses: number;
  wins: number;
};

export type LeaderboardPeriodAccountStat = LeaderboardPeriodAccountStatBase & {
  totalCount: number;
  totalPnl: BigNumber;
  totalFees: BigNumber;
  pendingFees: BigNumber;
  pendingPnl: BigNumber;
};

type LeaderboardPositionsJson = {
  positions: {
    id: string;
    account: string;
    paidFees: string;
    pendingFees: string;
    isLong: boolean;
    market: string;
    maxSize: string;
    paidPriceImpact: string;
    pendingPriceImpact: string;
    pendingPnl: string;
    realizedPnl: string;
    sizeInTokens: string;
    sizeInUsd: string;
    entryPrice: string;
    collateralToken: string;
    collateralAmount: string;
    snapshotTimestamp: number;
  }[];
};

export type LeaderboardPositionBase = {
  key: string;
  account: string;
  paidFees: BigNumber;
  pendingFees: BigNumber;
  isLong: boolean;
  market: string;
  maxSize: BigNumber;
  paidPriceImpact: BigNumber;
  pendingPriceImpact: BigNumber;
  pendingPnl: BigNumber;
  realizedPnl: BigNumber;
  sizeInTokens: BigNumber;
  sizeInUsd: BigNumber;
  entryPrice: BigNumber;
  collateralToken: string;
  collateralAmount: BigNumber;
  snapshotTimestamp: number;
};

export type LeaderboardPosition = LeaderboardPositionBase & {
  pendingPnl: BigNumber;
};

const fetchAccounts = async (
  chainId: number,
  p?: { account?: string; from?: number; to?: number }
): Promise<LeaderboardPeriodAccountStatBase[] | undefined> => {
  const client = getLeaderboardGraphClient(chainId);
  if (!client) {
    // eslint-disable-next-line
    console.error("no client");
    return;
  }

  const response = await client.query<LeaderboardPeriodAccountsJson>({
    query: gql`
      query PeriodAccountStats($account: String, $requiredMaxCollateral: String, $from: Int, $to: Int) {
        periodAccountStats(
          limit: 100
          where: { id_eq: $account, maxCollateral_gte: $requiredMaxCollateral, from: $from, to: $to }
        ) {
          id
          closedCount
          cumsumCollateral
          cumsumSize
          losses
          maxCollateral
          paidPriceImpact
          sumMaxSize
          netCollateral
          paidFees
          realizedPnl
          volume
          wins
          startPendingPnl
          startPendingFees
          startPendingPriceImpact
        }
      }
    `,
    variables: {
      account: p?.account,
      requiredMaxCollateral: expandDecimals(500, 30).toString(),
      from: p?.from,
      to: p?.to,
    },
  });

  return response?.data.periodAccountStats.map((p) => {
    return {
      account: p.id,
      cumsumCollateral: BigNumber.from(p.cumsumCollateral),
      cumsumSize: BigNumber.from(p.cumsumSize),
      sumMaxSize: BigNumber.from(p.sumMaxSize),
      maxCollateral: BigNumber.from(p.maxCollateral),
      netCollateral: BigNumber.from(p.netCollateral),

      realizedPnl: BigNumber.from(p.realizedPnl),
      paidPriceImpact: BigNumber.from(p.paidPriceImpact),
      paidFees: BigNumber.from(p.paidFees),

      startPendingPnl: BigNumber.from(p.startPendingPnl),
      startPendingPriceImpact: BigNumber.from(p.startPendingPriceImpact),
      startPendingFees: BigNumber.from(p.startPendingFees),

      volume: BigNumber.from(p.volume),
      closedCount: p.closedCount,
      losses: p.losses,
      wins: p.wins,
    };
  });
};

export function useLeaderboardAccounts(chainId: number, p?: { account?: string; from?: number; to?: number }) {
  const { data, error } = useSWR(
    ["leaderboard/useLeaderboardAccounts", chainId, p?.account, p?.from, p?.to],
    () => fetchAccounts(chainId, p),
    {
      refreshInterval: 60_000,
    }
  );

  return { data, error };
}

const fetchPositions = async (
  chainId: number,
  account?: string,
  isSnapshot = false,
  snapshotTimestamp?: number,
  orderBy?: string | string[]
): Promise<LeaderboardPositionBase[] | undefined> => {
  const client = getLeaderboardGraphClient(chainId);
  if (!client) {
    // eslint-disable-next-line
    console.error("no endpoint");
    return;
  }

  const response = await client.query<LeaderboardPositionsJson>({
    query: gql`
      query PositionQuery(
        $account: String
        $isSnapshot: Boolean
        $snapshotTimestamp: Int
        $orderBy: [PositionOrderByInput!]
      ) {
        positions(
          limit: 100
          where: { account_eq: $account, isSnapshot_eq: $isSnapshot, snapshotTimestamp_eq: $snapshotTimestamp }
          orderBy: $orderBy
        ) {
          id
          account
          market
          collateralToken
          isLong
          paidFees
          pendingFees
          maxSize
          paidPriceImpact
          pendingPriceImpact
          pendingPnl
          realizedPnl
          sizeInTokens
          sizeInUsd
          entryPrice
          collateralAmount
          snapshotTimestamp
        }
      }
    `,
    variables: {
      account,
      isSnapshot,
      snapshotTimestamp,
      orderBy,
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
      paidFees: BigNumber.from(p.paidFees),
      collateralAmount: BigNumber.from(p.collateralAmount),
      pendingFees: BigNumber.from(p.pendingFees),
      entryPrice: BigNumber.from(p.entryPrice),
      sizeInUsd: BigNumber.from(p.sizeInUsd),
      sizeInTokens: BigNumber.from(p.sizeInTokens),
      realizedPnl: BigNumber.from(p.realizedPnl),
      pendingPriceImpact: BigNumber.from(p.pendingPriceImpact),
      pendingPnl: BigNumber.from(p.pendingPnl),
      maxSize: BigNumber.from(p.maxSize),
      snapshotTimestamp: p.snapshotTimestamp,
    };
  });
};

export function useLeaderboardPositions(
  chainId: number,
  account?: string,
  isSnapshot = false,
  orderBy?: string | string[]
) {
  const { data, error } = useSWR(
    ["leaderboard/useLeaderboardPositions", chainId, account, isSnapshot],
    () => fetchPositions(chainId, account, isSnapshot, undefined, orderBy),
    {
      refreshInterval: 60_000,
    }
  );

  return { data, error };
}

export function useLeaderboardData(
  chainId: number,
  p?: {
    account?: string;
    from?: number;
    to?: number;
  }
): {
  data: {
    accounts?: LeaderboardPeriodAccountStat[];
    positions?: LeaderboardPosition[];
  };
  error?: Error;
} {
  const { data: accounts, error: accountsError } = useLeaderboardAccounts(chainId, p);
  const { data: positions, error: positionsError } = useLeaderboardPositions(chainId, p?.account);
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
      const ret: LeaderboardPeriodAccountStat = {
        ...account,
        totalCount: account.closedCount,
        totalPnl: account.realizedPnl,
        pendingPnl: BigNumber.from(0),
        pendingFees: BigNumber.from(0),
        totalFees: account.paidFees,
      };

      for (const p of positionsByAccount[account.account] || []) {
        const market = (marketsInfoData || {})[p.market];

        const pendingPnl = getPositionPnl(p, market);
        ret.totalCount++;
        ret.realizedPnl = ret.realizedPnl.add(pendingPnl);
        ret.sumMaxSize = ret.sumMaxSize.add(p.maxSize);
        ret.totalFees = ret.totalFees.add(p.pendingFees);
        ret.pendingFees = ret.pendingFees.add(p.pendingFees);
        ret.pendingPnl = ret.pendingPnl.add(pendingPnl);
        ret.totalPnl = ret.totalPnl.add(pendingPnl);
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
