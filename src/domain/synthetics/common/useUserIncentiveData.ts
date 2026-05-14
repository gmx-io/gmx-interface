import { gql } from "@apollo/client";
import useSWR from "swr";
import type { Hash } from "viem";

import { RebateDistributionType } from "domain/referrals";
import { getSubsquidGraphClient } from "lib/indexers";
import { Distribution } from "sdk/codegen/subsquid";

export type UserIncentiveDistribution = Omit<Distribution, "transactionHash"> & {
  transactionHash: Hash;
};

// Referral program distributions should only be shown in Referrals > Distributions.
const REFERRAL_DISTRIBUTION_TYPE_IDS = Object.values(RebateDistributionType);

const USER_INCENTIVE_QUERY = gql`
  query userIncentiveData($account: String!, $excludedTypeIds: [BigInt!]) {
    distributions(
      orderBy: timestamp_DESC
      where: { receiver_eq: $account, typeId_not_in: $excludedTypeIds }
      limit: 1000
    ) {
      id
      typeId
      amounts
      amountsInUsd
      tokens
      timestamp
      transactionHash
    }
  }
`;

export default function useUserIncentiveData(chainId: number, account?: string) {
  const squidClient = getSubsquidGraphClient(chainId);
  const userIncentiveDataCacheKey =
    chainId && squidClient && account ? [chainId, "useUserIncentiveData", account] : null;

  async function fetchUserIncentiveData(): Promise<UserIncentiveDistribution[] | undefined> {
    if (!account) {
      return [];
    }

    const response = await squidClient!.query({
      query: USER_INCENTIVE_QUERY,
      variables: { account: account, excludedTypeIds: REFERRAL_DISTRIBUTION_TYPE_IDS },
    });

    return response.data?.distributions as UserIncentiveDistribution[] | undefined;
  }

  const { data, error } = useSWR<UserIncentiveDistribution[] | undefined>(userIncentiveDataCacheKey, {
    fetcher: fetchUserIncentiveData,
  });

  return { data, error };
}
