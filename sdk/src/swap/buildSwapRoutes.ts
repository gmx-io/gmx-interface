import type { MarketConfig } from "configs/markets";
import type { SwapRoutes } from "types/trade";
import { MarketsGraph, buildMarketsAdjacencyGraph } from "./buildMarketsAdjacencyGraph";
import { MAX_EDGE_PATH_LENGTH } from "./constants";

export function getSwapRoutes(marketsMap: Record<string, MarketConfig>): SwapRoutes {
  const graph = buildMarketsAdjacencyGraph(marketsMap);

  const swapRoutes = findSwapPathsBetweenTokens(graph);

  return swapRoutes;
}

export function findSwapPathsBetweenTokens(graph: MarketsGraph): SwapRoutes {
  const smallSwapRoutes: SwapRoutes = {};

  for (const tokenAAddress in graph) {
    smallSwapRoutes[tokenAAddress] = {};

    let empty = true;
    for (const tokenBAddress in graph[tokenAAddress]) {
      if (tokenAAddress === tokenBAddress || smallSwapRoutes[tokenBAddress]?.[tokenAAddress]) {
        continue;
      }

      const result: string[][] = [];

      type Work = {
        at: string;
        path: string[];
        visited: Set<string>;
      };

      const queue: Work[] = [
        {
          at: tokenAAddress,
          path: [],
          visited: new Set(),
        },
      ];

      while (queue.length > 0) {
        const { at, path, visited } = queue.shift()!;

        if (at === tokenBAddress) {
          result.push(path);

          continue;
        }

        if (visited.has(at) || path.length >= MAX_EDGE_PATH_LENGTH) {
          continue;
        }

        const newVisited = new Set(visited).add(at);

        for (const destination in graph[at]) {
          const markets = graph[at][destination];

          for (const market of markets) {
            queue.push({ at: destination, path: [...path, market], visited: newVisited });
          }
        }
      }

      if (result.length > 0) {
        empty = false;
        smallSwapRoutes[tokenAAddress][tokenBAddress] = result;
      }
    }

    if (empty) {
      delete smallSwapRoutes[tokenAAddress];
    }
  }

  return smallSwapRoutes;
}
