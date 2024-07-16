import { gql } from "@apollo/client";
import { getSubsquidGraphClient } from "lib/subgraph";
import useSWR from "swr";
import { MIN_COLLATERAL_USD_IN_LEADERBOARD } from "./constants";
import { expandDecimals } from "lib/numbers";
import { LeaderboardDataType } from "./types";

export * from "./types";

type LeaderboardAccountsJson = {
  all: {
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
  account: {
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
  cumsumCollateral: bigint;
  cumsumSize: bigint;
  sumMaxSize: bigint;

  maxCapital: bigint;
  netCapital: bigint;
  hasRank: boolean;

  realizedPriceImpact: bigint;
  realizedFees: bigint;
  realizedPnl: bigint;

  startUnrealizedPnl: bigint;
  startUnrealizedPriceImpact: bigint;
  startUnrealizedFees: bigint;

  closedCount: number;
  volume: bigint;
  losses: number;
  wins: number;
};

export type LeaderboardAccount = LeaderboardAccountBase & {
  totalCount: number;
  totalPnl: bigint;
  totalQualifyingPnl: bigint;
  totalFees: bigint;
  unrealizedFees: bigint;
  unrealizedPnl: bigint;
  pnlPercentage: bigint;
  averageSize: bigint;
  averageLeverage: bigint;
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
  realizedFees: bigint;
  unrealizedFees: bigint;
  isLong: boolean;
  market: string;
  maxSize: bigint;
  realizedPriceImpact: bigint;
  unrealizedPriceImpact: bigint;
  isSnapshot: boolean;
  unrealizedPnl: bigint;
  realizedPnl: bigint;
  sizeInTokens: bigint;
  sizeInUsd: bigint;
  entryPrice: bigint;
  collateralToken: string;
  collateralAmount: bigint;
  snapshotTimestamp: number;
};

export type LeaderboardPosition = LeaderboardPositionBase & {
  rank: number;
  fees: bigint;
  pnl: bigint;
  qualifyingPnl: bigint;
  leverage: bigint;
  collateralUsd: bigint;
  closingFeeUsd: bigint;
};

const fetchAccounts = async (
  chainId: number,
  p: { account?: string; from?: number; to?: number }
): Promise<LeaderboardAccountBase[] | undefined> => {
  const client = getSubsquidGraphClient(chainId);
  if (!client) {
    // eslint-disable-next-line
    console.error("no client");
    return;
  }

  const allAccounts = await client.query<LeaderboardAccountsJson>({
    query: gql`
      query PeriodAccountStats($requiredMaxCapital: String, $from: Int, $to: Int, $account: String) {
        all: periodAccountStats(limit: 100000, where: { maxCapital_gte: $requiredMaxCapital, from: $from, to: $to }) {
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
        account: periodAccountStats(limit: 1, where: { id_eq: $account, from: $from, to: $to }) {
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
      from: p.from,
      to: p.to,
      account: p.account,
    },
    fetchPolicy: "no-cache",
  });

  const allAccountsSet = new Set(allAccounts?.data.all.map((p) => p.id));

  if (p.account && !allAccountsSet.has(p.account) && allAccounts?.data.account.length) {
    allAccounts?.data.all.push({ ...allAccounts.data.account[0], hasRank: false });
  }

  return allAccounts?.data.all.map((p) => {
    return {
      account: p.id,
      cumsumCollateral: BigInt(p.cumsumCollateral),
      cumsumSize: BigInt(p.cumsumSize),
      sumMaxSize: BigInt(p.sumMaxSize),
      maxCapital: BigInt(p.maxCapital),
      netCapital: BigInt(p.netCapital),

      realizedPnl: BigInt(p.realizedPnl),
      realizedPriceImpact: BigInt(p.realizedPriceImpact),
      realizedFees: BigInt(p.realizedFees),

      startUnrealizedPnl: BigInt(p.startUnrealizedPnl),
      startUnrealizedPriceImpact: BigInt(p.startUnrealizedPriceImpact),
      startUnrealizedFees: BigInt(p.startUnrealizedFees),

      volume: BigInt(p.volume),
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
    leaderboardDataType: LeaderboardDataType | undefined;
  }
) {
  const { data, error, isLoading } = useSWR(
    enabled
      ? [
          "leaderboard/useLeaderboardData",
          chainId,
          p.account,
          p.from,
          p.to,
          p.positionsSnapshotTimestamp,
          p.leaderboardDataType,
        ]
      : null,
    async () => {
      const [accounts, positions] = await Promise.all([
        p.leaderboardDataType === "positions" ? Promise.resolve([]) : fetchAccounts(chainId, p),
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

  return { data, error, isLoading };
}

const fetchPositions = async (
  chainId: number,
  snapshotTimestamp: number | undefined
): Promise<LeaderboardPositionBase[] | undefined> => {
  const client = getSubsquidGraphClient(chainId);
  if (!client) {
    // eslint-disable-next-line
    console.error("no endpoint");
    return;
  }

  const response = await client.query<LeaderboardPositionsJson>({
    query: gql`
      query PositionQuery($requiredMaxCapital: BigInt, $isSnapshot: Boolean, $snapshotTimestamp: Int) {
        positions(
          limit: 100000
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
      // filtering by maxCapital capital is not accurate for any specific period
      // because it uses maxCapital of total period
      // if trader's pnl is positive at the start of the period
      // then maxCapital at the start of the period is higher than total maxCapital
      // use lower threshold to mitigate this issue
      requiredMaxCapital: expandDecimals(50, 30).toString(),
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
      realizedPriceImpact: BigInt(p.realizedPriceImpact),
      realizedFees: BigInt(p.realizedFees),
      collateralAmount: BigInt(p.collateralAmount),
      unrealizedFees: BigInt(p.unrealizedFees),
      entryPrice: BigInt(p.entryPrice),
      sizeInUsd: BigInt(p.sizeInUsd),
      sizeInTokens: BigInt(p.sizeInTokens),
      realizedPnl: BigInt(p.realizedPnl),
      unrealizedPriceImpact: BigInt(p.unrealizedPriceImpact),
      unrealizedPnl: BigInt(p.unrealizedPnl),
      maxSize: BigInt(p.maxSize),
      snapshotTimestamp: p.snapshotTimestamp,
      isSnapshot: p.isSnapshot,
    };
  });
};
