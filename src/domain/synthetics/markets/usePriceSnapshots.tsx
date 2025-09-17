import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/subgraph";

import { PriceSnapshot } from "./performance";
import { Period } from "./usePoolsTimeRange";

const PRICES_QUERY = gql`
  query Prices($fromTimestamp: Int, $tokenAddresses: [String!]) {
    prices(
      where: { isSnapshot_eq: true, snapshotTimestamp_gt: $fromTimestamp, token_in: $tokenAddresses }
      orderBy: snapshotTimestamp_ASC
    ) {
      minPrice
      maxPrice
      snapshotTimestamp
      token
      type
    }
  }
`;

type PriceQuery = {
  prices: PriceSnapshot[];
};

export type PriceData = {
  [tokenAddress: string]: PriceSnapshot[];
};

export type PriceDataMapped = {
  [tokenAddress: string]: Record<number, PriceSnapshot>;
};

export function usePriceSnapshots({
  chainId,
  period,
  tokenAddresses,
}: {
  chainId: number;
  period: Period;
  tokenAddresses?: string[];
}) {
  const { data } = useSWR<PriceData | undefined>(
    ["usePriceSnapshots", period.periodStart, period.periodEnd, tokenAddresses?.join(",")],
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        const res = await client?.query<PriceQuery>({
          query: PRICES_QUERY,
          variables: {
            fromTimestamp: period.periodStart,
            tokenAddresses,
          },
          fetchPolicy: "no-cache",
        });

        const pricesByToken = res?.data?.prices.reduce(
          (acc, price) => {
            if (!acc[price.token]) {
              acc[price.token] = [];
            }

            acc[price.token].push(price);
            return acc;
          },
          {} as Record<string, PriceSnapshot[]>
        );

        return pricesByToken;
      },
    }
  );

  const priceData = useMemo(() => {
    return Object.entries(data || {}).reduce(
      (acc, [token, prices]) => {
        acc[token] = prices.reduce(
          (acc, price) => {
            // if snapshot price is already in the acc and new price is onchainFeed, skip
            if (price.type === "onchainFeed" && acc[price.snapshotTimestamp]) {
              return acc;
            }

            acc[price.snapshotTimestamp] = price;

            return acc;
          },
          {} as Record<number, PriceSnapshot>
        );
        return acc;
      },
      {} as Record<string, Record<number, PriceSnapshot>>
    );
  }, [data]);

  const timestampsData = useMemo(() => {
    return Object.entries(priceData).reduce(
      (acc, [address, prices]) => {
        const timestamps = Object.keys(prices)
          .map(Number)
          .sort((a, b) => a - b);
        acc[address] = timestamps;
        return acc;
      },
      {} as Record<string, number[]>
    );
  }, [priceData]);

  return {
    prices: data,
    priceData,
    timestampsData,
  };
}
