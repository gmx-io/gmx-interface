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

export default function useUserIncentiveData(chainId: number, account: string) {
  const graphClient = getSyntheticsGraphClient(chainId);
  const cacheKey = chainId && graphClient && account ? [chainId, "useUserIncentiveData", account] : null;

  async function fetchIncentiveData() {
    const USER_INCENTIVE_QUERY = gql`
      query userIncentiveData($account: String!) {
        distributions(orderBy: timestamp, orderDirection: desc, where: { receiver: $account }) {
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

    const response = await graphClient!.query({ query: USER_INCENTIVE_QUERY, fetchPolicy: "no-cache" });

    return response.data?.distributions as UserIncentiveData[];
  }

  const { data, error } = useSWR<UserIncentiveData[]>(cacheKey, { fetcher: fetchIncentiveData });

  return { data, error };
}
