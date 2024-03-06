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

    maxCapital: string;
    netCapital: string;

    realizedPnl: string;
    realizedPriceImpact: string;
    realizedFees: string;

    startUnrealizedPnl: string;
    startUnrealizedPriceImpact: string;
    startUnrealizedFees: string;

    closedCount: number;
    volume: string;
    losses: number;
    wins: number;

    hasRank?: boolean;
  }[];
};

export type LeaderboardAccountBase = {
  account: string;
  cumsumCollateral: BigNumber;
  cumsumSize: BigNumber;
  sumMaxSize: BigNumber;

  maxCapital: BigNumber;
  netCapital: BigNumber;
  hasRank: boolean;

  realizedPriceImpact: BigNumber;
  realizedFees: BigNumber;
  realizedPnl: BigNumber;

  startUnrealizedPnl: BigNumber;
  startUnrealizedPriceImpact: BigNumber;
  startUnrealizedFees: BigNumber;

  closedCount: number;
  volume: BigNumber;
  losses: number;
  wins: number;
};

export type LeaderboardAccount = LeaderboardAccountBase & {
  totalCount: number;
  totalPnl: BigNumber;
  totalQualifyingPnl: BigNumber;
  totalFees: BigNumber;
  unrealizedFees: BigNumber;
  unrealizedPnl: BigNumber;
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
    realizedFees: string;
    realizedPriceImpact: string;
    unrealizedFees: string;
    unrealizedPnl: string;
    unrealizedPriceImpact: string;
    realizedPnl: string;
    sizeInTokens: string;
    sizeInUsd: string;
    snapshotTimestamp: number;
  }[];
};

export type LeaderboardPositionBase = {
  key: string;
  account: string;
  realizedFees: BigNumber;
  unrealizedFees: BigNumber;
  isLong: boolean;
  market: string;
  maxSize: BigNumber;
  realizedPriceImpact: BigNumber;
  unrealizedPriceImpact: BigNumber;
  isSnapshot: boolean;
  unrealizedPnl: BigNumber;
  realizedPnl: BigNumber;
  sizeInTokens: BigNumber;
  sizeInUsd: BigNumber;
  entryPrice: BigNumber;
  collateralToken: string;
  collateralAmount: BigNumber;
  snapshotTimestamp: number;
};

export type LeaderboardPosition = LeaderboardPositionBase & {
  unrealizedPnl: BigNumber;
};

const fetchAccounts = async (
  chainId: number,
  p: { account?: string; from?: number; to?: number }
): Promise<LeaderboardAccountBase[] | undefined> => {
  const client = getLeaderboardGraphClient(chainId);
  if (!client) {
    // eslint-disable-next-line
    console.error("no client");
    return;
  }

  const [allAccounts, currentAccount] = await Promise.all([
    client.query<LeaderboardAccountsJson>({
      query: gql`
        query PeriodAccountStats($requiredMaxCapital: String, $from: Int, $to: Int) {
          periodAccountStats(limit: 10000, where: { maxCapital_gte: $requiredMaxCapital, from: $from, to: $to }) {
            id
            closedCount
            cumsumCollateral
            cumsumSize
            losses
            maxCapital
            realizedPriceImpact
            sumMaxSize
            netCapital
            realizedFees
            realizedPnl
            volume
            wins
            startUnrealizedPnl
            startUnrealizedFees
            startUnrealizedPriceImpact
          }
        }
      `,
      variables: {
        requiredMaxCapital: MIN_COLLATERAL_USD_IN_LEADERBOARD.toString(),
        from: p?.from,
        to: p?.to,
      },
      fetchPolicy: "no-cache",
    }),
    client.query<LeaderboardAccountsJson>({
      query: gql`
        query PeriodAccountStats($account: String) {
          periodAccountStats(limit: 1, where: { id_eq: $account }) {
            id
            closedCount
            cumsumCollateral
            cumsumSize
            losses
            maxCapital
            realizedPriceImpact
            sumMaxSize
            netCapital
            realizedFees
            realizedPnl
            volume
            wins
            startUnrealizedPnl
            startUnrealizedFees
            startUnrealizedPriceImpact
          }
        }
      `,
      variables: {
        account: p.account,
      },
      fetchPolicy: "no-cache",
    }),
  ]);

  const allAccountsSet = new Set(allAccounts?.data.periodAccountStats.map((p) => p.id));

  if (p.account && !allAccountsSet.has(p.account) && currentAccount?.data.periodAccountStats.length) {
    allAccounts?.data.periodAccountStats.push({ ...currentAccount.data.periodAccountStats[0], hasRank: false });
  }

  return allAccounts?.data.periodAccountStats.map((p) => {
    return {
      account: p.id,
      cumsumCollateral: BigNumber.from(p.cumsumCollateral),
      cumsumSize: BigNumber.from(p.cumsumSize),
      sumMaxSize: BigNumber.from(p.sumMaxSize),
      maxCapital: BigNumber.from(p.maxCapital),
      netCapital: BigNumber.from(p.netCapital),

      realizedPnl: BigNumber.from(p.realizedPnl),
      realizedPriceImpact: BigNumber.from(p.realizedPriceImpact),
      realizedFees: BigNumber.from(p.realizedFees),

      startUnrealizedPnl: BigNumber.from(p.startUnrealizedPnl),
      startUnrealizedPriceImpact: BigNumber.from(p.startUnrealizedPriceImpact),
      startUnrealizedFees: BigNumber.from(p.startUnrealizedFees),

      volume: BigNumber.from(p.volume),
      closedCount: p.closedCount,
      losses: p.losses,
      wins: p.wins,

      hasRank: p.hasRank ?? true,
    };
  });
};

