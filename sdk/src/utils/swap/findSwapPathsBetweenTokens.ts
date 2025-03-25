import type { SwapPaths } from "types/trade";
import { objectKeysDeep } from "utils/objects";

import type { MarketsGraph } from "./buildMarketsAdjacencyGraph";
import { MAX_EDGE_PATH_LENGTH } from "./constants";

export function findSwapPathsBetweenTokens(graph: MarketsGraph): SwapPaths {
  const swapRoutes: SwapPaths = {};

  const allTokens = objectKeysDeep(graph, 1).sort();

  for (const tokenAAddress of allTokens) {
    swapRoutes[tokenAAddress] = {};

    let empty = true;
    for (const tokenBAddress of allTokens) {
      if (tokenAAddress === tokenBAddress || swapRoutes[tokenBAddress]?.[tokenAAddress]) {
        continue;
      }

      const result: Record<string, string[]> = {};

      type SwapPathNode = {
        currentToken: string;
        tokenPath: string[];
      };

      const searchQueue: SwapPathNode[] = [
        {
          currentToken: tokenAAddress,
          tokenPath: [tokenAAddress],
        },
      ];

      while (searchQueue.length > 0) {
        const { currentToken, tokenPath } = searchQueue.shift()!;

        // Example
        // ... -> ANIME -> USDC -> ANIME
        // There is only one edge from ANIME to USDC, so we skip this path
        // Because its almost always a guaranteed loss
        if (tokenPath.length >= 3) {
          const lastToken = tokenPath[tokenPath.length - 1];
          const secondLastToken = tokenPath[tokenPath.length - 2];
          const thirdLastToken = tokenPath[tokenPath.length - 3];

          if (lastToken === thirdLastToken) {
            const lastEdge = graph[lastToken]?.[secondLastToken];
            if (lastEdge && lastEdge.length === 1) {
              continue;
            }
          }
        }

        if (currentToken === tokenBAddress) {
          const intermediateTokenPath = tokenPath.slice(1, -1);
          const pathKey = intermediateTokenPath.join(",");
          if (!result[pathKey]) {
            result[pathKey] = intermediateTokenPath;
          }
        }

        if (tokenPath.length >= MAX_EDGE_PATH_LENGTH + 1) {
          continue;
        }

        for (const nextToken in graph[currentToken]) {
          searchQueue.push({
            currentToken: nextToken,
            tokenPath: [...tokenPath, nextToken],
          });
        }
      }

      if (Object.keys(result).length > 0) {
        empty = false;
        swapRoutes[tokenAAddress][tokenBAddress] = Object.values(result);
      }
    }

    if (empty) {
      delete swapRoutes[tokenAAddress];
    }
  }

  return swapRoutes;
}
