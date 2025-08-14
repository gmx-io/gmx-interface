import { gql } from "@apollo/client";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/subgraph";
import { Distribution } from "sdk/types/subsquid";

const USER_INCENTIVE_QUERY = gql`
  query userIncentiveData($account: String!) {
    distributions(orderBy: transaction_timestamp_DESC, where: { receiver_eq: $account }, limit: 1000) {
      id
      typeId
      amounts
      amountsInUsd
      tokens
      transaction {
        timestamp
        hash
      }
    }
  }
`;

export default function useUserIncentiveData(chainId: number, account?: string) {
  const squidClient = getSubsquidGraphClient(chainId);
  const userIncentiveDataCacheKey =
    chainId && squidClient && account ? [chainId, "useUserIncentiveData", account] : null;

  async function fetchUserIncentiveData(): Promise<Distribution[] | undefined> {
    if (!account) {
      return [];
    }

    const response = await squidClient!.query({
      query: USER_INCENTIVE_QUERY,
      variables: { account: account },
    });

    return response.data?.distributions as Distribution[] | undefined;
  }

  const { data, error } = useSWR<Distribution[] | undefined>(userIncentiveDataCacheKey, {
    fetcher: fetchUserIncentiveData,
  });

  return { data, error };
}
