import { gql } from "@apollo/client";
import { BigNumber } from "ethers";
import { getLeaderboardGraphClient } from "lib/subgraph";
import useSWR from "swr";
import { MIN_COLLATERAL_USD_IN_LEADERBOARD } from "./constants";

export * from "./types";
export * from "./utils";

type LeaderboardAccountsJson = {
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

export type LeaderboardAccountBase = {
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

export type LeaderboardAccount = LeaderboardAccountBase & {
  totalCount: number;
  totalPnl: BigNumber;
  totalPnlAfterFees: BigNumber;
  totalFees: BigNumber;
  pendingFees: BigNumber;
  pendingPnl: BigNumber;
  pnlPercentage: BigNumber;
  averageSize: BigNumber;
  averageLeverage: BigNumber;
};

type LeaderboardPositionsJson = {
  positions: {
    account: string;
    collateralAmount: string;
    collateralToken: string;
    entryPrice: string;
    id: string;
    isLong: boolean;
    isSnapshot: boolean;
    market: string;
    maxSize: string;
    paidFees: string;
    paidPriceImpact: string;
    pendingFees: string;
    pendingPnl: string;
    pendingPriceImpact: string;
    realizedPnl: string;
    sizeInTokens: string;
    sizeInUsd: string;
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
  isSnapshot: boolean;
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
): Promise<LeaderboardAccountBase[] | undefined> => {
  const client = getLeaderboardGraphClient(chainId);
  if (!client) {
    // eslint-disable-next-line
    console.error("no client");
    return;
  }

  const response = await client.query<LeaderboardAccountsJson>({
    query: gql`
      query PeriodAccountStats($requiredMaxCollateral: String, $from: Int, $to: Int) {
        periodAccountStats(
          where: {
            maxCollateral_gte: $requiredMaxCollateral
            from: $from
            to: $to
            id_eq: "0x5d477f258912B634914D68f20FE5614856DCac94"
          }
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
      requiredMaxCollateral: p?.account ? undefined : MIN_COLLATERAL_USD_IN_LEADERBOARD.toString(),
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

export function useLeaderboardAccounts(
  enabled: boolean,
  chainId: number,
  p?: { account?: string; from?: number; to?: number }
) {
  const { data, error } = useSWR(
    enabled ? ["leaderboard/useLeaderboardAccounts", chainId, p?.account, p?.from, p?.to] : null,
    () => fetchAccounts(chainId, p),
    {
      refreshInterval: 60_000,
    }
  );

  return { data, error };
}

const fetchPositions = async (
  chainId: number,
  snapshotTimestamp: number | undefined
): Promise<LeaderboardPositionBase[] | undefined> => {
  const client = getLeaderboardGraphClient(chainId);
  if (!client) {
    // eslint-disable-next-line
    console.error("no endpoint");
    return;
  }

  const response = await client.query<LeaderboardPositionsJson>({
    query: gql`
      query PositionQuery($isSnapshot: Boolean, $snapshotTimestamp: Int) {
        positions(where: { isSnapshot_eq: $isSnapshot, snapshotTimestamp_eq: $snapshotTimestamp }) {
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
          isSnapshot
        }
      }
    `,
    variables: {
      isSnapshot: snapshotTimestamp !== undefined,
      snapshotTimestamp,
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
      isSnapshot: p.isSnapshot,
    };
  });
};

export function useLeaderboardPositions(enabled: boolean, chainId: number, snapshotTimestamp: number | undefined) {
  const { data, error } = useSWR(
    enabled ? ["leaderboard/useLeaderboardPositions", chainId, snapshotTimestamp] : null,
    () => fetchPositions(chainId, snapshotTimestamp),
    {
      refreshInterval: 60_000,
    }
  );

  return { data, error };
}
