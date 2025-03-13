import fs from "fs";
import { resolve } from "path";

import { MARKETS, MarketConfig } from "configs/markets";
import { TOKENS_MAP } from "configs/tokens";
import type { Token } from "types/tokens";

type FromToken = string;
type ToToken = string;
type MarketAddress = string;

type MarketsGraph = {
  [from: FromToken]: {
    [to: ToToken]: MarketAddress[];
  };
};

type MarketRoute = MarketAddress[];
type SwapRoutes = Record<FromToken, Record<ToToken, MarketRoute[]>>;
type ChainsSwapRoutes = Record<number, SwapRoutes>;

const MAX_EDGE_PATH_LENGTH = 3;
const ROUTES_COUNT_THRESHOLD = 20;

function getSwapRoutes(marketsMap: Record<string, MarketConfig>, tokensMap: Record<string, Token>) {
  const graph: MarketsGraph = {};

  for (const marketTokenAddress in marketsMap) {
    const { longTokenAddress, shortTokenAddress } = marketsMap[marketTokenAddress];

    const isSameCollaterals = longTokenAddress === shortTokenAddress;

    if (isSameCollaterals) {
      continue;
    }

    graph[longTokenAddress] = graph[longTokenAddress] || {};
    graph[longTokenAddress][shortTokenAddress] = graph[longTokenAddress][shortTokenAddress] || [];
    graph[longTokenAddress][shortTokenAddress].push(marketTokenAddress);

    graph[shortTokenAddress] = graph[shortTokenAddress] || {};
    graph[shortTokenAddress][longTokenAddress] = graph[shortTokenAddress][longTokenAddress] || [];
    graph[shortTokenAddress][longTokenAddress].push(marketTokenAddress);
  }

  const nonRepeatingTokensSwapRoutes = processNonRepeatingTokensBfs(tokensMap, graph);

  return { nonRepeatingTokensSwapRoutes };
}

function processNonRepeatingTokensBfs(tokensMap: Record<string, Token>, graph: MarketsGraph) {
  const smallSwapRoutes: SwapRoutes = {};

  for (const tokenAAddress in tokensMap) {
    const tokenA = tokensMap[tokenAAddress];

    if ((tokenA.isPlatformToken && !tokenA.isPlatformTradingToken) || tokenA.isNative) {
      continue;
    }

    smallSwapRoutes[tokenAAddress] = {};

    let empty = true;
    for (const tokenBAddress in tokensMap) {
      const tokenB = tokensMap[tokenBAddress];

      if (
        (tokenB.isPlatformToken && !tokenB.isPlatformTradingToken) ||
        tokenB.isNative ||
        tokenAAddress === tokenBAddress ||
        smallSwapRoutes[tokenBAddress]?.[tokenAAddress]
      ) {
        continue;
      }

      // 1 step count: 3
      // 2 step count: 2
      // 3 step count: 2
      // etc
      const lengthCount: Record<number, number> = {};
      // count less then or equal to 1
      // count less then or equal to 2
      // count less then or equal to 3
      // etc
      const lengthsAggCount: Record<number, number> = {};

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
          lengthCount[path.length] = (lengthCount[path.length] || 0) + 1;

          for (let length = 1; length <= path.length; length++) {
            lengthsAggCount[length] = (lengthsAggCount[length] || 0) + 1;
          }

          continue;
        }

        if (visited.has(at) || path.length >= MAX_EDGE_PATH_LENGTH) {
          continue;
        }

        if (path.length !== 0 && lengthsAggCount[path.length - 1] >= ROUTES_COUNT_THRESHOLD) {
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

export function prebuildSwapRoutes(outputDir: string) {
  const chainSwapRoutes: ChainsSwapRoutes = {};

  for (const chainId in MARKETS) {
    const markets = MARKETS[chainId];
    const chainGraph = getSwapRoutes(markets, TOKENS_MAP[chainId]);

    chainSwapRoutes[chainId] = chainGraph.nonRepeatingTokensSwapRoutes;
  }

  fs.writeFileSync(resolve(outputDir, `swapRoutes.json`), JSON.stringify(chainSwapRoutes, null, 2));
}
