import { gql } from "@apollo/client";
import { getSyntheticsGraphClient } from "lib/subgraph";
import useSWR from "swr";

type UserIncentiveData = {
  id: string;
  typeId: string;
  amounts: string;
  amountsInUsd: string;
  blockNumber: string;
  receiver: string;
  timestamp: number;
  tokens: string;
  transactionHash: string;
};

const USER_INCENTIVE_QUERY = gql`
  query userIncentiveData {
    distributions(orderBy: timestamp, orderDirection: desc) {
      typeId
      amounts
      amountsInUsd
      blockNumber
      id
      receiver
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

  async function fetchUserIncentiveData(): Promise<UserIncentiveData[]> {
    // if (!account) {
    //   return [];
    // }

    const response = await graphClient!.query({
      query: USER_INCENTIVE_QUERY,
      // variables: { account: account.toLowerCase() },
    });

    return response.data?.distributions as UserIncentiveData[];
  }

  const { data, error } = useSWR<UserIncentiveData[]>(userIncentiveDataCacheKey, { fetcher: fetchUserIncentiveData });

  return { data, error };
}
