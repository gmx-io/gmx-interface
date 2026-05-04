import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers";

const FIRST_TRADE_QUERY = gql`
  query AccountFirstTradeTimestamp($account: String!) {
    tradeActions(limit: 1, where: { account_eq: $account }, orderBy: timestamp_ASC) {
      timestamp
    }
  }
`;

export function useAccountFirstTradeTimestamp(chainId: number, params: { account?: string; enabled?: boolean }) {
  const { account, enabled = true } = params;

  const { data, error, isLoading } = useSWR<number | undefined>(
    enabled && account ? ["useAccountFirstTradeTimestamp", chainId, account] : null,
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        if (!client || !account) return undefined;

        const res = await client.query<{ tradeActions: { timestamp: number }[] }>({
          query: FIRST_TRADE_QUERY,
          variables: { account: account.toLowerCase() },
          fetchPolicy: "no-cache",
        });

        const first = res?.data?.tradeActions?.[0];
        if (!first) return undefined;

        return first.timestamp;
      },
      refreshInterval: 5_000,
      revalidateOnFocus: false,
    }
  );

  return useMemo(() => ({ data, error, loading: isLoading }), [data, error, isLoading]);
}
