import { gql } from "@apollo/client";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers";

type OrderTransactionsQueryResult = {
  orders: {
    id: string;
    createdTxn?: { hash: string };
    executedTxn?: { hash: string };
    cancelledTxn?: { hash: string };
  }[];
};

export type OrderTransactionsSummary = {
  orderKey: string;
  createdTxnHash?: string;
  executedTxnHash?: string;
  cancelledTxnHash?: string;
};

export type OrderTransactionsMap = Record<string, OrderTransactionsSummary>;

const ORDER_TRANSACTIONS_QUERY = gql`
  query OrderTransactions($orderKeys: [String!]!) {
    orders(where: { id_in: $orderKeys }, limit: 10) {
      id
      createdTxn {
        hash
      }
      executedTxn {
        hash
      }
      cancelledTxn {
        hash
      }
    }
  }
`;

export function useOrderTransactions(chainId: number, orderKeys: string[] | undefined) {
  const shouldFetch = Boolean(orderKeys && orderKeys.length > 0);

  const { data, error, isLoading } = useSWR(
    shouldFetch ? ([chainId, "orderTransactions", orderKeys] as const) : null,
    async ([chain, , keys]) => {
      const client = getSubsquidGraphClient(chain);
      if (!client) {
        return null;
      }

      const result = await client.query<OrderTransactionsQueryResult>({
        query: ORDER_TRANSACTIONS_QUERY,
        variables: { orderKeys: keys },
        fetchPolicy: "no-cache",
      });

      const map = (result.data?.orders ?? []).reduce<OrderTransactionsMap>((acc, order) => {
        acc[order.id] = {
          orderKey: order.id,
          createdTxnHash: order.createdTxn?.hash,
          executedTxnHash: order.executedTxn?.hash,
          cancelledTxnHash: order.cancelledTxn?.hash,
        };
        return acc;
      }, {});

      return map;
    }
  );

  return {
    orderTransactionsMap: data ?? {},
    isLoading,
    error,
  };
}
