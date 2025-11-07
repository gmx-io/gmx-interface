import { gql } from "@apollo/client";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/subgraph";

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
  createdTxnHash: string | undefined;
  executedTxnHash: string | undefined;
  cancelledTxnHash: string | undefined;
};

const ORDER_TRANSACTIONS_QUERY = gql`
  query OrderTransactions($orderKey: String!) {
    orders(where: { id_eq: $orderKey }, limit: 1) {
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

export function useOrderTransactionDetails(chainId: number, orderKey?: string) {
  const { data, error, isLoading } = useSWR(
    orderKey ? ([chainId, "orderTransactions", orderKey] as const) : null,
    async ([chain, , key]) => {
      const client = getSubsquidGraphClient(chain);
      if (!client) {
        return null;
      }

      const result = await client.query<OrderTransactionsQueryResult>({
        query: ORDER_TRANSACTIONS_QUERY,
        variables: { orderKey: key },
        fetchPolicy: "no-cache",
      });

      const order = result.data?.orders?.[0];

      if (!order) {
        return null;
      }

      return {
        orderKey: order.id,
        createdTxnHash: order.createdTxn?.hash,
        executedTxnHash: order.executedTxn?.hash,
        cancelledTxnHash: order.cancelledTxn?.hash,
      };
    }
  );

  return {
    orderTransactions: data ?? null,
    isLoading,
    error,
  };
}
