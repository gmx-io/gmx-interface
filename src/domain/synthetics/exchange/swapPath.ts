import { getMarkets, MarketsData } from "domain/synthetics/markets";
import { BigNumber } from "ethers";

export type MarketEdge = {
  market: string;
  // opposite token
  opposite: string;
  indexToken: string;
};

/**
 * graph = {
 *  A: [{opposite: B, market: m}, {opposite: C, market: m}],
 *  B: [{opposite: A, market: m}, {opposite: C, market: m}],
 *  C: [{opposite: A, market: m}, {opposite: B, market: m}],
 * }
 */
export type MarketsGraph = {
  [token: string]: MarketEdge[];
};

export type FeeEstimator = (market: string, fromToken: string, toToken: string, amountUsd: BigNumber) => BigNumber;

export type SwapParams = {
  // start token
  fromToken: string;
  // swap end token or collateral for a position
  toToken: string;
  // index token for a position
  indexToken?: string;
  // amount of fromToken to swap in usd
  amountUsd: BigNumber;
  // a function to estimate the fee for a swap
  feeEstimator: FeeEstimator;
};

export type SwapPathItem = { market: string; to: string; feeUsd: BigNumber };

export type SwapPath = SwapPathItem[];

export function getMarketsGraph(marketsData: MarketsData): MarketsGraph {
  const markets = getMarkets(marketsData);

  const graph: MarketsGraph = {};

  for (const m of markets) {
    const {
      marketTokenAddress: market,
      longTokenAddress: longToken,
      shortTokenAddress: shortToken,
      indexTokenAddress: indexToken,
    } = m;

    graph[longToken] = graph[longToken] || [];
    graph[shortToken] = graph[shortToken] || [];

    graph[longToken].push({ market, opposite: shortToken, indexToken });
    graph[shortToken].push({
      market,
      opposite: longToken,
      indexToken,
    });
  }

  return graph;
}

export function getSwapPathForPosition(marketsData: MarketsData, swapParams: SwapParams, graph: MarketsGraph) {
  const { fromToken, toToken, indexToken } = swapParams;

  // no swap needed
  if (fromToken === toToken) {
    const markets = getMarkets(marketsData);

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

  const swapPath = findSwapPath(swapParams, graph);

  if (!swapPath) {
    return undefined;
  }

  const lastSwap = swapPath[swapPath.length - 1];

  return {
    swapPath,
    market: lastSwap.market,
  };
}

export function findSwapPath(data: SwapParams, graph: MarketsGraph) {
  return findPath(data, graph, data.fromToken, data.toToken);
}

export function findPath(
  swapParams: SwapParams,
  graph: MarketsGraph,
  from: string,
  to: string,
  maxDepth = 3
): SwapPath | undefined {
  if (maxDepth === 0) {
    return undefined;
  }

  const edges = graph[from];

  if (!edges?.length) {
    return undefined;
  }

  const isTargetTo = to === swapParams.toToken;
  const needCheckIndex = swapParams.indexToken && isTargetTo;

  const targetEdges = edges.filter((v) => {
    return v.opposite === to && (!needCheckIndex || v.indexToken === swapParams.indexToken);
  });

  if (targetEdges.length > 0) {
    let bestSwap = targetEdges[0];
    let bestSwapFee = swapParams.feeEstimator(bestSwap.market, from, bestSwap.opposite, swapParams.amountUsd);

    if (swapParams.amountUsd.gt(bestSwapFee)) {
      for (const e of targetEdges) {
        const swapFee = swapParams.feeEstimator(e.market, from, e.opposite, swapParams.amountUsd);

        if (swapFee.lt(bestSwapFee)) {
          bestSwap = e;
          bestSwapFee = swapFee;
        }
      }

      return [{ market: bestSwap.market, to: bestSwap.opposite, feeUsd: bestSwapFee }];
    }
  }

  for (const e of edges) {
    const swapFee = swapParams.feeEstimator(e.market, from, e.opposite, swapParams.amountUsd);

    if (swapParams.amountUsd.gt(swapFee)) {
      const path = findPath(swapParams, graph, e.opposite, to, maxDepth - 1);

      if (path) {
        return [{ market: e.market, to: e.opposite, feeUsd: swapFee }, ...path];
      }
    }
  }

  return undefined;
}
