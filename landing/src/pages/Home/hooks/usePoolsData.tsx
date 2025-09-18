import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { getServerUrl } from "config/backend";
import { PerformanceInfo, useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import { getSubsquidGraphClient } from "lib/subgraph";
import { ARBITRUM, AVALANCHE } from "sdk/configs/chainIds";
import { MarketInfo } from "sdk/types/subsquid";

export type PoolsData = {
  glvApy: number;
  gmApy: number;
  totalLiquidity: bigint;
  openInterest: bigint;
  totalDepositedUsers: number;
};

// combined by the requests used
export function usePoolsData(): Partial<PoolsData> {
  const { data: arbitrumPerformance } = usePerformanceByChainId(ARBITRUM);
  const { data: avalanchePerformance } = usePerformanceByChainId(AVALANCHE);
  const { data: arbitrumApys } = useApysByChainId(ARBITRUM);
  const { data: avalancheApys } = useApysByChainId(AVALANCHE);
  const { data: positionStats } = usePositionStats();
  const { data: marketInfos } = useMarketInfos();

  const { sortedAggregatedMarketInfos, totalLiquidity, openInterest } = marketInfos ?? {};

  const glvApy = useMemo(() => {
    if (arbitrumPerformance && avalanchePerformance && arbitrumApys && avalancheApys) {
      let result = 0;
      const aggregatedPerformance = [...arbitrumPerformance, ...avalanchePerformance];
      for (const performance of aggregatedPerformance) {
        const performanceApy = parseFloat(performance.uniswapV2Performance);
        if (performance.entity === "Glv" && performanceApy > result) {
          result = performanceApy;
        }
      }
      if (result < 0.1) {
        const glvApys = {
          ...arbitrumApys.glvs,
          ...avalancheApys.glvs,
        };
        for (const glv of glvApys) {
          if (glv.apy > result) {
            result = glv.apy;
          }
        }
      }
      return { glvApy: result };
    }
    return {};
  }, [arbitrumPerformance, avalanchePerformance, arbitrumApys, avalancheApys]);

  // Helper - aggregated performance from arbitrum and avalanche for optimization
  const aggregatedPerformance = useMemo(() => {
    if (!arbitrumPerformance || !avalanchePerformance) {
      return null;
    }
    const result: {
      arbitrum: Record<string, PerformanceInfo & { performanceApy: number }>;
      avalanche: Record<string, PerformanceInfo & { performanceApy: number }>;
    } = {
      arbitrum: {},
      avalanche: {},
    };
    for (const performance of arbitrumPerformance) {
      if (performance.entity === "Market") {
        const performanceApy = parseFloat(performance.uniswapV2Performance);
        result.arbitrum[performance.address] = { ...performance, performanceApy };
      }
    }
    for (const performance of avalanchePerformance) {
      if (performance.entity === "Market") {
        const performanceApy = parseFloat(performance.uniswapV2Performance);
        result.avalanche[performance.address] = { ...performance, performanceApy };
      }
    }
    return result;
  }, [arbitrumPerformance, avalanchePerformance]);

  // GM APY
  const gmApy = useMemo(() => {
    if (sortedAggregatedMarketInfos && aggregatedPerformance && arbitrumApys && avalancheApys) {
      let gmApy = 0;
      for (const marketIndex in sortedAggregatedMarketInfos) {
        const market = sortedAggregatedMarketInfos[marketIndex];
        const marketApy =
          market.chainId === ARBITRUM
            ? aggregatedPerformance.arbitrum[market.id]?.performanceApy ?? 0
            : aggregatedPerformance.avalanche[market.id]?.performanceApy ?? 0;
        if (Number(marketIndex) < 20 && marketApy > gmApy) {
          gmApy = marketApy;
        }
      }
      // If the GM APY is less than 0.1, we need to calculate the GM APY based on the market APYs
      if (gmApy <= 0.1) {
        for (const market of sortedAggregatedMarketInfos) {
          const marketApy =
            market.chainId === ARBITRUM
              ? arbitrumApys.markets[market.id]?.apy ?? 0
              : avalancheApys.markets[market.id]?.apy ?? 0;
          if (marketApy > gmApy) {
            gmApy = marketApy;
          }
        }
      }
      return { gmApy };
    }
    return {};
  }, [sortedAggregatedMarketInfos, aggregatedPerformance, arbitrumApys, avalancheApys]);
  const result: Partial<PoolsData> = {
    ...gmApy,
    ...glvApy,
    totalLiquidity: totalLiquidity,
    openInterest: positionStats && openInterest ? positionStats.openInterest + openInterest : undefined,
    totalDepositedUsers: marketInfos?.totalDepositedUsers,
  };
  return result;
}

function useApysByChainId(chainId: number) {
  const fetcher = useOracleKeeperFetcher(chainId);
  return useSWR(["apys", chainId], async () => {
    const res = await fetcher.fetchApys("90d");
    return res;
  });
}

const marketInfoQuery = {
  query: gql`
    query MarketInfos {
      marketInfos(orderBy: poolValue_DESC, where: { isDisabled_eq: false }) {
        poolValue
        longOpenInterestUsd
        shortOpenInterestUsd
        id
      }
      platformStats {
        depositedUsers
      }
    }
  `,
};

function useMarketInfos() {
  const arbitrumClient = getSubsquidGraphClient(ARBITRUM)!;
  const avalancheClient = getSubsquidGraphClient(AVALANCHE)!;
  return useSWR(["marketInfos"], async () => {
    const arbitrumReq = arbitrumClient?.query(marketInfoQuery);
    const avalancheReq = avalancheClient?.query(marketInfoQuery);
    const [arbitrumRes, avalancheRes] = await Promise.all([arbitrumReq, avalancheReq]);
    const arbitrumMarketInfos = arbitrumRes.data?.marketInfos;
    const avalancheMarketInfos = avalancheRes.data?.marketInfos;
    const arbitrumPlatformStats = arbitrumRes.data?.platformStats[0];
    const avalanchePlatformStats = avalancheRes.data?.platformStats[0];
    let totalLiquidity = 0n;
    let openInterest = 0n;
    const sortedAggregatedMarketInfos: (MarketInfo & { chainId: number })[] = [];
    let arbIndex = 0;
    let avaxIndex = 0;
    while (arbIndex < arbitrumMarketInfos.length || avaxIndex < avalancheMarketInfos.length) {
      const arbMarketInfo = arbitrumMarketInfos[arbIndex];
      const avaxMarketInfo = avalancheMarketInfos[avaxIndex];
      const arbPoolValue = arbMarketInfo ? BigInt(arbMarketInfo.poolValue) : null;
      const avaxPoolValue = avaxMarketInfo ? BigInt(avaxMarketInfo.poolValue) : null;
      if ((arbPoolValue ?? -1n) > (avaxPoolValue ?? -1n)) {
        sortedAggregatedMarketInfos.push({ ...arbMarketInfo, chainId: ARBITRUM });
        openInterest +=
          BigInt(arbMarketInfo.longOpenInterestUsd ?? 0n) + BigInt(arbMarketInfo.shortOpenInterestUsd ?? 0n);
        totalLiquidity += BigInt(arbMarketInfo.poolValue);
        arbIndex++;
      } else {
        sortedAggregatedMarketInfos.push({ ...avaxMarketInfo, chainId: AVALANCHE });
        openInterest +=
          BigInt(avaxMarketInfo.longOpenInterestUsd ?? 0n) + BigInt(avaxMarketInfo.shortOpenInterestUsd ?? 0n);
        totalLiquidity += BigInt(avaxMarketInfo.poolValue);
        avaxIndex++;
      }
    }
    return {
      sortedAggregatedMarketInfos,
      totalLiquidity,
      openInterest,
      totalDepositedUsers: arbitrumPlatformStats.depositedUsers + avalanchePlatformStats.depositedUsers,
    };
  });
}

function usePerformanceByChainId(chainId: number) {
  const fetcher = useOracleKeeperFetcher(chainId);
  return useSWR(["performance", chainId], async () => {
    const res = await fetcher.fetchPerformance("90d");
    return res;
  });
}

function usePositionStats() {
  return useSWR(
    ["positionStats"],
    async () => {
      const arbitrumReq = fetchPositionStatsByChainId(ARBITRUM);
      const avalancheReq = fetchPositionStatsByChainId(AVALANCHE);
      const [arbitrumRes, avalancheRes] = await Promise.all([arbitrumReq, avalancheReq]);
      return {
        openInterest:
          BigInt(arbitrumRes.totalLongPositionSizes) +
          BigInt(arbitrumRes.totalShortPositionSizes) +
          BigInt(avalancheRes.totalLongPositionSizes) +
          BigInt(avalancheRes.totalShortPositionSizes),
      };
    },
    {}
  );
}

function fetchPositionStatsByChainId(chainId: number) {
  const url = getServerUrl(chainId, "/position_stats");
  return fetch(url).then((res) => res.json());
}
