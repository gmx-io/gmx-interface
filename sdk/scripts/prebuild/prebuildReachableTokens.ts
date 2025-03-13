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

type ReachableTokens = Record<FromToken, ToToken[]>;
type ChainsReachableTokens = Record<number, ReachableTokens>;

const MAX_EDGE_PATH_LENGTH = 3;

function getReachableTokens(
  marketsMap: Record<string, MarketConfig>,
  tokensMap: Record<string, Token>
): ReachableTokens {
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

  function dfs(from: string, to: string, path: string[], visited: Set<string>, initialFrom: string): boolean {
    if (from === to) {
      return true;
    }

    if (visited.has(from) || path.length >= MAX_EDGE_PATH_LENGTH) {
      return false;
    }

    visited.add(from);

    let found = false;

    for (const destination in graph[from]) {
      const markets = graph[from][destination];

      for (const market of markets) {
        found = found || dfs(destination, to, [...path, market], visited, initialFrom);

        if (found) {
          return true;
        }
      }
    }

    return false;
  }

  const reachableTokens = {};
  for (const tokenAAddress in tokensMap) {
    const tokenA = tokensMap[tokenAAddress];

    if (tokenA.isPlatformToken && !tokenA.isPlatformTradingToken) {
      continue;
    }

    let empty = true;
    for (const tokenBAddress in tokensMap) {
      const tokenB = tokensMap[tokenBAddress];

      if ((tokenB.isPlatformToken && !tokenB.isPlatformTradingToken) || tokenAAddress === tokenBAddress) {
        continue;
      }

      const found = dfs(tokenAAddress, tokenBAddress, [], new Set(), tokenAAddress);

      if (found) {
        empty = false;
        reachableTokens[tokenAAddress] = reachableTokens[tokenAAddress] || [];
        reachableTokens[tokenAAddress].push(tokenBAddress);
      }
    }

    if (empty) {
      delete reachableTokens[tokenAAddress];
    }
  }

  return reachableTokens;
}

export function prebuildReachableTokens(outputDir: string) {
  const reachableTokens: ChainsReachableTokens = {};

  for (const chainId in MARKETS) {
    const markets = MARKETS[chainId];
    const chainGraph = getReachableTokens(markets, TOKENS_MAP[chainId]);

    reachableTokens[chainId] = chainGraph;
  }

  fs.writeFileSync(resolve(outputDir, `reachableTokens.json`), JSON.stringify(reachableTokens, null, 2));
}
