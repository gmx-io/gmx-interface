import type { MarketConfig } from "configs/markets";
import { MarketsGraph, buildMarketsAdjacencyGraph } from "./buildMarketsAdjacencyGraph";
import { MAX_EDGE_PATH_LENGTH } from "./constants";

export function buildReachableTokens(marketsMap: Record<string, MarketConfig>): Record<string, string[]> {
  const graph = buildMarketsAdjacencyGraph(marketsMap);

  const reachableTokens = processReachableTokens(graph);

  return reachableTokens;
}

export function processReachableTokens(graph: MarketsGraph): Record<string, string[]> {
  const reachableTokens: Record<string, string[]> = {};

  const allTokens = Array.from(new Set(Object.keys(graph).flatMap((token) => Object.keys(graph[token]).concat(token))));

  for (const tokenAAddress of allTokens) {
    type Work = {
      at: string;
      depth: number;
    };

    const queue: Work[] = [{ at: tokenAAddress, depth: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { at, depth } = queue.shift()!;

      if (visited.has(at)) {
        continue;
      }

      visited.add(at);

      if (depth >= MAX_EDGE_PATH_LENGTH) {
        continue;
      }

      for (const destination in graph[at]) {
        queue.push({ at: destination, depth: depth + 1 });
      }
    }

    visited.delete(tokenAAddress);

    reachableTokens[tokenAAddress] = Array.from(visited);
  }

  return reachableTokens;
}
