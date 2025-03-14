import type { MarketConfig } from "configs/markets";
import type { SwapRoutes } from "types/trade";
import { MarketsGraph, buildMarketsAdjacencyGraph } from "./buildMarketsAdjacencyGraph";
import { MAX_EDGE_PATH_LENGTH } from "./constants";

export function getSwapRoutes(marketsMap: Record<string, MarketConfig>): SwapRoutes {
  const graph = buildMarketsAdjacencyGraph(marketsMap);

  const swapRoutes = processNonRepeatingTokensBfs(graph);

  return swapRoutes;
}

export function processNonRepeatingTokensBfs(graph: MarketsGraph): SwapRoutes {
  const smallSwapRoutes: SwapRoutes = {};

  const allTokens = Array.from(new Set(Object.keys(graph).flatMap((token) => Object.keys(graph[token]).concat(token))));

  for (const tokenAAddress of allTokens) {
    smallSwapRoutes[tokenAAddress] = {};

    let empty = true;
    for (const tokenBAddress of allTokens) {
      if (tokenAAddress === tokenBAddress || smallSwapRoutes[tokenBAddress]?.[tokenAAddress]) {
        continue;
      }

      const result: Record<string, string[]> = {};

      type Work = {
        at: string;
        path: string[];
        nodePath: string[];
      };

      const queue: Work[] = [
        {
          at: tokenAAddress,
          path: [],
          nodePath: [],
        },
      ];

      while (queue.length > 0) {
        const { at, path, nodePath } = queue.shift()!;

        if (path.length >= 2 && path[path.length - 1] === path[path.length - 2]) {
          continue;
        }

        if (at === tokenBAddress) {
          const intermediateNodePath = nodePath.slice(0, -1);
          // trim last token from nodePath
          const key = intermediateNodePath.join(",");
          if (!result[key]) {
            result[key] = intermediateNodePath;
          }
        }

        if (path.length >= MAX_EDGE_PATH_LENGTH) {
          continue;
        }

        for (const destination in graph[at]) {
          const markets = graph[at][destination];

          for (const market of markets) {
            queue.push({ at: destination, path: [...path, market], nodePath: [...nodePath, destination] });
          }
        }
      }

      if (Object.keys(result).length > 0) {
        empty = false;
        smallSwapRoutes[tokenAAddress][tokenBAddress] = Object.values(result);
      }
    }

    if (empty) {
      delete smallSwapRoutes[tokenAAddress];
    }
  }

  return smallSwapRoutes;
}
