import { gql } from "@apollo/client";
import useSWR from "swr";

import { bigintToNumber, expandDecimals, numberToBigint } from "lib/numbers";
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

type AprSnapshot = {
  id: string;
  address: string;
  aprByFee: string;
  aprByBorrowingFee: string;
  snapshotTimestamp: number;
};

export type ApySnapshot = {
  id: string;
  address: string;
  apy: bigint;
  snapshotTimestamp: number;
};

export type ApyData = {
  [address: string]: ApySnapshot[];
};

export function useGmGlvApySnapshots({
  chainId,
  period,
  tokenAddresses,
}: {
  chainId: number;
  period: Period;
  tokenAddresses?: string[];
}) {
  const { data } = useSWR<ApyData | undefined>(
    ["useGmGlvApySnapshots", period.periodStart, period.periodEnd, tokenAddresses?.join(",")],
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        const res = await client?.query<AprSnapshotsQuery>({
          query: APR_SNAPSHOTS_QUERY,
          variables: { fromTimestamp: period.periodStart, tokenAddresses },
          fetchPolicy: "no-cache",
        });

        const apySnapshotsByToken = res?.data?.aprSnapshots.reduce(
          (acc, aprSnapshot) => {
            const apy = calculateApy(aprSnapshot);
            if (typeof apy === "bigint") {
              acc[aprSnapshot.address] = (acc[aprSnapshot.address] || []).concat({
                id: aprSnapshot.id,
                address: aprSnapshot.address,
                apy,
                snapshotTimestamp: aprSnapshot.snapshotTimestamp,
              });
            }
            return acc;
          },
          {} as Record<string, ApySnapshot[]>
        );

        return apySnapshotsByToken;
      },
    }
  );

  return {
    apySnapshots: data,
  };
}

const calculateApy = ({ aprByFee, aprByBorrowingFee }: { aprByFee: string; aprByBorrowingFee: string }): bigint | undefined => {
  const apr = bigintToNumber(BigInt(aprByFee) + BigInt(aprByBorrowingFee), 30);

  if (Math.exp(apr) === Infinity) {
    return undefined;
  }

  const apy = numberToBigint(Math.exp(apr) - 1, 30);

  // apy > 200% is too high, consider it as 0
  if (apy > expandDecimals(2, 30)) {
    return 0n;
  }

  return apy;
};
