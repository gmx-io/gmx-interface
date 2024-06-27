import { gql } from "@apollo/client";
import { getSyntheticsGraphClient } from "lib/subgraph";
import useSWR from "swr";
import { INCENTIVE_TOOLTIP_MAP, INCENTIVE_TYPE_MAP } from "./incentivesAirdropMessages";

export type UserIncentiveData = {
  id: string;
  typeId: string;
  amounts: string[];
  amountsInUsd: string[];
  timestamp: number;
  tokens: string[];
  transactionHash: string;
};

const typeIds = Object.keys({
  ...INCENTIVE_TYPE_MAP,
  ...INCENTIVE_TOOLTIP_MAP,
}).join(", ");

const USER_INCENTIVE_QUERY = gql`
  query userIncentiveData($account: String!) {
    distributions(
      orderBy: timestamp
      orderDirection: desc
      where: { receiver: $account, typeId_in: [${typeIds}] }
      first: 1000
    ) {
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

  async function fetchUserIncentiveData(): Promise<UserIncentiveData[]> {
    if (!account) {
      return [];
    }

    const response = await graphClient!.query({
      query: USER_INCENTIVE_QUERY,
      variables: { account: account.toLowerCase() },
    });

    return response.data?.distributions as UserIncentiveData[];
  }

  const { data, error } = useSWR<UserIncentiveData[]>(userIncentiveDataCacheKey, { fetcher: fetchUserIncentiveData });

  return { data, error };
}
