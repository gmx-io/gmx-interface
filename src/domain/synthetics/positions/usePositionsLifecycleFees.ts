import { gql } from "@apollo/client";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import { definedOrThrow } from "lib/guards";
import { getSubsquidGraphClient } from "lib/indexers/clients";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import type { PositionLifecycle, ProcessorStatus, TradeAction } from "sdk/codegen/subsquid";
import { queryPaginated } from "sdk/utils/indexers";

import {
  getIsWaitingForIndexer,
  getPositionLastTradeTimestamp,
  type LifecycleFeeTotals,
  type PositionsLifecycleFees,
} from "./lifetimeFees";
import type { PositionInfo } from "./types";

const POSITION_LIFECYCLES_QUERY = gql`
  query PositionLifecycles($positionKeys: [String!]!, $chainId: String!) {
    positionLifecycles(where: { id_in: $positionKeys }) {
      id
      currentLifecycleId
      isOpen
    }
    processorStatusById(id: $chainId) {
      lastParsedBlockTimestamp
    }
  }
`;

const LIFECYCLE_FEE_ROWS_QUERY = gql`
  query LifecycleFeeRows($lifecycleIds: [String!]!, $toTimestamp: Int!, $limit: Int!, $offset: Int!) {
    tradeActions(
      where: { positionLifecycleId_in: $lifecycleIds, eventName_eq: "OrderExecuted", timestamp_lte: $toTimestamp }
      orderBy: [timestamp_ASC, id_ASC]
      limit: $limit
      offset: $offset
    ) {
      positionLifecycleId
      timestamp
      collateralTokenPriceMin
      borrowingFeeAmount
      fundingFeeAmount
      fundingFeeReceivedUsd
    }
  }
`;

type PositionRequest = {
  positionKey: string;
  lastTradeTimestamp: number;
};

type LifecycleFeeRow = Pick<
  TradeAction,
  "positionLifecycleId" | "timestamp" | "collateralTokenPriceMin" | "borrowingFeeAmount" | "fundingFeeAmount"
> & {
  fundingFeeReceivedUsd?: string | null;
};

function sumLifecycleFees(rows: LifecycleFeeRow[]) {
  const totalsByLifecycleId: Partial<Record<string, LifecycleFeeTotals>> = {};

  for (const row of rows) {
    if (!row.positionLifecycleId) {
      continue;
    }

    let totals = totalsByLifecycleId[row.positionLifecycleId];

    if (!totals) {
      totals = { borrowingFeeUsd: 0n, fundingFeePaidUsd: 0n, fundingFeeReceivedUsd: 0n, lastTradeTimestamp: 0 };
      totalsByLifecycleId[row.positionLifecycleId] = totals;
    }

    const collateralTokenPrice = BigInt(row.collateralTokenPriceMin ?? 0);

    totals.borrowingFeeUsd += BigInt(row.borrowingFeeAmount ?? 0) * collateralTokenPrice;
    totals.fundingFeePaidUsd += BigInt(row.fundingFeeAmount ?? 0) * collateralTokenPrice;
    totals.fundingFeeReceivedUsd += BigInt(row.fundingFeeReceivedUsd ?? 0);
    totals.lastTradeTimestamp = Math.max(totals.lastTradeTimestamp, row.timestamp);
  }

  return totalsByLifecycleId;
}

export async function fetchPositionsLifecycleFees({
  chainId,
  requests,
}: {
  chainId: number;
  requests: PositionRequest[];
}): Promise<PositionsLifecycleFees> {
  const client = getSubsquidGraphClient(chainId);
  definedOrThrow(client);

  const lifecyclesResult = await client.query<{
    positionLifecycles: Pick<PositionLifecycle, "id" | "currentLifecycleId" | "isOpen">[];
    processorStatusById: Pick<ProcessorStatus, "lastParsedBlockTimestamp"> | null;
  }>({
    query: POSITION_LIFECYCLES_QUERY,
    variables: { positionKeys: requests.map((request) => request.positionKey), chainId: String(chainId) },
    fetchPolicy: "no-cache",
  });

  const processorStatus = lifecyclesResult.data.processorStatusById;
  definedOrThrow(processorStatus);

  const indexedUntilTimestamp = processorStatus.lastParsedBlockTimestamp;
  const lifecycleIdByPositionKey: Partial<Record<string, string>> = {};
  const lifecycleIds: string[] = [];

  for (const lifecycle of lifecyclesResult.data.positionLifecycles) {
    if (lifecycle.isOpen && lifecycle.currentLifecycleId) {
      lifecycleIdByPositionKey[lifecycle.id] = lifecycle.currentLifecycleId;
      lifecycleIds.push(lifecycle.currentLifecycleId);
    }
  }

  const rows =
    lifecycleIds.length > 0
      ? await queryPaginated<LifecycleFeeRow>(async (limit, offset) => {
          const result = await client.query<{ tradeActions: LifecycleFeeRow[] }>({
            query: LIFECYCLE_FEE_ROWS_QUERY,
            variables: { lifecycleIds, toTimestamp: indexedUntilTimestamp, limit, offset },
            fetchPolicy: "no-cache",
          });

          return result.data.tradeActions;
        })
      : [];

  const totalsByLifecycleId = sumLifecycleFees(rows);
  const positions: PositionsLifecycleFees["positions"] = {};
  let isWaitingForIndexer = false;

  for (const request of requests) {
    const lifecycleId = lifecycleIdByPositionKey[request.positionKey];
    const totals = lifecycleId ? totalsByLifecycleId[lifecycleId] : undefined;

    positions[request.positionKey] = { totals };

    if (getIsWaitingForIndexer({ totals, indexedUntilTimestamp, lastTradeTimestamp: request.lastTradeTimestamp })) {
      isWaitingForIndexer = true;
    }
  }

  return { indexedUntilTimestamp, isWaitingForIndexer, positions };
}

export function usePositionsLifecycleFees(
  chainId: number,
  positions: PositionInfo[]
): PositionsLifecycleFees | undefined {
  const requests = useMemo(
    () =>
      positions
        .filter((position) => !position.isOpening)
        .map((position) => ({
          positionKey: position.contractKey,
          lastTradeTimestamp: getPositionLastTradeTimestamp(position),
        }))
        .sort((a, b) => a.positionKey.localeCompare(b.positionKey)),
    [positions]
  );

  const requestsKey = requests.map((request) => `${request.positionKey}:${request.lastTradeTimestamp}`).join(",");

  const hasIndexer = Boolean(getSubsquidGraphClient(chainId));
  const [isPolling, setIsPolling] = useState(true);

  const { data } = useSWR<PositionsLifecycleFees>(
    hasIndexer && requests.length > 0 ? ["usePositionsLifecycleFees", chainId, requestsKey] : null,
    {
      fetcher: () => fetchPositionsLifecycleFees({ chainId, requests }),
      keepPreviousData: true,
      refreshInterval: isPolling ? FREQUENT_UPDATE_INTERVAL : 0,
    }
  );

  const isWaitingForIndexer = !data || data.isWaitingForIndexer;

  useEffect(() => {
    setIsPolling(isWaitingForIndexer);
  }, [isWaitingForIndexer]);

  return data;
}
