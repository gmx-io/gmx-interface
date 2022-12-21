import { getMarkets, getTokenPoolAmount, Market, MarketsData, MarketsPoolsData } from "domain/synthetics/markets";
import { BigNumber, ethers } from "ethers";

// Format: market:longToken:shortToken:indexToken
export type MarketCombination = string;

export type MarketVertex = {
  market: string;
  toToken: string;
  indexToken: string;
};

export type TokenNode = MarketVertex[];

/**
 * graph = {
 *  A: [{toToken: B, market: m}, {toToken: C, market: m}],
 *  B: [{toToken: A, market: m}, {toToken: C, market: m}],
 *  C: [{toToken: A, market: m}, {toToken: B, market: m}],
 * }
 */
export type MarketsGraph = {
  [token: string]: TokenNode;
};

export type SwapData = {
  marketsData: MarketsData;
  poolsData: MarketsPoolsData;
  fromToken: string;
  toToken: string;
  indexToken?: string;
  amount: BigNumber;
};

type SwapPathItem = { market: string; fee: BigNumber };

const SEPARATOR = ":";

export function getMarketCombination(market: Market) {
  const { marketTokenAddress, longTokenAddress, shortTokenAddress, indexTokenAddress } = market;

  return [marketTokenAddress, longTokenAddress, shortTokenAddress, indexTokenAddress].join(SEPARATOR);
}

export function parseMarketCombination(marketCombination: string) {
  const [market, indexToken, longToken, shortToken] = marketCombination.split(SEPARATOR);

  return {
    market,
    longToken,
    shortToken,
    indexToken,
  };
}

export function getMarketsGraph(markets: Market[]) {
  const collateralsGraph: MarketsGraph = {};
  const indexGraph: MarketsGraph = {};

  for (const m of markets) {
    const {
      marketTokenAddress: market,
      longTokenAddress: longToken,
      shortTokenAddress: shortToken,
      indexTokenAddress: indexToken,
    } = m;

    collateralsGraph[longToken] = collateralsGraph[longToken] || [];
    collateralsGraph[shortToken] = collateralsGraph[shortToken] || [];

    collateralsGraph[longToken].push({ market, toToken: shortToken, indexToken });
    collateralsGraph[shortToken].push({
      market,
      toToken: longToken,
      indexToken,
    });

    indexGraph[indexToken] = indexGraph[indexToken] || [];
  }

  return {
    collateralsGraph,
    indexGraph,
  };
}

// TODO?
// export function getByMainTokens(marketCombinations: string[], from: string, to: string) {
// }
export function getSwapParamsForPosition(data: SwapData, graph: MarketsGraph) {
  const { fromToken, toToken, indexToken } = data;

  if (fromToken === toToken) {
    const markets = getMarkets(data.marketsData);

    const market = markets.find(
      (m) => m.indexTokenAddress === indexToken && [m.longTokenAddress, m.shortTokenAddress].includes(toToken)
    );

    if (!market) {
      return undefined;
    }

    return {
      swapPath: [],
      market: market.marketTokenAddress,
    };
  }

  const swapPath = findSwapPath(data, graph);

  if (!swapPath) {
    return undefined;
  }

  const lastSwap = swapPath[swapPath.length - 1];

  return {
    swapPath,
    market: lastSwap.market,
  };
}

// TODO: price impact + swap fee
export function getSwapFee(data: SwapData, vertex: MarketVertex, amount: BigNumber) {
  const { marketsData, poolsData } = data;

  const toPool = getTokenPoolAmount(marketsData, poolsData, vertex.market, vertex.toToken);

  if (!toPool || toPool.lt(amount)) return ethers.constants.MaxUint256;

  return BigNumber.from(0);
}

export function findSwapPath(data: SwapData, graph: MarketsGraph) {
  return findPath(data, graph, data.fromToken, data.toToken, data.amount);
}

export function findPath(
  data: SwapData,
  graph: MarketsGraph,
  from: string,
  to: string,
  amount: BigNumber,
  maxDepth = 3
): SwapPathItem[] | undefined {
  if (maxDepth === 0) {
    return undefined;
  }

  const vertexes = graph[from];

  const isTargetTo = to === data.toToken;
  const needCheckIndex = data.indexToken && isTargetTo;

  const targetVertexes = vertexes.filter((v) => {
    return v.toToken === to && (!needCheckIndex || v.indexToken === data.indexToken);
  });

  if (targetVertexes.length > 0) {
    let bestSwap = targetVertexes[0];
    let bestSwapFee = getSwapFee(data, bestSwap, amount);

    if (amount.gt(bestSwapFee)) {
      for (const v of targetVertexes) {
        const swapFee = getSwapFee(data, v, amount);

        if (swapFee.lt(bestSwapFee)) {
          bestSwap = v;
          bestSwapFee = swapFee;
        }
      }

      return [{ market: bestSwap.market, fee: bestSwapFee }];
    }
  }

  for (const v of vertexes) {
    const swapFee = getSwapFee(data, v, amount);
    const vSwap = { market: v.market, fee: swapFee };

    if (amount.gt(swapFee)) {
      const path = findPath(data, graph, v.toToken, to, amount, maxDepth - 1);

      if (path) {
        return [vSwap, ...path];
      }
    }
  }

  return undefined;
}
