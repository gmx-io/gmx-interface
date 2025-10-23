import { gql } from "@apollo/client";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/subgraph";
import { AprSnapshot } from "sdk/types/subsquid";
import { queryPaginated } from "sdk/utils/subgraph";

import { Period } from "./usePoolsTimeRange";

const APR_SNAPSHOTS_QUERY = gql`
  query AprSnapshots($fromTimestamp: Int, $tokenAddresses: [String!], $limit: Int, $offset: Int) {
    aprSnapshots(
      where: { snapshotTimestamp_gt: $fromTimestamp, address_in: $tokenAddresses }
      orderBy: snapshotTimestamp_ASC
      limit: $limit
      offset: $offset
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

export type AprData = {
  [address: string]: AprSnapshot[];
};

export function useAprSnapshots({
  chainId,
  period,
  tokenAddresses,
}: {
  chainId: number;
  period: Period;
  tokenAddresses?: string[];
}) {
  const { data } = useSWR<AprData | undefined>(
    ["useAprSnapshots", period.periodStart, period.periodEnd, tokenAddresses?.join(",")],
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        const snapshots = await queryPaginated(
          async (limit, offset) =>
            client
              ?.query<AprSnapshotsQuery>({
                query: APR_SNAPSHOTS_QUERY,
                variables: { fromTimestamp: period.periodStart, tokenAddresses, limit, offset },
                fetchPolicy: "no-cache",
              })
              .then((response) => response?.data?.aprSnapshots || []) ?? []
        );

        const aprSnapshotsByToken = snapshots.reduce(
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
