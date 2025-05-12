import { gql } from "@apollo/client";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/subgraph";

import { Period } from "./usePoolsTimeRange";

const APR_SNAPSHOTS_QUERY = gql`
  query AprSnapshots($fromTimestamp: Int, $tokenAddresses: [String!]) {
    aprSnapshots(
      where: { snapshotTimestamp_gt: $fromTimestamp, address_in: $tokenAddresses }
      orderBy: snapshotTimestamp_ASC
    ) {
      id
      address
      aprByFee
      aprByBorrowingFee
      snapshotTimestamp
    }
  }
`;

type AprSnapshotsQuery = {
  aprSnapshots: AprSnapshot[];
};

export type AprSnapshot = {
  id: string;
  address: string;
  aprByFee: string;
  aprByBorrowingFee: string;
  snapshotTimestamp: number;
};

export type AprData = {
  [address: string]: AprSnapshot[];
};

export function useGmGlvApr({
  chainId,
  period,
  tokenAddresses,
}: {
  chainId: number;
  period: Period;
  tokenAddresses?: string[];
}) {
  const { data } = useSWR<AprData | undefined>(
    ["useGmGlvApr", period.periodStart, period.periodEnd, tokenAddresses?.join(",")],
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        const res = await client?.query<AprSnapshotsQuery>({
          query: APR_SNAPSHOTS_QUERY,
          variables: { fromTimestamp: period.periodStart, tokenAddresses },
          fetchPolicy: "no-cache",
        });

        const aprSnapshotsByToken = res?.data?.aprSnapshots.reduce(
          (acc, aprSnapshot) => {
            acc[aprSnapshot.address] = (acc[aprSnapshot.address] || []).concat(aprSnapshot);
            return acc;
          },
          {} as Record<string, AprSnapshot[]>
        );

        return aprSnapshotsByToken;
      },
    }
  );

  return {
    aprSnapshots: data,
  };
}
