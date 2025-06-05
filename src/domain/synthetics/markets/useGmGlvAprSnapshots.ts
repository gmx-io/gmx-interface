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
  address: string;
  aprByFee: string;
  aprByBorrowingFee: string;
  snapshotTimestamp: number;
};

export type AprData = {
  [address: string]: AprSnapshot[];
};

export function useGmGlvAprSnapshots({
  chainId,
  period,
  tokenAddresses,
}: {
  chainId: number;
  period: Period;
  tokenAddresses?: string[];
}) {
  const { data } = useSWR<AprData | undefined>(
    ["useGmGlvAprSnapshots", period.periodStart, period.periodEnd, tokenAddresses?.join(",")],
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
            if (!acc[aprSnapshot.address]) {
              acc[aprSnapshot.address] = [];
            }
            acc[aprSnapshot.address].push(aprSnapshot);
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
