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

  // GLV APY
  const glvApy = useMemo(() => {
    if (arbitrumPerformance && avalanchePerformance && arbitrumApys && avalancheApys) {
      let result = 0;
      const aggregatedPerformance = [...arbitrumPerformance, ...avalanchePerformance];
      for (const performance of aggregatedPerformance) {
        const performanceApy = Number.parseFloat(performance.uniswapV2Performance);
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
        const performanceApy = Number.parseFloat(performance.uniswapV2Performance);
        result.arbitrum[performance.address] = { ...performance, performanceApy };
      }
    }
    for (const performance of avalanchePerformance) {
      if (performance.entity === "Market") {
        const performanceApy = Number.parseFloat(performance.uniswapV2Performance);
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
            ? aggregatedPerformance.arbitrum[market.id].performanceApy
            : aggregatedPerformance.avalanche[market.id].performanceApy;
        if (Number(marketIndex) < 20 && marketApy > gmApy) {
          gmApy = marketApy;
        }
      }
      // If the GM APY is less than 0.1, we need to calculate the GM APY based on the market APYs
      if (gmApy <= 0.1) {
        for (const market of sortedAggregatedMarketInfos) {
          const marketApy =
            market.chainId === ARBITRUM ? arbitrumApys.markets[market.id].apy : avalancheApys.markets[market.id].apy;
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
    openInterest: positionStats && openInterest ? positionStats?.openInterest + openInterest : undefined,
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

function useMarketInfos() {
  const arbitrumClient = getSubsquidGraphClient(ARBITRUM)!;
  const avalancheClient = getSubsquidGraphClient(AVALANCHE)!;
  return useSWR(["marketInfos"], async () => {
    const query = gql`
      query MarketInfos {
        marketInfos(orderBy: poolValue_DESC, where: { isDisabled_eq: false }) {
          poolValue
          longOpenInterestUsd
          shortOpenInterestUsd
          id
        }
      }
    `;
    const arbitrumReq = arbitrumClient?.query({
      query,
    });
    const avalancheReq = avalancheClient?.query({
      query,
    });
    const [arbitrumRes, avalancheRes] = await Promise.all([arbitrumReq, avalancheReq]);
    const arbitrumMarketInfos = arbitrumRes.data?.marketInfos;
    const avalancheMarketInfos = avalancheRes.data?.marketInfos;
    let totalLiquidity = 0n;
    let openInterest = 0n;
    const sortedAggregatedMarketInfos: (MarketInfo & { chainId: number })[] = [];
    let arbIndex = 0;
    let avaxIndex = 0;
    while (arbIndex < arbitrumMarketInfos.length || avaxIndex < avalancheMarketInfos.length) {
      const arbPoolValue = BigInt(arbitrumMarketInfos[arbIndex]?.poolValue ?? 0n);
      const avaxPoolValue = BigInt(avalancheMarketInfos[avaxIndex]?.poolValue ?? 0n);
      if (arbPoolValue > avaxPoolValue) {
        sortedAggregatedMarketInfos.push({ ...arbitrumMarketInfos[arbIndex], chainId: ARBITRUM });
        arbIndex++;
      } else {
        sortedAggregatedMarketInfos.push({ ...avalancheMarketInfos[avaxIndex], chainId: AVALANCHE });
        avaxIndex++;
      }
      totalLiquidity += arbPoolValue + avaxPoolValue;
      openInterest +=
        BigInt(arbitrumMarketInfos[arbIndex]?.longOpenInterestUsd ?? 0n) +
        BigInt(avalancheMarketInfos[avaxIndex]?.shortOpenInterestUsd ?? 0n);
    }
    return { sortedAggregatedMarketInfos, totalLiquidity, openInterest };
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
