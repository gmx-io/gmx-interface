import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { getMarketOrderExecutionGraphClient } from "lib/indexers";
import { TradeActionType } from "sdk/utils/tradeHistory/types";

import {
  MARKET_POSITION_ORDER_TYPES,
  MarketOrderExecutionAction,
  MarketOrderExecutionStats,
  MarketOrderKind,
  MarketOrderPhase,
  MarketOrderSide,
  buildMarketOrderExecutionRows,
} from "./marketOrderExecutions";
import { OrderType } from "./types";

const MARKET_ORDER_EXECUTION_SAMPLE_SIZE = 0;
const REFRESH_INTERVAL = 60 * 1000;

const MARKET_ORDER_EXECUTION_STATS_QUERY = gql(`
  query MarketOrderExecutionStats(
    $fromTimestamp: Int!
    $toTimestamp: Int!
    $marketAddress: String
    $account: String
    $orderTypes: [Int!]
    $isLong: Boolean
    $sampleSize: Int!
  ) {
    marketOrderExecutionStats(
      fromTimestamp: $fromTimestamp
      toTimestamp: $toTimestamp
      marketAddress: $marketAddress
      account: $account
      orderTypes: $orderTypes
      isLong: $isLong
      sampleSize: $sampleSize
    ) {
      totalCount
      timingCount
      medianDelaySeconds
      p95DelaySeconds
      percentiles {
        percentile
        delaySeconds
      }
      delayThresholds {
        threshold
        count
        total
        percentage
      }
    }
  }
`);

const MARKET_ORDER_EXECUTION_ROWS_QUERY = gql(`
  query MarketOrderExecutionRows($offset: Int!, $limit: Int!, $where: TradeActionWhereInput!) {
    marketOrderExecutions: tradeActions(
      offset: $offset
      limit: $limit
      orderBy: [timestamp_DESC, id_DESC]
      where: $where
    ) {
      orderKey
      orderType
      timestamp
      transactionHash
      account
      marketAddress
      isLong
      shouldUnwrapNativeToken
      initialCollateralTokenAddress
      initialCollateralDeltaAmount
      swapPath
      sizeDeltaUsd
      orderCreatedTimestamp
      orderCreatedTxnHash
    }
  }
`);

const MARKET_ORDER_EXECUTION_RESOLVER_ROWS_QUERY = gql(`
  query MarketOrderExecutionResolverRows(
    $fromTimestamp: Int!
    $toTimestamp: Int!
    $marketAddress: String
    $account: String
    $orderTypes: [Int!]
    $isLong: Boolean
    $offset: Int!
    $limit: Int!
    $sortField: MarketOrderExecutionSortField!
    $sortDirection: MarketOrderExecutionSortDirection!
  ) {
    marketOrderExecutions: marketOrderExecutionRows(
      fromTimestamp: $fromTimestamp
      toTimestamp: $toTimestamp
      marketAddress: $marketAddress
      account: $account
      orderTypes: $orderTypes
      isLong: $isLong
      offset: $offset
      limit: $limit
      sortField: $sortField
      sortDirection: $sortDirection
    ) {
      orderKey
      orderType
      timestamp
      transactionHash
      account
      marketAddress
      isLong
      shouldUnwrapNativeToken
      initialCollateralTokenAddress
      initialCollateralDeltaAmount
      swapPath
      sizeDeltaUsd
      orderCreatedTimestamp
      orderCreatedTxnHash
    }
  }
`);

export type MarketOrderExecutionsParams = {
  chainId: number;
  fromTimestamp: number;
  toTimestamp: number;
  marketAddress: string | undefined;
  account: string | undefined;
  kind: MarketOrderKind;
  phase: MarketOrderPhase | undefined;
  side: MarketOrderSide | undefined;
};

export type MarketOrderExecutionRowsParams = MarketOrderExecutionsParams & {
  offset: number;
  limit: number;
  sortField?: MarketOrderExecutionSortField;
  sortDirection?: "asc" | "desc";
};

export type MarketOrderExecutionSortField = "executionTime";

type MarketOrderExecutionStatsQuery = {
  marketOrderExecutionStats: MarketOrderExecutionStats;
};

type MarketOrderExecutionStatsVariables = {
  fromTimestamp: number;
  toTimestamp: number;
  marketAddress?: string;
  account?: string;
  orderTypes: number[];
  isLong?: boolean;
  sampleSize: number;
};

type MarketOrderExecutionRowsQuery = {
  marketOrderExecutions: MarketOrderExecutionAction[];
};

type MarketOrderExecutionRowsVariables = {
  offset: number;
  limit: number;
  where: Record<string, unknown>;
};

type MarketOrderExecutionResolverRowsVariables = {
  fromTimestamp: number;
  toTimestamp: number;
  marketAddress?: string;
  account?: string;
  orderTypes: number[];
  isLong?: boolean;
  offset: number;
  limit: number;
  sortField: "EXECUTION_TIME";
  sortDirection: "ASC" | "DESC";
};

export function useMarketOrderExecutionStats(params: MarketOrderExecutionsParams, enabled = true) {
  const key = useMemo(
    () =>
      enabled
        ? [
            "marketOrderExecutionStats",
            params.chainId,
            params.fromTimestamp,
            params.toTimestamp,
            params.marketAddress ?? "",
            params.account ?? "",
            params.kind,
            params.phase ?? "",
            params.side ?? "",
          ]
        : null,
    [
      enabled,
      params.account,
      params.chainId,
      params.fromTimestamp,
      params.kind,
      params.marketAddress,
      params.phase,
      params.side,
      params.toTimestamp,
    ]
  );

  return useSWR<MarketOrderExecutionStats>(key, () => fetchMarketOrderExecutionStats(params), {
    refreshInterval: REFRESH_INTERVAL,
  });
}

