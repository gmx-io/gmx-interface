import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/subgraph";

import { PerformanceSnapshot, PriceSnapshot, buildPerformanceSnapshots, calculatePoolPerformance } from "./performance";
import { GlvInfoData, MarketsInfoData } from "./types";
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

export function useGmGlvPerformance({
  chainId,
  period,
  gmData,
  glvData,
  tokenAddresses,
}: {
  chainId: number;
  period: Period;
  gmData: MarketsInfoData | undefined;
  glvData: GlvInfoData | undefined;
  tokenAddresses?: string[];
}) {
  const { data } = useSWR<PriceData | undefined>(
    ["useGmGlvPerformance", period.periodStart, period.periodEnd, tokenAddresses?.join(",")],
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

  const glvPerformanceSnapshots = useMemo(
    () => getPoolsPerformanceSnapshots(glvData, priceData, timestampsData),
    [priceData, glvData, timestampsData]
  );
  const gmPerformanceSnapshots = useMemo(
    () => getPoolsPerformanceSnapshots(gmData, priceData, timestampsData),
    [priceData, gmData, timestampsData]
  );

  const glvPerformance = useMemo(
    () => getPoolsPerformance(glvData, priceData, timestampsData),
    [priceData, glvData, timestampsData]
  );
  const gmPerformance = useMemo(
    () => getPoolsPerformance(gmData, priceData, timestampsData),
    [priceData, gmData, timestampsData]
  );

  return {
    glvPerformanceSnapshots,
    gmPerformanceSnapshots,
    glvPerformance,
    gmPerformance,
    prices: data,
  };
}

export type PerformanceSnapshotsData = {
  [address: string]: PerformanceSnapshot[];
};

const getPoolsPerformanceSnapshots = (
  poolsData:
    | Record<
        string,
        {
          longTokenAddress: string;
          shortTokenAddress: string;
        }
      >
    | undefined,
  priceData: PriceDataMapped,
  timestampsData: Record<string, number[]>
): PerformanceSnapshotsData => {
  if (!poolsData) {
    return {};
  }

  return Object.entries(poolsData).reduce(
    (acc, curr) => {
      const [address, pool] = curr;
      const performanceSnapshots = buildPerformanceSnapshots({
        longTokenPrices: priceData?.[pool.longTokenAddress] || {},
        shortTokenPrices: priceData?.[pool.shortTokenAddress] || {},
        poolPrices: priceData?.[address] || {},
        timestamps: timestampsData[address] || [],
      });
      acc[address] = performanceSnapshots;
      return acc;
    },
    {} as Record<string, PerformanceSnapshot[]>
  );
};

export type PerformanceData = {
  [address: string]: number;
};

const getPoolsPerformance = (
  poolsData:
    | Record<
        string,
        {
          longTokenAddress: string;
          shortTokenAddress: string;
        }
      >
    | undefined,
  priceData: PriceDataMapped,
  timestampsData: Record<string, number[]>
): PerformanceData => {
  if (!poolsData) {
    return {};
  }

  return Object.entries(poolsData).reduce((acc, curr) => {
    const [address, pool] = curr;
    const performance = calculatePoolPerformance({
      longTokenPrices: priceData[pool.longTokenAddress] || {},
      shortTokenPrices: priceData[pool.shortTokenAddress] || {},
      poolPrices: priceData[address] || {},
      timestamps: timestampsData[address] || [],
    });

    if (!performance) {
      return acc;
    }

    acc[address] = performance;
    return acc;
  }, {} as PerformanceData);
};
