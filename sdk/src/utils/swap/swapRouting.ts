import { MarketInfo, MarketsInfoData } from "types/markets";
import { MarketEdge, SwapEstimator, SwapRoute } from "types/trade";
import { MarketsGraph } from "types/trade";
import { bigMath } from "utils/bigmath";
import { getAvailableUsdLiquidityForCollateral } from "utils/markets";
import { getMaxSwapPathLiquidity, getSwapCapacityUsd, getSwapStats } from "./swapStats";
import { SWAP_GRAPH_MAX_MARKETS_PER_TOKEN } from "configs/markets";

export function limitMarketsPerTokens(
  markets: MarketInfo[],
  limit: number = SWAP_GRAPH_MAX_MARKETS_PER_TOKEN
): MarketInfo[] {
  const marketsByTokens: { [token: string]: MarketInfo[] } = {};

  for (const market of markets) {
    if (market.isSameCollaterals || market.isDisabled) {
      continue;
    }

    const { longTokenAddress, shortTokenAddress } = market;

    marketsByTokens[longTokenAddress] = marketsByTokens[longTokenAddress] || [];
    marketsByTokens[longTokenAddress].push(market);

    marketsByTokens[shortTokenAddress] = marketsByTokens[shortTokenAddress] || [];
    marketsByTokens[shortTokenAddress].push(market);
  }

  const resultMarkets: { [marketAddress: string]: MarketInfo } = {};

  const tokenAddresses = Object.keys(marketsByTokens);

  for (const tokenAddress of tokenAddresses) {
    const markets = marketsByTokens[tokenAddress];

    const sortedMarkets = markets.sort((m1, m2) => {
      const liq1 = getAvailableUsdLiquidityForCollateral(m1, m1.longTokenAddress === tokenAddress);
      const cap1 = getSwapCapacityUsd(m1, m1.longTokenAddress === tokenAddress);

      const limit1 = bigMath.min(liq1, cap1);

      const liq2 = getAvailableUsdLiquidityForCollateral(m2, m2.longTokenAddress === tokenAddress);
      const cap2 = getSwapCapacityUsd(m2, m2.longTokenAddress === tokenAddress);

      const limit2 = bigMath.min(liq2, cap2);

      return Number(limit2 - limit1);
    });

    let marketsPerTokenCount = 0;

    for (const market of sortedMarkets) {
      if (marketsPerTokenCount >= limit) {
        break;
      }

      if (resultMarkets[market.marketTokenAddress]) {
        marketsPerTokenCount++;
        continue;
      }

      marketsPerTokenCount++;
      resultMarkets[market.marketTokenAddress] = market;
    }
  }

  return Object.values(resultMarkets);
}

export function getMarketsGraph(markets: MarketInfo[]): MarketsGraph {
  const graph: MarketsGraph = {
    abjacencyList: {},
    edges: [],
  };

  const limitedMarkets = limitMarketsPerTokens(markets);

  for (const market of limitedMarkets) {
    const { longTokenAddress, shortTokenAddress, marketTokenAddress, isSameCollaterals, isDisabled } = market;

    if (isSameCollaterals || isDisabled) {
      continue;
    }

    const longShortEdge: MarketEdge = {
      marketInfo: market,
      marketAddress: marketTokenAddress,
      from: longTokenAddress,
      to: shortTokenAddress,
    };

    const shortLongEdge: MarketEdge = {
      marketInfo: market,
      marketAddress: marketTokenAddress,
      from: shortTokenAddress,
      to: longTokenAddress,
    };

    graph.abjacencyList[longTokenAddress] = graph.abjacencyList[longTokenAddress] || [];
    graph.abjacencyList[longTokenAddress].push(longShortEdge);
    graph.abjacencyList[shortTokenAddress] = graph.abjacencyList[shortTokenAddress] || [];
    graph.abjacencyList[shortTokenAddress].push(shortLongEdge);

    graph.edges.push(longShortEdge, shortLongEdge);
  }

  return graph;
}

export const createSwapEstimator = (marketsInfoData: MarketsInfoData): SwapEstimator => {
  return (e: MarketEdge, usdIn: bigint) => {
    const marketInfo = marketsInfoData[e.marketAddress];

    const swapStats = getSwapStats({
      marketInfo,
      usdIn,
      tokenInAddress: e.from,
      tokenOutAddress: e.to,
      shouldApplyPriceImpact: true,
    });

    const isOutLiquidity = swapStats?.isOutLiquidity;
    const isOutCapacity = swapStats?.isOutCapacity;
    const usdOut = swapStats?.usdOut;

    if (usdOut === undefined || isOutLiquidity || isOutCapacity) {
      return {
        usdOut: 0n,
      };
    }

    return {
      usdOut,
    };
  };
};

export function getBestSwapPath(routes: SwapRoute[], usdIn: bigint, estimator: SwapEstimator) {
  if (routes.length === 0) {
    return undefined;
  }

  let bestPath = routes[0].path;
  let bestUsdOut = 0n;

  for (const route of routes) {
    try {
      const pathUsdOut = route.edges.reduce((prevUsdOut, edge) => {
        const { usdOut } = estimator(edge, prevUsdOut);
        return usdOut;
      }, usdIn);

      if (pathUsdOut > bestUsdOut) {
        bestPath = route.path;
        bestUsdOut = pathUsdOut;
      }
    } catch (e) {
      continue;
    }
  }

  return bestPath;
}

export function findAllPaths(
  marketsInfoData: MarketsInfoData,
  graph: MarketsGraph,
  from: string,
  to: string,
  maxDepth = 3
): SwapRoute[] | undefined {
  const routes: SwapRoute[] = [];

  const edges = graph.abjacencyList[from];

  if (!edges?.length) {
    return undefined;
  }

  for (const e of edges) {
    dfs(e, [], [], {});
  }

  function dfs(edge: MarketEdge, path: string[], pathEdges: MarketEdge[], visited: { [edgeId: string]: boolean }) {
    // avoid too deep paths and cycles
    if (path.length >= maxDepth || visited[edge.marketAddress]) {
      return;
    }

    visited[edge.marketAddress] = true;
    pathEdges.push(edge);
    path.push(edge.marketAddress);

    if (edge.to === to) {
      routes.push({
        edges: pathEdges,
        path: path,
        liquidity: getMaxSwapPathLiquidity({ marketsInfoData, swapPath: path, initialCollateralAddress: from }),
      });
      return;
    }

    const edges = graph.abjacencyList[edge.to];

    if (!edges?.length) {
      return;
    }

    for (const e of edges) {
      dfs(e, [...path], [...pathEdges], { ...visited });
    }
  }

  return routes;
}
