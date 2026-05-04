import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers";

const FEES_QUERY = gql`
  query AccountNetPositionFeesLast4Months($account: String!) {
    accountNetPositionFeesLast4Months(account: $account) {
      netPositionFeeUsd
    }
  }
`;

export function useAccountNetPositionFeesLast4Months(chainId: number, params: { account?: string; enabled?: boolean }) {
  const { account, enabled = true } = params;

  const { data, error, isLoading } = useSWR<bigint | undefined>(
    enabled && account ? ["useAccountNetPositionFeesLast4Months", chainId, account] : null,
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        if (!client || !account) return undefined;

        const res = await client.query({
          query: FEES_QUERY,
          variables: { account: account.toLowerCase() },
          fetchPolicy: "no-cache",
        });

        const value = res?.data?.accountNetPositionFeesLast4Months?.netPositionFeeUsd;
        if (value === null || value === undefined) return undefined;

        return BigInt(value);
      },
      refreshInterval: 5_000,
      revalidateOnFocus: false,
    }
  );

  return useMemo(() => ({ data, error, loading: isLoading }), [data, error, isLoading]);
}
