import { MARKETS } from "configs/markets";
import { convertTokenAddress, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "configs/tokens";
import { GasLimitsConfig } from "types/fees";
import { MarketsInfoData } from "types/markets";
import { TokensData } from "types/tokens";
import { FindSwapPath, SwapPathStats } from "types/trade";
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
import { LRUCache } from "utils/LruCache";

export const getWrappedAddress = (chainId: number, address: string | undefined) => {
  return address ? convertTokenAddress(chainId, address, "wrapped") : undefined;
};

const DEBUG_MARKET_ADJACENCY_GRAPH_CACHE = new LRUCache<MarketsGraph>(100);
function buildDebugMarketAdjacencyGraph(
  chainId: number,
  debugSwapMarketsConfig: {
    disabledSwapMarkets?: string[] | undefined;
    manualPath?: string[] | undefined;
  }
) {
  if (!debugSwapMarketsConfig?.disabledSwapMarkets?.length) {
    return getMarketAdjacencyGraph(chainId);
  }

  const cacheKey = `${chainId}-${JSON.stringify(debugSwapMarketsConfig)}`;

  const cachedGraph = DEBUG_MARKET_ADJACENCY_GRAPH_CACHE.get(cacheKey);
  if (cachedGraph) {
    return cachedGraph;
  }

  const disabledMarketAddresses = debugSwapMarketsConfig.disabledSwapMarkets;

  const strippedMarkets = Object.fromEntries(
    Object.entries(MARKETS[chainId]).filter(([marketAddress]) => !disabledMarketAddresses.includes(marketAddress))
  );

  const graph = buildMarketsAdjacencyGraph(strippedMarkets);
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
  debugSwapMarketsConfig?: {
    disabledSwapMarkets?: string[] | undefined;
    manualPath?: string[] | undefined;
  };
}): FindSwapPath => {
  const { chainId, fromTokenAddress, toTokenAddress, marketsInfoData, debugSwapMarketsConfig, gasEstimationParams } =
    params;
  const wrappedFromAddress = getWrappedAddress(chainId, fromTokenAddress);
  const wrappedToAddress = getWrappedAddress(chainId, toTokenAddress);
  const wrappedToken = getWrappedToken(chainId);

  const tokenSwapPaths =
    wrappedFromAddress && wrappedToAddress
      ? getTokenSwapPathsForTokenPairPrebuilt(chainId, wrappedFromAddress, wrappedToAddress)
      : [];

  const marketAdjacencyGraph = debugSwapMarketsConfig?.disabledSwapMarkets?.length
    ? buildDebugMarketAdjacencyGraph(chainId, debugSwapMarketsConfig)
    : getMarketAdjacencyGraph(chainId);

  const cache: Record<string, SwapPathStats | undefined> = {};

  if (!marketsInfoData) {
    return FALLBACK_FIND_SWAP_PATH;
  }

  const marketEdgeLiquidityGetter = createMarketEdgeLiquidityGetter(marketsInfoData);
  const naiveEstimator = createNaiveSwapEstimator(marketsInfoData);
  const naiveNetworkEstimator = gasEstimationParams
    ? createNaiveNetworkEstimator({
        gasLimits: gasEstimationParams.gasLimits,
        tokensData: gasEstimationParams.tokensData,
        gasPrice: gasEstimationParams.gasPrice,
        chainId,
      })
    : undefined;
  const estimator = createSwapEstimator(marketsInfoData);

  const findSwapPath: FindSwapPath = (usdIn: bigint, opts?: { order?: ("liquidity" | "length")[] }) => {
    if (tokenSwapPaths.length === 0 || !fromTokenAddress || !wrappedFromAddress || !wrappedToAddress) {
      return undefined;
    }

    const cacheKey = `${usdIn}-${opts?.order?.join("-") || "none"}`;
    if (cache[cacheKey]) {
      return cache[cacheKey];
    }

    let swapPath: string[] | undefined = undefined;

    if (debugSwapMarketsConfig?.manualPath !== undefined) {
      swapPath = debugSwapMarketsConfig.manualPath;
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
    });

    cache[cacheKey] = result;

    return result;
  };

  return findSwapPath;
};
