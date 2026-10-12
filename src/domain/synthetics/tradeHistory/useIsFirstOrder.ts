import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR, { type SWRConfiguration } from "swr";

import { getSubsquidGraphClient } from "lib/indexers/clients";

export default function useIsFirstOrder(
  chainId: number,
  p: { account?: string; refreshInterval?: SWRConfiguration<boolean>["refreshInterval"] }
) {
  const { account, refreshInterval } = p;

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
    // left out when unset, so callers without it keep the global interval
    ...(refreshInterval !== undefined ? { refreshInterval } : {}),
  });

  return useMemo(() => {
    return { isFirstOrder };
  }, [isFirstOrder]);
}
