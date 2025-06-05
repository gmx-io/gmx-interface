import { defined } from "lib/guards";
import { bigintToNumber } from "lib/numbers";
import { USD_DECIMALS } from "sdk/configs/factors";

import { getMidPrice } from "../tokens";

export type PriceSnapshot = {
  minPrice: string;
  maxPrice: string;
  snapshotTimestamp: number;
  token: string;
  type: string;
};

export type PerformanceSnapshot = {
  performance: number;
  snapshotTimestamp: number;
};

export function buildPerformanceSnapshots({
  longTokenPrices,
  shortTokenPrices,
  poolPrices,
  timestamps,
}: {
  longTokenPrices: Record<number, PriceSnapshot>;
  shortTokenPrices: Record<number, PriceSnapshot>;
  poolPrices: Record<number, PriceSnapshot>;
  timestamps: number[];
}): PerformanceSnapshot[] {
  const startTimestamp = findPerformanceTimestamp({
    timestamps,
    longTokenPrices,
    shortTokenPrices,
    poolPrices,
    type: "start",
  });

  if (!startTimestamp) {
    return [];
  }

  const tokenAStartPrice = getTokenPrice(longTokenPrices, startTimestamp);
  const tokenBStartPrice = getTokenPrice(shortTokenPrices, startTimestamp);
  const poolStartPrice = getTokenPrice(poolPrices, startTimestamp);

  if (!tokenAStartPrice || !tokenBStartPrice || !poolStartPrice) {
    return [];
  }

  const performanceSnapshots: PerformanceSnapshot[] = timestamps
    .slice(timestamps.indexOf(startTimestamp))
    .map((timestamp) => {
      const tokenAEndPrice = getTokenPrice(longTokenPrices, timestamp);
      const tokenBEndPrice = getTokenPrice(shortTokenPrices, timestamp);
      const poolEndPrice = getTokenPrice(poolPrices, timestamp);

      if (!tokenAEndPrice || !tokenBEndPrice || !poolEndPrice) {
        return null;
      }

      const performance = calculatePerformance({
        poolStartPrice,
        poolEndPrice,
        tokenAStartPrice,
        tokenBStartPrice,
        tokenAEndPrice,
        tokenBEndPrice,
      });

      return {
        performance,
        snapshotTimestamp: timestamp,
      };
    })
    .filter(defined);

  return performanceSnapshots;
}

export function calculatePoolPerformance({
  longTokenPrices,
  shortTokenPrices,
  poolPrices,
  timestamps,
}: {
  longTokenPrices: Record<number, PriceSnapshot>;
  shortTokenPrices: Record<number, PriceSnapshot>;
  poolPrices: Record<number, PriceSnapshot>;
  timestamps: number[];
}): number | undefined {
  const startTimestamp = findPerformanceTimestamp({
    timestamps,
    longTokenPrices,
    shortTokenPrices,
    poolPrices,
    type: "start",
  });
  const endTimestamp = findPerformanceTimestamp({
    timestamps,
    longTokenPrices,
    shortTokenPrices,
    poolPrices,
    type: "end",
  });

  if (!startTimestamp || !endTimestamp) {
    return undefined;
  }

  const tokenAStartPrice = getTokenPrice(longTokenPrices, startTimestamp);
  const tokenBStartPrice = getTokenPrice(shortTokenPrices, startTimestamp);
  const poolStartPrice = getTokenPrice(poolPrices, startTimestamp);

  const tokenAEndPrice = getTokenPrice(longTokenPrices, endTimestamp);
  const tokenBEndPrice = getTokenPrice(shortTokenPrices, endTimestamp);
  const poolEndPrice = getTokenPrice(poolPrices, endTimestamp);

  if (
    !tokenAStartPrice ||
    !tokenBStartPrice ||
    !poolStartPrice ||
    !tokenAEndPrice ||
    !tokenBEndPrice ||
    !poolEndPrice
  ) {
    return 0;
  }

  const performance = calculatePerformance({
    poolStartPrice,
    poolEndPrice,
    tokenAStartPrice,
    tokenBStartPrice,
    tokenAEndPrice,
    tokenBEndPrice,
  });

  return calculateAnnualizedPerformance(performance, { startTimestamp, endTimestamp });
}

const getTokenPrice = (prices: Record<number, PriceSnapshot>, timestamp: number) => {
  if (!prices[timestamp]) {
    return undefined;
  }

  const midPrice = getMidPrice({
    minPrice: BigInt(prices[timestamp].minPrice),
    maxPrice: BigInt(prices[timestamp].maxPrice),
  });

  return bigintToNumber(midPrice, USD_DECIMALS);
};

const findPerformanceTimestamp = ({
  timestamps,
  longTokenPrices,
  shortTokenPrices,
  poolPrices,
  type,
}: {
  timestamps: number[];
  longTokenPrices: Record<number, PriceSnapshot>;
  shortTokenPrices: Record<number, PriceSnapshot>;
  poolPrices: Record<number, PriceSnapshot>;
  type: "start" | "end";
}) => {
  if (type === "start") {
    return timestamps.find(
      (timestamp) => longTokenPrices[timestamp] && shortTokenPrices[timestamp] && poolPrices[timestamp]
    );
  }

  return timestamps.findLast(
    (timestamp) => longTokenPrices[timestamp] && shortTokenPrices[timestamp] && poolPrices[timestamp]
  );
};

/*
  TokenA_S = Token A Starting Price
  TokenB_S = Token B Starting Price
  TokenA_E = Token A Ending Price
  TokenB_E = Token B Ending Price
  Benchmark_S = Benchmark Investment Starting Price
  Benchmark_E = Benchmark Investment Ending Price
  Benchmark_E = Benchmark_S * SQRT( (TokenA_E * TokenB_E)/(TokenA_S * TokenB_S) )

  Pool Performance = (P_E - P_S)/P_S
  Benchmark Performance = (B_E - B_S)/B_S
  Performance = (Pool Performance - Benchmark Performance)
*/
export const calculatePerformance = ({
  poolStartPrice,
  poolEndPrice,
  tokenAStartPrice,
  tokenBStartPrice,
  tokenAEndPrice,
  tokenBEndPrice,
}: {
  poolStartPrice: number;
  poolEndPrice: number;
  tokenAStartPrice: number;
  tokenBStartPrice: number;
  tokenAEndPrice: number;
  tokenBEndPrice: number;
}) => {
  const benchmarkStartPrice = poolStartPrice;
  const benchmarkEndPrice =
    benchmarkStartPrice * Math.sqrt((tokenAEndPrice * tokenBEndPrice) / (tokenAStartPrice * tokenBStartPrice));

  const poolPerformance = (poolEndPrice - poolStartPrice) / poolStartPrice;
  const benchmarkPerformance = (benchmarkEndPrice - benchmarkStartPrice) / benchmarkStartPrice;

  return roundPerformance(poolPerformance - benchmarkPerformance);
};

const calculateAnnualizedPerformance = (
  performance: number,
  { startTimestamp, endTimestamp }: { startTimestamp: number; endTimestamp: number }
) => {
  const days = Math.floor((endTimestamp - startTimestamp) / (60 * 60 * 24));
  return (performance / days) * 365;
};

const ROUND_PRECISION = 1000000;
const roundPerformance = (performance: number) => {
  return Math.round(performance * ROUND_PRECISION) / ROUND_PRECISION;
};

export const formatPerformanceBps = (performance: number): string => {
  return Number((performance * 100).toFixed(2)) + "%";
};
