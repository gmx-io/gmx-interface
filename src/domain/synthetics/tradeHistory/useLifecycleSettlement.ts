import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { useMarketsInfoData, useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { OrderType, isIncreaseOrderType } from "domain/synthetics/orders";
import { getSubsquidGraphClient } from "lib/indexers/clients";
import type { ClaimAction, Order, SwapInfo, TradeAction as SubsquidTradeAction } from "sdk/codegen/subsquid";
import { isPositionTradeAction, type PositionTradeAction } from "sdk/utils/tradeHistory/types";

import { processRawTradeActions } from "./processTradeActions";
import { TRADE_ACTION_FIELDS } from "./useTradeHistory";

/** Subsquid caps the response node count; keep a page well below it for the ~30 selected fields. */
const LIFECYCLE_PAGE_SIZE = 300;
const LIFECYCLE_MAX_PAGES = 10;
export const LIFECYCLE_MAX_ROWS = LIFECYCLE_PAGE_SIZE * LIFECYCLE_MAX_PAGES;
/** A window with more settle executions than this is treated as unreconcilable rather than silently sampled. */
const CLAIM_PROBE_LIMIT = 200;

export type LifecycleOrder = {
  orderKey: string;
  initialCollateralTokenAddress: string;
  initialCollateralDeltaAmount: bigint;
  swapPath: string[];
};

export type LifecycleSwapLeg = {
  orderKey: string;
  marketAddress: string;
  tokenInAddress: string;
  tokenOutAddress: string;
  /** Contract price: multiply by 10^decimals to get the 1e30 USD price. */
  tokenInPrice: bigint;
  tokenOutPrice: bigint;
  amountIn: bigint;
  amountOut: bigint;
};

export type LifecycleSettlementData = {
  rows: PositionTradeAction[];
  ordersByKey: Record<string, LifecycleOrder>;
  swapLegsById: Record<string, LifecycleSwapLeg>;
  hasFundingSettlement: boolean;
  isTruncated: boolean;
};

type RawLifecycleSettlementData = {
  rawRows: SubsquidTradeAction[];
  orders: LifecycleOrder[];
  swapLegs: LifecycleSwapLeg[];
  hasFundingSettlement: boolean;
  isTruncated: boolean;
};

const LIFECYCLE_ROWS_QUERY = gql(`
  query LifecycleTradeActions($positionLifecycleId: String!, $limit: Int!, $offset: Int!) {
    tradeActions(
      where: { positionLifecycleId_eq: $positionLifecycleId, eventName_eq: "OrderExecuted" }
      orderBy: [timestamp_ASC, id_ASC]
      limit: $limit
      offset: $offset
    ) {
      ${TRADE_ACTION_FIELDS}
    }
  }
`);

const LIFECYCLE_ROWS_COUNT_QUERY = gql`
  query LifecycleTradeActionsCount($positionLifecycleId: String!) {
    tradeActionsConnection(
      where: { positionLifecycleId_eq: $positionLifecycleId, eventName_eq: "OrderExecuted" }
      orderBy: [timestamp_ASC, id_ASC]
    ) {
      totalCount
    }
  }
`;

const LIFECYCLE_ORDERS_QUERY = gql`
  query LifecycleOrders($orderKeys: [String!]!) {
    orders(where: { id_in: $orderKeys }, limit: 1000) {
      id
      initialCollateralTokenAddress
      initialCollateralDeltaAmount
      swapPath
    }
  }
`;

const LIFECYCLE_SWAP_INFOS_QUERY = gql`
  query LifecycleSwapInfos($swapInfoIds: [String!]!) {
    swapInfos(where: { id_in: $swapInfoIds }, limit: 1000) {
      id
      orderKey
      marketAddress
      tokenInAddress
      tokenOutAddress
      tokenInPrice
      tokenOutPrice
      amountIn
      amountOut
    }
  }
`;

const LIFECYCLE_SETTLE_FUNDING_QUERY = gql`
  query LifecycleSettleFundingClaims($account: String!, $fromTimestamp: Int!, $toTimestamp: Int!, $limit: Int!) {
    claimActions(
      where: {
        eventName_eq: SettleFundingFeeExecuted
        account_eq: $account
        timestamp_gte: $fromTimestamp
        timestamp_lte: $toTimestamp
      }
      orderBy: [timestamp_ASC, id_ASC]
      limit: $limit
    ) {
      marketAddresses
      isLongOrders
    }
  }
`;

/** `id` is `${transactionHash}:${logIndex}`; log indexes are monotonic within a block, unlike their string form. */
function getRowLogIndex(id: string): number {
  const logIndex = Number(id.slice(id.lastIndexOf(":") + 1));

  return Number.isFinite(logIndex) ? logIndex : 0;
}

function sortRawRowsByExecution(rows: SubsquidTradeAction[]): SubsquidTradeAction[] {
  return [...rows].sort((a, b) => a.timestamp - b.timestamp || getRowLogIndex(a.id) - getRowLogIndex(b.id));
}

export function getSwapLegId(orderKey: string, marketAddress: string): string {
  return `${orderKey}:${marketAddress}`;
}

export async function fetchLifecycleSettlementData({
  chainId,
  account,
  positionLifecycleId,
}: {
  chainId: number;
  account: string;
  positionLifecycleId: string;
}): Promise<RawLifecycleSettlementData | undefined> {
  const client = getSubsquidGraphClient(chainId);

  if (!client) {
    return undefined;
  }

  const queryPage = async (pageIndex: number) => {
    const result = await client.query({
      query: LIFECYCLE_ROWS_QUERY,
      variables: {
        positionLifecycleId,
        limit: LIFECYCLE_PAGE_SIZE,
        offset: pageIndex * LIFECYCLE_PAGE_SIZE,
      },
    });

    return (result.data?.tradeActions ?? []) as SubsquidTradeAction[];
  };

  const [firstPage, countResult] = await Promise.all([
    queryPage(0),
    client.query({ query: LIFECYCLE_ROWS_COUNT_QUERY, variables: { positionLifecycleId } }),
  ]);

  const totalCount = (countResult.data?.tradeActionsConnection?.totalCount as number | undefined) ?? firstPage.length;
  const isTruncated = totalCount > LIFECYCLE_MAX_ROWS;

  const rawRows = [...firstPage];

  for (let pageIndex = 1; !isTruncated && rawRows.length < totalCount && pageIndex < LIFECYCLE_MAX_PAGES; pageIndex++) {
    const pageRows = await queryPage(pageIndex);

    if (pageRows.length === 0) {
      break;
    }

    rawRows.push(...pageRows);
  }

  const sortedRows = sortRawRowsByExecution(rawRows);

  if (sortedRows.length === 0) {
    return { rawRows: sortedRows, orders: [], swapLegs: [], hasFundingSettlement: false, isTruncated };
  }

  const orderKeys = sortedRows.map((row) => row.orderKey);
  const swapInfoIds = sortedRows.flatMap((row) => {
    const swapPath = row.swapPath ?? [];

    if (swapPath.length === 0) {
      return [];
    }

    // Increases are funded through the first hop; decreases pay out through the last one.
    const marketAddress = isIncreaseOrderType(Number(row.orderType) as OrderType)
      ? swapPath[0]
      : swapPath[swapPath.length - 1];

    return [getSwapLegId(row.orderKey, marketAddress)];
  });

  const fromTimestamp = sortedRows[0].timestamp;
  const toTimestamp = sortedRows[sortedRows.length - 1].timestamp;

  const [ordersResult, swapInfosResult, claimsResult] = await Promise.all([
    client.query({ query: LIFECYCLE_ORDERS_QUERY, variables: { orderKeys } }),
    swapInfoIds.length > 0
      ? client.query({ query: LIFECYCLE_SWAP_INFOS_QUERY, variables: { swapInfoIds } })
      : undefined,
    client.query({
      query: LIFECYCLE_SETTLE_FUNDING_QUERY,
      variables: { account, fromTimestamp, toTimestamp, limit: CLAIM_PROBE_LIMIT },
    }),
  ]);

  const rawOrders = (ordersResult.data?.orders ?? []) as Order[];
  const rawSwapInfos = (swapInfosResult?.data?.swapInfos ?? []) as SwapInfo[];
  const rawClaims = (claimsResult.data?.claimActions ?? []) as ClaimAction[];

  const marketDirections = new Set(sortedRows.map((row) => `${row.marketAddress}:${row.isLong}`));
  // `amounts` / `tokenPrices` are known to desync from the other arrays — only pair markets with directions.
  const hasFundingSettlement =
    rawClaims.length >= CLAIM_PROBE_LIMIT ||
    rawClaims.some((claim) =>
      claim.marketAddresses.some((marketAddress, index) =>
        marketDirections.has(`${marketAddress}:${claim.isLongOrders[index]}`)
      )
    );

  return {
    rawRows: sortedRows,
    orders: rawOrders.map((order) => ({
      orderKey: order.id,
      initialCollateralTokenAddress: order.initialCollateralTokenAddress,
      initialCollateralDeltaAmount: BigInt(order.initialCollateralDeltaAmount),
      swapPath: order.swapPath ?? [],
    })),
    swapLegs: rawSwapInfos.map((swapInfo) => ({
      orderKey: swapInfo.orderKey,
      marketAddress: swapInfo.marketAddress,
      tokenInAddress: swapInfo.tokenInAddress,
      tokenOutAddress: swapInfo.tokenOutAddress,
      tokenInPrice: BigInt(swapInfo.tokenInPrice),
      tokenOutPrice: BigInt(swapInfo.tokenOutPrice),
      amountIn: BigInt(swapInfo.amountIn),
      amountOut: BigInt(swapInfo.amountOut),
    })),
    hasFundingSettlement,
    isTruncated,
  };
}

/** Positions opened before the indexed range carry no lifecycle id and can never be reconciled. */
const UNMATCHED_LIFECYCLE: LifecycleSettlementData = {
  rows: [],
  ordersByKey: {},
  swapLegsById: {},
  hasFundingSettlement: false,
  isTruncated: false,
};

export function useLifecycleSettlement(
  chainId: number,
  tradeAction: PositionTradeAction | undefined
): { settlement: LifecycleSettlementData | undefined; isLoading: boolean } {
  const marketsInfoData = useMarketsInfoData();
  const tokensData = useTokensData();

  const positionLifecycleId = tradeAction?.positionLifecycleId;
  const account = tradeAction?.account;

  const key = positionLifecycleId && account ? (["lifecycleSettlement", chainId, positionLifecycleId] as const) : null;

  const { data, isLoading } = useSWR<RawLifecycleSettlementData | undefined>(key, {
    keepPreviousData: true,
    fetcher: () =>
      fetchLifecycleSettlementData({ chainId, account: account!, positionLifecycleId: positionLifecycleId! }),
  });

  const settlement = useMemo((): LifecycleSettlementData | undefined => {
    if (tradeAction && !positionLifecycleId) {
      return UNMATCHED_LIFECYCLE;
    }

    if (!data) {
      return undefined;
    }

    const processed = processRawTradeActions({
      chainId,
      rawActions: data.rawRows,
      marketsInfoData,
      tokensData,
      marketsDirectionsFilter: undefined,
    });

    if (!processed) {
      return undefined;
    }

    const rows = processed.filter(isPositionTradeAction);

    return {
      rows,
      ordersByKey: Object.fromEntries(data.orders.map((order) => [order.orderKey, order])),
      swapLegsById: Object.fromEntries(
        data.swapLegs.map((leg) => [getSwapLegId(leg.orderKey, leg.marketAddress), leg])
      ),
      hasFundingSettlement: data.hasFundingSettlement,
      // A row the transformer could not resolve would silently drop out of every lifecycle total.
      isTruncated: data.isTruncated || rows.length !== data.rawRows.length,
    };
  }, [chainId, data, marketsInfoData, positionLifecycleId, tokensData, tradeAction]);

  return { settlement, isLoading };
}
