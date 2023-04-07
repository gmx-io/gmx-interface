import { MarketsData } from "domain/synthetics/markets";
import { MarketEdge, MarketsGraph, SwapEstimator } from "../types";
import { BigNumber } from "ethers";

export function getMarketsGraph(marketsData: MarketsData): MarketsGraph {
  const markets = Object.values(marketsData);

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

export function getBestSwapPath(paths: MarketEdge[][], usdIn: BigNumber, estimator: SwapEstimator) {
  if (!paths.length) {
    return undefined;
  }

  let bestPath = paths[0];
  let bestUsdOut = BigNumber.from(0);

  for (const path of paths) {
    let pathUsdOut = usdIn;

    for (const edge of path) {
      const { usdOut } = estimator(edge, pathUsdOut);
      pathUsdOut = usdOut;
    }

    if (pathUsdOut.gt(bestUsdOut)) {
      bestPath = path;
      bestUsdOut = pathUsdOut;
    }
  }

  return bestPath;
}

export function findAllPaths(graph: MarketsGraph, from: string, to: string, maxDepth = 3) {
  const paths: MarketEdge[][] = [];

  function dfs(edge: MarketEdge, path: MarketEdge[], visited: { [marketAddress: string]: boolean }) {
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
      dfs(e, [...path], visited);
    }
  }

  const edges = graph.abjacencyList[from];

  if (!edges?.length) {
    return undefined;
  }

  for (const e of edges) {
    dfs(e, [], {});
  }

  return paths;
}
