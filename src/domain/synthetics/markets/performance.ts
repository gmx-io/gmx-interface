import { defined } from "lib/guards";
import { bigintToNumber } from "lib/numbers";
import { USD_DECIMALS } from "sdk/configs/factors";

export type PriceSnapshot = {
  id: string;
  minPrice: string;
  maxPrice: string;
  timestamp: number;
  isSnapshot: boolean;
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
}: {
  longTokenPrices: Record<number, PriceSnapshot>;
  shortTokenPrices: Record<number, PriceSnapshot>;
  poolPrices: Record<number, PriceSnapshot>;
}): PerformanceSnapshot[] {
  const timestamps = Object.keys(poolPrices).map(Number).sort((a, b) => a - b);
  const startTimestamp = findStartTimestamp({
    timestamps,
    longTokenPrices,
    shortTokenPrices,
    poolPrices,
  });

  if (!startTimestamp) {
    return [];
  }

  const tokenAStartPrice = getTokenPrice(longTokenPrices, startTimestamp);
  const tokenBStartPrice = getTokenPrice(shortTokenPrices, startTimestamp);
  const poolStartPrice = getTokenPrice(poolPrices, startTimestamp);

  const performanceSnapshots: PerformanceSnapshot[] = timestamps.slice(timestamps.indexOf(startTimestamp))
    .map((timestamp) => {
      const longTokenPrice = longTokenPrices[timestamp];
      const shortTokenPrice = shortTokenPrices[timestamp];
      const poolPrice = poolPrices[timestamp];

      if (!longTokenPrice || !shortTokenPrice || !poolPrice) {
        return null;
      }

      const tokenAEndPrice = getTokenPrice(longTokenPrices, timestamp);
      const tokenBEndPrice = getTokenPrice(shortTokenPrices, timestamp);
      const poolEndPrice = getTokenPrice(poolPrices, timestamp);

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
}: {
  longTokenPrices: Record<number, PriceSnapshot>;
  shortTokenPrices: Record<number, PriceSnapshot>;
  poolPrices: Record<number, PriceSnapshot>;
}): number | undefined {
  const timestamps = Object.keys(poolPrices).map(Number).sort((a, b) => a - b);
  const startTimestamp = findStartTimestamp({
    timestamps,
    longTokenPrices,
    shortTokenPrices,
    poolPrices,
  });
  const endTimestamp = timestamps[timestamps.length - 1];

  if (!startTimestamp || !endTimestamp) {
    return undefined;
  }

  const tokenAStartPrice = getTokenPrice(longTokenPrices, startTimestamp);
  const tokenBStartPrice = getTokenPrice(shortTokenPrices, startTimestamp);
  const poolStartPrice = getTokenPrice(poolPrices, startTimestamp);

  const tokenAEndPrice = getTokenPrice(longTokenPrices, endTimestamp);
  const tokenBEndPrice = getTokenPrice(shortTokenPrices, endTimestamp);
  const poolEndPrice = getTokenPrice(poolPrices, endTimestamp);

  return calculatePerformance({
    poolStartPrice,
    poolEndPrice,
    tokenAStartPrice,
    tokenBStartPrice,
    tokenAEndPrice,
    tokenBEndPrice,
  });
}

const getTokenPrice = (prices: Record<number, PriceSnapshot>, timestamp: number) => {
  return bigintToNumber((BigInt(prices[timestamp].minPrice) + BigInt(prices[timestamp].maxPrice)) / 2n, USD_DECIMALS);
}

const findStartTimestamp = ({ timestamps, longTokenPrices, shortTokenPrices, poolPrices }: { timestamps: number[], 
  longTokenPrices: Record<number, PriceSnapshot>;
  shortTokenPrices: Record<number, PriceSnapshot>;
  poolPrices: Record<number, PriceSnapshot>;
}) => {
  return timestamps.find((timestamp) => longTokenPrices[timestamp] && shortTokenPrices[timestamp] && poolPrices[timestamp]);
}

/*
  TokenA_S = Token A Starting Price
  TokenB_S = Token B Starting Price
  TokenA_E = Token A Ending Price
  TokenB_E = Token B Ending Price
  Benchmark_S = Benchmark Investment Starting Price
  Benchmark_E = Benchmark Investment Ending Price
  Benchmark_E = Benchmark_S * SQRT( (TokenA_E * TokenB_E)/(TokenA_S * TokenB_S) )

  Pool Performance = (P_E - P_S)/P_S * 100
  Benchmark Performance = (B_E - B_S)/B_S * 100
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

const ROUND_PRECISION = 1000000;
const roundPerformance = (performance: number) => {
  return Math.round(performance * ROUND_PRECISION) / ROUND_PRECISION;
};
