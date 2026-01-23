import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { SECONDS_IN_DAY } from "lib/dates";
import { getSubsquidGraphClient } from "lib/indexers";
import { Price } from "sdk/types/subsquid";
import { queryPaginated } from "sdk/utils/indexers";

import { Period } from "./usePoolsTimeRange";

const PRICES_QUERY = gql`
  query Prices($fromTimestamp: Int, $tokenAddress: String!, $limit: Int, $offset: Int) {
    prices(
      where: { isSnapshot_eq: true, snapshotTimestamp_gt: $fromTimestamp, token_eq: $tokenAddress, type_not_eq: v2 }
      orderBy: snapshotTimestamp_ASC
      limit: $limit
      offset: $offset
    ) {
      minPrice
      maxPrice
      snapshotTimestamp
      token
      type
    }
  }
`;

const INITIAL_PRICES_QUERY = gql`
  query InitialPrices($tokenAddress: String!) {
    prices(where: { isSnapshot_eq: true, token_eq: $tokenAddress }, orderBy: snapshotTimestamp_ASC, limit: 1) {
      snapshotTimestamp
    }
  }
`;

type PriceSnapshot = Price & { snapshotTimestamp: number };

type PriceQuery = {
  prices: PriceSnapshot[];
};

export function usePriceSnapshots({
  chainId,
  period,
  marketOrGlvTokenAddress,
}: {
  chainId: number;
  period: Period;
  marketOrGlvTokenAddress: string;
}) {
  const { data: firstSnapshotTimestamp, isLoading: isLoadingFirstSnapshotTimestamp } = useSWR<number | undefined>(
    ["usePriceFirstSnapshotTimestamp", chainId, marketOrGlvTokenAddress],
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        const res = await client?.query<PriceQuery>({
          query: INITIAL_PRICES_QUERY,
          variables: {
            tokenAddress: marketOrGlvTokenAddress,
          },
        });

        return res?.data?.prices?.[0]?.snapshotTimestamp;
      },
    }
  );

  const { data } = useSWR<PriceSnapshot[]>(
    ["usePriceSnapshots", period.periodStart, period.periodEnd, marketOrGlvTokenAddress],
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        const res = await queryPaginated(
          async (limit, offset) =>
            client
              ?.query<PriceQuery>({
                query: PRICES_QUERY,
                variables: {
                  fromTimestamp: period.periodStart,
                  tokenAddress: marketOrGlvTokenAddress,
                  limit,
                  offset,
                },
                fetchPolicy: "no-cache",
              })
              .then((response) => response?.data?.prices || []) ?? []
        );

        return res;
      },
    }
  );

  return useMemo(() => {
    if (data === undefined || isLoadingFirstSnapshotTimestamp) {
      return [];
    }

    return data?.filter((price) => {
      // omit first 3 days of data
      if (!firstSnapshotTimestamp || price.snapshotTimestamp < firstSnapshotTimestamp + SECONDS_IN_DAY * 3) {
        return false;
      }

      return true;
    });
  }, [data, firstSnapshotTimestamp, isLoadingFirstSnapshotTimestamp]);
}
