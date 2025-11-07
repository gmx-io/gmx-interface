import { gql } from "@apollo/client";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/subgraph";
import { TradeActionType } from "sdk/types/tradeHistory";

type TradeActionSummary = {
  id: string;
  eventName: TradeActionType;
  orderKey: string | null;
  transactionHash: string;
};

type TradeActionQueryResult = {
  tradeActions: {
    id: string;
    eventName: string;
    orderKey: string | null;
    transaction: { hash: string };
  }[];
};

const TRADE_ACTION_BY_TX_QUERY = gql`
  query TradeActionByTx($hash: String!) {
    tradeActions(where: { transaction: { hash_eq: $hash } }, orderBy: timestamp_ASC, limit: 10) {
      id
      eventName
      orderKey
      transaction {
        hash
      }
    }
  }
`;

const ORDER_EXECUTED_BY_KEY_QUERY = gql`
  query OrderExecutedByKey($orderKey: String!) {
    tradeActions(
      where: { orderKey_eq: $orderKey, eventName_eq: "OrderExecuted" }
      orderBy: timestamp_DESC
      limit: 1
    ) {
      id
      eventName
      orderKey
      transaction {
        hash
      }
    }
  }
`;

function parseTradeActionSummary(raw: TradeActionQueryResult["tradeActions"][number]): TradeActionSummary {
  return {
    id: raw.id,
    eventName: raw.eventName as TradeActionType,
    orderKey: raw.orderKey,
    transactionHash: raw.transaction.hash,
  };
}

export function useRelatedTradeHistory(chainId: number, txHash?: string) {
  const {
    data: primaryAction,
    error: primaryError,
    isLoading: isPrimaryLoading,
  } = useSWR(
    txHash ? ["tradeActionsByTx", chainId, txHash] : null,
    async ([, chain, hash]) => {
      const client = getSubsquidGraphClient(chain);
      if (!client) {
        return null;
      }

      const result = await client.query<TradeActionQueryResult>({
        query: TRADE_ACTION_BY_TX_QUERY,
        variables: { hash },
        fetchPolicy: "no-cache",
      });

      const actions = result.data?.tradeActions ?? [];
      if (!actions.length) {
        return null;
      }

      const preferred =
        actions.find((action) => action.eventName !== TradeActionType.OrderExecuted) ?? actions[0] ?? null;

      return preferred ? parseTradeActionSummary(preferred) : null;
    }
  );

  const shouldLookupExecuted =
    primaryAction && primaryAction.eventName !== TradeActionType.OrderExecuted && primaryAction.orderKey;

  const {
    data: executedFromHistory,
    error: executedError,
    isLoading: isExecutedLoading,
  } = useSWR(
    shouldLookupExecuted ? ["orderExecutedByKey", chainId, primaryAction.orderKey] : null,
    async ([, chain, orderKey]) => {
      const client = getSubsquidGraphClient(chain);
      if (!client) {
        return null;
      }

      const result = await client.query<TradeActionQueryResult>({
        query: ORDER_EXECUTED_BY_KEY_QUERY,
        variables: { orderKey },
        fetchPolicy: "no-cache",
      });

      const action = result.data?.tradeActions?.[0];
      return action ? parseTradeActionSummary(action) : null;
    }
  );

  const executedAction =
    primaryAction?.eventName === TradeActionType.OrderExecuted ? primaryAction : executedFromHistory ?? null;

  return {
    primaryAction,
    executedAction,
    isLoading: isPrimaryLoading || (Boolean(shouldLookupExecuted) && isExecutedLoading),
    error: primaryError || executedError,
  };
}