export function useMarketOrderExecutionRows(params: MarketOrderExecutionRowsParams, enabled = true) {
  const key = useMemo(
    () =>
      enabled
        ? [
            "marketOrderExecutionRows",
            params.chainId,
            params.fromTimestamp,
            params.toTimestamp,
            params.marketAddress ?? "",
            params.account ?? "",
            params.kind,
            params.phase ?? "",
            params.side ?? "",
            params.offset,
            params.limit,
            params.sortField ?? "",
            params.sortDirection ?? "",
          ]
        : null,
    [
      enabled,
      params.account,
      params.chainId,
      params.fromTimestamp,
      params.kind,
      params.limit,
      params.marketAddress,
      params.offset,
      params.phase,
      params.side,
      params.sortDirection,
      params.sortField,
      params.toTimestamp,
    ]
  );

  return useSWR(key, () => fetchMarketOrderExecutionRows(params), {
    refreshInterval: REFRESH_INTERVAL,
  });
}

export async function fetchMarketOrderExecutionStats(
  params: MarketOrderExecutionsParams
): Promise<MarketOrderExecutionStats> {
  const client = getMarketOrderExecutionGraphClient(params.chainId);

  if (!client) {
    throw new Error(`No Subsquid client configured for chain ${params.chainId}`);
  }

  const result = await client.query<MarketOrderExecutionStatsQuery, MarketOrderExecutionStatsVariables>({
    query: MARKET_ORDER_EXECUTION_STATS_QUERY,
    variables: {
      fromTimestamp: params.fromTimestamp,
      toTimestamp: params.toTimestamp,
      marketAddress: params.marketAddress,
      account: params.account,
      orderTypes: getOrderTypes(params),
      isLong: params.kind === "perp" && params.side !== undefined ? params.side === "long" : undefined,
      sampleSize: MARKET_ORDER_EXECUTION_SAMPLE_SIZE,
    },
    fetchPolicy: "no-cache",
  });
  const stats = result.data.marketOrderExecutionStats;

  return {
    ...stats,
    medianDelaySeconds: stats.medianDelaySeconds ?? null,
    p95DelaySeconds: stats.p95DelaySeconds ?? null,
    percentiles: stats.percentiles.map((item) => ({
      ...item,
      delaySeconds: item.delaySeconds ?? null,
    })),
  };
}

export async function fetchMarketOrderExecutionRows(params: MarketOrderExecutionRowsParams) {
  const client = getMarketOrderExecutionGraphClient(params.chainId);

  if (!client) {
    throw new Error(`No Subsquid client configured for chain ${params.chainId}`);
  }

  const useResolver = params.sortField === "executionTime";
  const result = useResolver
    ? await client.query<MarketOrderExecutionRowsQuery, MarketOrderExecutionResolverRowsVariables>({
        query: MARKET_ORDER_EXECUTION_RESOLVER_ROWS_QUERY,
        variables: {
          fromTimestamp: params.fromTimestamp,
          toTimestamp: params.toTimestamp,
          marketAddress: params.marketAddress,
          account: params.account,
          orderTypes: getOrderTypes(params),
          isLong: params.side === undefined ? undefined : params.side === "long",
          offset: params.offset,
          limit: params.limit,
          sortField: "EXECUTION_TIME",
          sortDirection: params.sortDirection === "asc" ? "ASC" : "DESC",
        },
        fetchPolicy: "no-cache",
      })
    : await client.query<MarketOrderExecutionRowsQuery, MarketOrderExecutionRowsVariables>({
        query: MARKET_ORDER_EXECUTION_ROWS_QUERY,
        variables: {
          offset: params.offset,
          limit: params.limit,
          where: getExecutionWhere(params),
        },
        fetchPolicy: "no-cache",
      });

  return buildMarketOrderExecutionRows(result.data.marketOrderExecutions);
}

function getOrderTypes(params: MarketOrderExecutionsParams) {
  if (params.kind === "swap") {
    return [OrderType.MarketSwap];
  }

  if (params.phase === "increase") {
    return [OrderType.MarketIncrease];
  }

  if (params.phase === "decrease") {
    return [OrderType.MarketDecrease];
  }

  return MARKET_POSITION_ORDER_TYPES;
}

function getExecutionWhere(params: MarketOrderExecutionsParams) {
  const commonFilters = {
    eventName_eq: TradeActionType.OrderExecuted,
    twapGroupId_isNull: true,
    timestamp_gte: params.fromTimestamp,
    timestamp_lte: params.toTimestamp,
    account_eq: params.account,
  };

  if (params.kind === "swap") {
    return {
      ...commonFilters,
      orderType_eq: OrderType.MarketSwap,
      initialCollateralDeltaAmount_not_eq: "0",
      executionAmountOut_isNull: false,
      swapPath_containsAny: params.marketAddress ? [params.marketAddress] : undefined,
    };
  }

  return {
    ...commonFilters,
    orderType_in: getOrderTypes(params),
    sizeDeltaUsd_not_eq: "0",
    marketAddress_isNull: false,
    marketAddress_eq: params.marketAddress,
    isLong_isNull: false,
    isLong_eq: params.side === undefined ? undefined : params.side === "long",
  };
}
