import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { defined } from "lib/guards";
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
      id
      minPrice
      maxPrice
      timestamp
      isSnapshot
      snapshotTimestamp
      token
      type
    }
  }
`;

type PriceQuery = {
  prices: PriceSnapshot[];
};

type PriceData = {
  [tokenAddress: string]: {
    [snapshotTimestamp: number]: PriceSnapshot;
  };
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
    ["usePrices", period.periodStart, period.periodEnd, tokenAddresses?.join(",")],
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        const res = await client?.query<PriceQuery>({
          query: PRICES_QUERY,
          variables: { fromTimestamp: period.periodStart, tokenAddresses },
          fetchPolicy: "no-cache",
        });

        const pricesByToken = res?.data?.prices.reduce(
          (acc, price) => {
            acc[price.token] = (acc[price.token] || []).concat(price);
            return acc;
          },
          {} as Record<string, PriceSnapshot[]>
        );

        const priceData = Object.entries(pricesByToken || {}).reduce(
          (acc, [token, prices]) => {
            acc[token] = prices.reduce(
              (acc, price) => {
                acc[price.snapshotTimestamp] = price;
                return acc;
              },
              {} as Record<number, PriceSnapshot>
            );
            return acc;
          },
          {} as Record<string, Record<number, PriceSnapshot>>
        );

        return priceData;
      },
    }
  );

  const glvPerformanceSnapshots = useMemo(() => getPoolsPerformanceSnapshots(glvData, data), [data, glvData]);
  const gmPerformanceSnapshots = useMemo(() => getPoolsPerformanceSnapshots(gmData, data), [data, gmData]);

  const glvPerformance = useMemo(() => {
    return getPoolsPerformance(glvData, data);
  }, [glvData, data]);

  const gmPerformance = useMemo(() => {
    return getPoolsPerformance(gmData, data);
  }, [gmData, data]);

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
  priceData: PriceData | undefined
): PerformanceSnapshotsData => {
  if (!poolsData || !priceData) {
    return {};
  }

  return Object.entries(poolsData)
    .map(([address, pool]) => {
      const performanceSnapshots = buildPerformanceSnapshots({
        longTokenPrices: priceData?.[pool.longTokenAddress] || {},
        shortTokenPrices: priceData?.[pool.shortTokenAddress] || {},
        poolPrices: priceData?.[address] || {},
      });

      return {
        address,
        performanceSnapshots,
      };
    })
    .reduce(
      (acc, curr) => {
        acc[curr.address] = curr.performanceSnapshots;
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
  priceData: PriceData | undefined
): PerformanceData => {
  if (!poolsData || !priceData) {
    return {};
  }

  return Object.entries(poolsData)
    .map(([address, pool]) => {
      const performance = calculatePoolPerformance({
        longTokenPrices: priceData?.[pool.longTokenAddress] || {},
        shortTokenPrices: priceData?.[pool.shortTokenAddress] || {},
        poolPrices: priceData?.[address] || {},
      });

      if (!performance) {
        return undefined;
      }

      return {
        address,
        performance,
      };
    })
    .filter(defined)
    .reduce((acc, curr) => {
      acc[curr.address] = curr.performance;
      return acc;
    }, {} as PerformanceData);
};