export function useLeaderboardData(
  enabled: boolean,
  chainId: number,
  p: {
    account: string | undefined;
    from: number;
    to: number | undefined;
    positionsSnapshotTimestamp: number | undefined;
  }
) {
  const { data, error } = useSWR(
    enabled
      ? ["leaderboard/useLeaderboardAccounts", chainId, p.account, p.from, p.to, p.positionsSnapshotTimestamp]
      : null,
    async () => {
      const [accounts, positions] = await Promise.all([
        fetchAccounts(chainId, p),
        fetchPositions(chainId, p.positionsSnapshotTimestamp),
      ]);

      return {
        accounts,
        positions,
      };
    },
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
      query PositionQuery($requiredMaxCapital: BigInt, $isSnapshot: Boolean, $snapshotTimestamp: Int) {
        positions(
          limit: 20000
          where: {
            isSnapshot_eq: $isSnapshot
            snapshotTimestamp_eq: $snapshotTimestamp
            accountStat: { maxCapital_gt: $requiredMaxCapital }
          }
        ) {
          id
          account
          market
          collateralToken
          isLong
          realizedFees
          unrealizedFees
          maxSize
          realizedPriceImpact
          unrealizedPriceImpact
          unrealizedPnl
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
      requiredMaxCapital: MIN_COLLATERAL_USD_IN_LEADERBOARD.toString(),
      snapshotTimestamp,
    },
    fetchPolicy: "no-cache",
  });

  return response?.data.positions.map((p) => {
    return {
      key: p.id,
      account: p.account,
      market: p.market,
      collateralToken: p.collateralToken,
      isLong: p.isLong,
      realizedPriceImpact: BigNumber.from(p.realizedPriceImpact),
      realizedFees: BigNumber.from(p.realizedFees),
      collateralAmount: BigNumber.from(p.collateralAmount),
      unrealizedFees: BigNumber.from(p.unrealizedFees),
      entryPrice: BigNumber.from(p.entryPrice),
      sizeInUsd: BigNumber.from(p.sizeInUsd),
      sizeInTokens: BigNumber.from(p.sizeInTokens),
      realizedPnl: BigNumber.from(p.realizedPnl),
      unrealizedPriceImpact: BigNumber.from(p.unrealizedPriceImpact),
      unrealizedPnl: BigNumber.from(p.unrealizedPnl),
      maxSize: BigNumber.from(p.maxSize),
      snapshotTimestamp: p.snapshotTimestamp,
      isSnapshot: p.isSnapshot,
    };
  });
};
