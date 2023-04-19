import { Market, MarketsInfoData } from "domain/synthetics/markets";
import { MarketEdge, MarketsGraph, SwapEstimator } from "../types";
import { BigNumber } from "ethers";
import { getSwapStats } from "./swapStats";
import { VirtualInventoryForSwapsData } from "domain/synthetics/fees";

export function getMarketsGraph(markets: Market[]): MarketsGraph {
  const graph: MarketsGraph = {
    abjacencyList: {},
    edges: [],
  };

  for (const market of markets) {
    const { longTokenAddress, shortTokenAddress, marketTokenAddress, isSameCollaterals } = market;

    if (isSameCollaterals) {
      continue;
    }

    const longShortEdge: MarketEdge = {
      marketAddress: marketTokenAddress,
      from: longTokenAddress,
      to: shortTokenAddress,
    };

    const shortLongEdge: MarketEdge = {
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

export const createSwapEstimator = (
  marketsInfoData: MarketsInfoData,
  virtualInventoryForSwaps: VirtualInventoryForSwapsData
): SwapEstimator => {
  return (e: MarketEdge, usdIn: BigNumber) => {
    const marketInfo = marketsInfoData[e.marketAddress];

    const swapStats = getSwapStats({
      marketInfo,
      usdIn,
      tokenInAddress: e.from,
      tokenOutAddress: e.to,
      shouldApplyPriceImpact: true,
      virtualInventoryForSwaps,
    });

    const isOutLiquidity = swapStats?.isOutLiquidity;
    const usdOut = swapStats?.usdOut;

    if (!usdOut || isOutLiquidity) {
      return {
        usdOut: BigNumber.from(0),
      };
    }

    return {
      usdOut,
    };
  };
};

export function getBestSwapPath(paths: MarketEdge[][], usdIn: BigNumber, estimator: SwapEstimator) {
  if (paths.length === 0) {
    return undefined;
  }

  let bestPath = paths[0];
  let bestUsdOut = BigNumber.from(0);

  for (const path of paths) {
    try {
      const pathUsdOut = path.reduce((prevUsdOut, edge) => {
        const { usdOut } = estimator(edge, prevUsdOut);
        return usdOut;
      }, usdIn);

      if (pathUsdOut.gt(bestUsdOut)) {
        bestPath = path;
        bestUsdOut = pathUsdOut;
      }
    } catch (e) {
      continue;
    }
  }

  return bestPath;
}

export function findAllPaths(graph: MarketsGraph, from: string, to: string, maxDepth = 3) {
  const paths: MarketEdge[][] = [];

  const edges = graph.abjacencyList[from];

  if (!edges?.length) {
    return undefined;
  }

  for (const e of edges) {
    dfs(e, [], {});
  }

  function dfs(edge: MarketEdge, path: MarketEdge[], visited: { [edgeId: string]: boolean }) {
    // avoid too deep paths and cycles
    if (path.length >= maxDepth || visited[edge.marketAddress]) {
      return;
    }

    visited[edge.marketAddress] = true;
    path.push(edge);

    if (edge.to === to) {
      paths.push(path);
      return;
    }

    const edges = graph.abjacencyList[edge.to];

    if (!edges?.length) {
      return;
    }

    for (const e of edges) {
      dfs(e, [...path], { ...visited });
    }
  }

  return paths;
}
