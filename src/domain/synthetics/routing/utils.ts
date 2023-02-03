import { MarketsData, MarketsOpenInterestData, MarketsPoolsData } from "domain/synthetics/markets";
import { BigNumber, ethers } from "ethers";
import { MarketsFeesConfigsData, getSwapStats } from "../fees";
import { TokensData } from "../tokens";
import { Edge, MarketsGraph, SwapEstimator } from "./types";

export function getMarketsGraph(marketsData: MarketsData): MarketsGraph {
  const markets = Object.values(marketsData);

  const graph: MarketsGraph = {
    abjacencyList: {},
    edges: [],
    marketsData,
  };

  for (const m of markets) {
    const { longTokenAddress, shortTokenAddress, marketTokenAddress } = m;

    if (longTokenAddress === shortTokenAddress) {
      continue;
    }

    const longShortEdge: Edge = {
      marketAddress: marketTokenAddress,
      from: longTokenAddress,
      to: shortTokenAddress,
    };

    const shortLongEdge: Edge = {
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
  marketsData: MarketsData,
  poolsData: MarketsPoolsData,
  openInterestData: MarketsOpenInterestData,
  tokensData: TokensData,
  feeConfigs: MarketsFeesConfigsData
): SwapEstimator => {
  return (e: Edge, usdIn: BigNumber) => {
    const swapStats = getSwapStats(
      marketsData,
      poolsData,
      openInterestData,
      tokensData,
      feeConfigs,
      e.marketAddress,
      e.from,
      usdIn
    );
    const usdOut = swapStats?.usdOut;

    const fees = swapStats?.swapFeeUsd.sub(swapStats.priceImpactDeltaUsd);

    if (!usdOut || !fees) {
      return {
        usdOut: BigNumber.from(0),
        fees: ethers.constants.MaxUint256,
      };
    }

    return {
      usdOut,
      fees,
    };
  };
};

export function findBestSwapPath(
  graph: MarketsGraph,
  from: string,
  to: string,
  usdIn: BigNumber,
  estimator: SwapEstimator
) {
  if (from === to) {
    return [];
  }

  // const path = bellmanFord(graph, from, to, usdIn, estimator);

  const path = dfs(graph, from, to, usdIn, estimator);

  if (path?.length) {
    return path;
  } else {
    return undefined;
  }
}

export function dfs(
  graph: MarketsGraph,
  from: string,
  to: string,
  usdIn: BigNumber,
  estimator: SwapEstimator,
  maxDepth = 3
) {
  if (maxDepth === 0) {
    return undefined;
  }

  const edges = graph.abjacencyList[from];

  if (!edges?.length) {
    return undefined;
  }

  const targetEdges = edges.filter((v) => {
    return v.to === to;
  });

  if (targetEdges.length > 0) {
    let bestSwap = targetEdges[0];
    let bestSwapStats = estimator(bestSwap, usdIn);

    for (const e of targetEdges) {
      const swapStats = estimator(e, usdIn);

      if (swapStats.usdOut.gt(bestSwapStats.usdOut)) {
        bestSwap = e;
        bestSwapStats = swapStats;
      }
    }

    if (bestSwapStats.usdOut.gt(0)) {
      return [bestSwap];
    }

    return undefined;
  }

  for (const e of edges) {
    const swapStats = estimator(e, usdIn);

    if (swapStats.usdOut.gt(0)) {
      const path = dfs(graph, e.to, to, swapStats.usdOut, estimator, maxDepth - 1);

      if (path) {
        return [e, ...path];
      }
    }
  }

  return undefined;
}

// TODO
export function bellmanFord(graph: MarketsGraph, from: string, to: string, usdIn: BigNumber, estimator: SwapEstimator) {
  const edges = graph.edges;
  const nodes = Object.keys(graph.abjacencyList);

  if (!nodes.includes(from) || !nodes.includes(to)) {
    return undefined;
  }

  const usdOut = {};
  const fees = {};
  const previous: { [token: string]: Edge | null } = {};

  for (const node of nodes) {
    usdOut[node] = BigNumber.from(0);
    fees[node] = ethers.constants.MaxUint256;
    previous[node] = null;
  }

  usdOut[from] = usdIn;
  fees[from] = BigNumber.from(0);

  for (let i = 0; i < nodes.length; i++) {
    for (const edge of edges) {
      const { from, to } = edge;
      const { fees: swapFees, usdOut: swapUsdOut } = estimator(edge, usdOut[from]);

      if (fees[from].add(swapFees).lt(fees[to])) {
        fees[to] = fees[from].add(swapFees);
        usdOut[to] = swapUsdOut;
        previous[to] = edge;
      }
    }
  }

  for (const edge of edges) {
    const { from, to } = edge;
    const { fees: swapFee } = estimator(edge, usdOut[from]);

    if (fees[from].add(swapFee).lt(fees[to])) {
      throw new Error("Negative cycle detected");
    }
  }

  const path: Edge[] = [];
  let e = previous[to];

  while (e) {
    path.push(e);
    e = previous[e.from];
  }

  return path.reverse();
}

export function getBestSwapPath(paths: Edge[][], usdIn: BigNumber, estimator: SwapEstimator) {
  if (!paths.length) {
    return undefined;
  }

  let bestPath = paths[0];
  let bestPathStats = estimator(bestPath[0], usdIn);

  for (const path of paths) {
    const pathStats = estimator(path[0], usdIn);

    if (pathStats.usdOut.gt(bestPathStats.usdOut)) {
      bestPath = path;
      bestPathStats = pathStats;
    }
  }

  return bestPath;
}

export function findAllPaths(graph: MarketsGraph, from: string, to: string, maxDepth = 3) {
  const paths: Edge[][] = [];

  function dfs(edge: Edge, path: Edge[], visited: { [marketAddress: string]: boolean }) {
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

export function arrangeIntoTree(paths) {
  // Adapted from http://brandonclapp.com/arranging-an-array-of-flat-paths-into-a-json-tree-like-structure/
  var tree = [];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    var currentLevel = tree;
    for (var j = 0; j < path.length; j++) {
      var part = path[j];

      var existingPath = findWhere(currentLevel, "name", part);

      if (existingPath) {
        currentLevel = existingPath.children;
      } else {
        var newPart = {
          name: part,
          children: [],
        };

        // @ts-ignore
        currentLevel.push(newPart);
        currentLevel = newPart.children;
      }
    }
  }
  return tree;

  function findWhere(array, key, value) {
    // Adapted from https://stackoverflow.com/questions/32932994/findwhere-from-underscorejs-to-jquery
    let t = 0; // t is used as a counter
    while (t < array.length && array[t][key] !== value) {
      t++;
    } // find the index where the id is the as the aValue

    if (t < array.length) {
      return array[t];
    } else {
      return false;
    }
  }
}
