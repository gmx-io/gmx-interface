import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers/clients";

export default function useIsFirstOrder(chainId: number, p: { account?: string }) {
  const { account } = p;

  const key = account ? ["useIsFirstOrder", chainId, account] : null;

  const { data: isFirstOrder } = useSWR<boolean>(key, {
    fetcher: async () => {
      const client = getSubsquidGraphClient(chainId);

      const result = await client?.query({
        query: gql`
          query TradeActions($account: String!) {
            tradeActions(limit: 1, where: { account_eq: $account }) {
              id
            }
          }
        `,
        variables: { account: account },
        fetchPolicy: "no-cache",
      });

      const tradesCount = result?.data?.tradeActions?.length;
      return tradesCount !== undefined && tradesCount === 0;
    },
  });

  return useMemo(() => {
    return { isFirstOrder: isFirstOrder ?? true };
  }, [isFirstOrder]);
}
