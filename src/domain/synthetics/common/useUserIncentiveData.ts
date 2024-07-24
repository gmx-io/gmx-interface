import { gql } from "@apollo/client";
import { getSyntheticsGraphClient } from "lib/subgraph";
import useSWR from "swr";

export type UserIncentiveData = {
  id: string;
  typeId: string;
  amounts: string[];
  amountsInUsd: string[];
  timestamp: number;
  tokens: string[];
  transactionHash: string;
};

const USER_INCENTIVE_QUERY = gql`
  query userIncentiveData($account: String!) {
    distributions(orderBy: timestamp, orderDirection: desc, where: { receiver: $account }, first: 1000) {
      typeId
      amounts
      amountsInUsd
      id
      timestamp
      tokens
      transactionHash
    }
  }
`;

export default function useUserIncentiveData(chainId: number, account?: string) {
  const graphClient = getSyntheticsGraphClient(chainId);
  const userIncentiveDataCacheKey =
    chainId && graphClient && account ? [chainId, "useUserIncentiveData", account] : null;

  async function fetchUserIncentiveData(): Promise<UserIncentiveData[] | undefined> {
    if (!account) {
      return [];
    }

    const response = await graphClient!.query({
      query: USER_INCENTIVE_QUERY,
      variables: { account: account.toLowerCase() },
    });

    return response.data?.distributions as UserIncentiveData[] | undefined;
  }

  const { data, error } = useSWR<UserIncentiveData[] | undefined>(userIncentiveDataCacheKey, {
    fetcher: fetchUserIncentiveData,
  });

  return { data, error };
}
