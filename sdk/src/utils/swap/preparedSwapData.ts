import { MARKETS } from "configs/markets";
import { SwapPaths } from "types/trade";

import { MarketsGraph, buildMarketsAdjacencyGraph } from "./buildMarketsAdjacencyGraph";
import { findReachableTokens } from "./findReachableTokens";
import { findSwapPathsBetweenTokens } from "./findSwapPathsBetweenTokens";

const MARKETS_ADJACENCY_GRAPH: {
  [chainId: number]: MarketsGraph;
} = {};

for (const chainId in MARKETS) {
  const markets = MARKETS[chainId];
  const chainGraph = buildMarketsAdjacencyGraph(markets);

  MARKETS_ADJACENCY_GRAPH[chainId] = chainGraph;
}

const TOKEN_SWAP_PATHS: {
  [chainId: number]: SwapPaths;
} = {};

for (const chainId in MARKETS) {
  const chainGraph = MARKETS_ADJACENCY_GRAPH[chainId];
  const chainSwapPaths = findSwapPathsBetweenTokens(chainGraph);

  TOKEN_SWAP_PATHS[chainId] = chainSwapPaths;
}

const REACHABLE_TOKENS: {
  [chainId: number]: {
    [token: string]: string[];
  };
} = {};

for (const chainId in MARKETS) {
  const chainGraph = MARKETS_ADJACENCY_GRAPH[chainId];
  const chainReachableTokens = findReachableTokens(chainGraph);

  REACHABLE_TOKENS[chainId] = chainReachableTokens;
}

export { MARKETS_ADJACENCY_GRAPH, REACHABLE_TOKENS, TOKEN_SWAP_PATHS };
