import { gql, useQuery as useGqlQuery } from "@apollo/client";
import { DEBUG_ACCOUNT_ADDRESS } from "config/localStorage";
import { getSubsquidGraphClient } from "lib/subgraph";
import { useMemo } from "react";

export type PeriodAccountStats = {
  volume: bigint;
};

export function usePeriodAccountStats(
  chainId: number,
  params: { account?: string; from?: number; to?: number; enabled?: boolean }
) {
  const { account, from, to, enabled = true } = params;

  // TODO: remove after testing
  const debugAccount = localStorage.getItem(DEBUG_ACCOUNT_ADDRESS);

  const res = useGqlQuery(
    gql`
      query PeriodAccountStats($account: String!, $from: Int, $to: Int) {
        periodAccountStats(where: { id_eq: $account, from: $from, to: $to }) {
          volume
        }
      }
    `,
    {
      client: getSubsquidGraphClient(chainId)!,
      variables: { account: debugAccount ? debugAccount : account, from, to },
      skip: !account || !enabled,
    }
  );

  const result: PeriodAccountStats | undefined = useMemo(() => {
    const stats = res.data?.periodAccountStats[0];

    if (!stats) {
      return undefined;
    }

    return {
      volume: BigInt(stats.volume),
    };
  }, [res.data]);

  return useMemo(() => ({ data: result, error: res.error, loading: res.loading }), [res.error, res.loading, result]);
}
