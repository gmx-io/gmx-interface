import { MarketConfig, MARKETS } from "configs/markets";
import { convertTokenAddress, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "configs/tokens";
import { LRUCache } from "utils/LruCache";
import { getIsMarketAvailableForExpressSwaps } from "utils/markets";

import { buildMarketsAdjacencyGraph, MarketsGraph } from "./buildMarketsAdjacencyGraph";
import {
  createMarketEdgeLiquidityGetter,
  createNaiveNetworkEstimator,
  createNaiveSwapEstimator,
  createSwapEstimator,
  getBestSwapPath,
  getMarketAdjacencyGraph,
  getMaxLiquidityMarketSwapPathFromTokenSwapPaths,
  getNaiveBestMarketSwapPathsFromTokenSwapPaths,
  getTokenSwapPathsForTokenPairPrebuilt,
  marketRouteToMarketEdges,
} from "./swapRouting";
import { getSwapPathStats } from "./swapStats";
import { GasLimitsConfig } from "../fees/types";
import { MarketsInfoData } from "../markets/types";
import { SwapPricingType } from "../orders/types";
import { TokensData } from "../tokens/types";
import { FindSwapPath, SwapPathStats } from "../trade/types";


export const getWrappedAddress = (chainId: number, address: string | undefined) => {
  return address ? convertTokenAddress(chainId, address, "wrapped") : undefined;
};

const DEBUG_MARKET_ADJACENCY_GRAPH_CACHE = new LRUCache<MarketsGraph>(100);

function buildMarketAdjacencyGraph(chainId: number, disabledMarkets?: string[] | undefined) {
  if (!disabledMarkets?.length) {
    return getMarketAdjacencyGraph(chainId);
  }

  const cacheKey = `${chainId}-${JSON.stringify(disabledMarkets)}`;

  const cachedGraph = DEBUG_MARKET_ADJACENCY_GRAPH_CACHE.get(cacheKey);

  if (cachedGraph) {
    return cachedGraph;
  }

  const disabledMarketAddresses = disabledMarkets;

  const strippedMarkets = Object.fromEntries(
    Object.entries(MARKETS[chainId]).filter(([marketAddress]) => !disabledMarketAddresses.includes(marketAddress))
  );

  const graph = buildMarketsAdjacencyGraph(strippedMarkets as Record<string, MarketConfig>);

  DEBUG_MARKET_ADJACENCY_GRAPH_CACHE.set(cacheKey, graph);

  return graph;
}

const FALLBACK_FIND_SWAP_PATH: FindSwapPath = () => undefined;

export const createFindSwapPath = (params: {
  chainId: number;
  fromTokenAddress: string | undefined;
  toTokenAddress: string | undefined;
  marketsInfoData: MarketsInfoData | undefined;
  /**
   * Pass gas limits to take into account gas costs in swap path
   */
  gasEstimationParams?:
    | {
        gasPrice: bigint;
        gasLimits: GasLimitsConfig;
        tokensData: TokensData;
      }
    | undefined;
  swapPricingType: SwapPricingType | undefined;
  disabledMarkets?: string[] | undefined;
  manualPath?: string[] | undefined;
}): FindSwapPath => {
  const {
    chainId,
    fromTokenAddress,
    toTokenAddress,
    marketsInfoData,
    disabledMarkets,
    manualPath,
    gasEstimationParams,
    swapPricingType = SwapPricingType.Swap,
  } = params;
  const wrappedFromAddress = getWrappedAddress(chainId, fromTokenAddress);
  const wrappedToAddress = getWrappedAddress(chainId, toTokenAddress);
  const wrappedToken = getWrappedToken(chainId);

  let tokenSwapPaths =
    wrappedFromAddress && wrappedToAddress
      ? getTokenSwapPathsForTokenPairPrebuilt(chainId, wrappedFromAddress, wrappedToAddress)
      : [];

  const finalDisabledMarkets = [...(disabledMarkets ?? [])];

  if (swapPricingType === SwapPricingType.AtomicSwap) {
    const expressSwapUnavailableMarkets = Object.values(marketsInfoData ?? {})
      .filter((market) => !getIsMarketAvailableForExpressSwaps(market))
      .map((market) => market.marketTokenAddress);

    finalDisabledMarkets.push(...expressSwapUnavailableMarkets);
  }

  const marketAdjacencyGraph = buildMarketAdjacencyGraph(chainId, finalDisabledMarkets);

  const cache: Record<string, SwapPathStats | undefined> = {};

  if (!marketsInfoData) {
    return FALLBACK_FIND_SWAP_PATH;
  }

  const marketEdgeLiquidityGetter = createMarketEdgeLiquidityGetter(marketsInfoData);
  const naiveEstimator = createNaiveSwapEstimator(marketsInfoData, swapPricingType);
  const naiveNetworkEstimator = gasEstimationParams
    ? createNaiveNetworkEstimator({
        gasLimits: gasEstimationParams.gasLimits,
        tokensData: gasEstimationParams.tokensData,
        gasPrice: gasEstimationParams.gasPrice,
        chainId,
      })
    : undefined;
  const estimator = createSwapEstimator(marketsInfoData, swapPricingType);

  const findSwapPath: FindSwapPath = (usdIn: bigint, opts?: { order?: ("liquidity" | "length")[] }) => {
    if (tokenSwapPaths.length === 0 || !fromTokenAddress || !wrappedFromAddress || !wrappedToAddress) {
      return undefined;
    }

    const cacheKey = `${usdIn}-${opts?.order?.join("-") || "none"}`;
    if (cache[cacheKey]) {
      return cache[cacheKey];
    }

    let swapPath: string[] | undefined = undefined;

    if (manualPath !== undefined) {
      swapPath = manualPath;
    } else if (opts?.order || usdIn === 0n) {
      const primaryOrder = opts?.order?.at(0) === "length" ? "length" : "liquidity";

      if (!marketEdgeLiquidityGetter) {
        swapPath = undefined;
      } else {
        let applicableTokenSwapPaths = tokenSwapPaths;

        if (primaryOrder === "length") {
          const shortestLength = Math.min(...tokenSwapPaths.map((path) => path.length));
          applicableTokenSwapPaths = tokenSwapPaths.filter((path) => path.length === shortestLength);
        }

        const maxLiquidityPathInfo = getMaxLiquidityMarketSwapPathFromTokenSwapPaths({
          graph: marketAdjacencyGraph,
          tokenSwapPaths: applicableTokenSwapPaths,
          tokenInAddress: wrappedFromAddress,
          tokenOutAddress: wrappedToAddress,
          getLiquidity: marketEdgeLiquidityGetter,
        });

        if (maxLiquidityPathInfo) {
          swapPath = maxLiquidityPathInfo.path;
        }
      }
    } else {
      if (naiveEstimator) {
        const naiveSwapRoutes = getNaiveBestMarketSwapPathsFromTokenSwapPaths({
          graph: marketAdjacencyGraph,
          tokenSwapPaths,
          usdIn,
          tokenInAddress: wrappedFromAddress,
          tokenOutAddress: wrappedToAddress,
          estimator: naiveEstimator,
          networkEstimator: naiveNetworkEstimator,
        });

        if (naiveSwapRoutes?.length) {
          const edges = naiveSwapRoutes.map((path) =>
            marketRouteToMarketEdges(path, wrappedFromAddress, marketsInfoData)
          );

          swapPath = getBestSwapPath({
            routes: edges,
            usdIn,
            estimator,
            networkEstimator: naiveNetworkEstimator,
          })?.map((edge) => edge.marketAddress);
        }
      }
    }

    if (!swapPath) {
      cache[cacheKey] = undefined;
      return undefined;
    }

    let result: SwapPathStats | undefined = getSwapPathStats({
      marketsInfoData,
      swapPath,
      initialCollateralAddress: fromTokenAddress,
      wrappedNativeTokenAddress: wrappedToken.address,
      shouldUnwrapNativeToken: toTokenAddress === NATIVE_TOKEN_ADDRESS,
      shouldApplyPriceImpact: true,
      usdIn,
      swapPricingType,
    });

    cache[cacheKey] = result;

    return result;
  };

  return findSwapPath;
};
