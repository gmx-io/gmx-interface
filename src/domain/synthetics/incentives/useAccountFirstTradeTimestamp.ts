import { useMemo } from "react";
import useSWR from "swr";

import { getIndexerUrl } from "config/indexers";
import graphqlFetcher from "sdk/utils/graphqlFetcher";

const FIRST_TRADE_QUERY = /* gql */ `
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
        const subsquidUrl = getIndexerUrl(chainId, "subsquid");
        if (!subsquidUrl || !account) return undefined;

        const res = await graphqlFetcher<{ tradeActions: { timestamp: number }[] }>(subsquidUrl, FIRST_TRADE_QUERY, {
          account: account.toLowerCase(),
        });

        const first = res?.tradeActions?.[0];
        if (!first) return undefined;

        return first.timestamp;
      },
      refreshInterval: 5_000,
      revalidateOnFocus: false,
    }
  );

  return useMemo(() => ({ data, error, loading: isLoading }), [data, error, isLoading]);
}
