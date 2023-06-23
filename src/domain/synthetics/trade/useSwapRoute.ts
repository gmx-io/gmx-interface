import { NATIVE_TOKEN_ADDRESS, convertTokenAddress, getWrappedToken } from "config/tokens";
import { MarketsInfoData } from "domain/synthetics/markets";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { useCallback, useMemo } from "react";
import { FindSwapPath, MarketEdge } from "./types";
import {
  createSwapEstimator,
  findAllPaths,
  getBestSwapPath,
  getMarketsGraph,
  getMaxSwapPathLiquidity,
  getSwapPathStats,
} from "./utils";

export type SwapRoutesResult = {
  allPaths?: MarketEdge[][];
  maxSwapLiquidity: BigNumber;
  maxLiquiditySwapPath?: string[];
  findSwapPath: FindSwapPath;
};

export function useSwapRoutes(p: {
  marketsInfoData?: MarketsInfoData;
  fromTokenAddress?: string;
  toTokenAddress?: string;
}): SwapRoutesResult {
  const { fromTokenAddress, toTokenAddress, marketsInfoData } = p;
  const { chainId } = useChainId();

  const wrappedToken = getWrappedToken(chainId);

  const isWrap = fromTokenAddress === NATIVE_TOKEN_ADDRESS && toTokenAddress === wrappedToken.address;
  const isUnwrap = fromTokenAddress === wrappedToken.address && toTokenAddress === NATIVE_TOKEN_ADDRESS;
  const isSameToken = fromTokenAddress === toTokenAddress;

  const wrappedFromAddress = fromTokenAddress ? convertTokenAddress(chainId, fromTokenAddress, "wrapped") : undefined;
  const wrappedToAddress = toTokenAddress ? convertTokenAddress(chainId, toTokenAddress, "wrapped") : undefined;

  const { graph, estimator } = useMemo(() => {
    if (!marketsInfoData) {
      return {};
    }

    return {
      graph: getMarketsGraph(Object.values(marketsInfoData)),
      estimator: createSwapEstimator(marketsInfoData),
    };
  }, [marketsInfoData]);

  const allPaths = useMemo(() => {
    if (!graph || !wrappedFromAddress || !wrappedToAddress || isWrap || isUnwrap || isSameToken) {
      return undefined;
    }

    let p = findAllPaths(graph, wrappedFromAddress, wrappedToAddress);

    p = p?.sort((a, b) => {
      return a.length - b.length;
    });

    // TODO: optimize
    return p?.slice(0, 5);
  }, [graph, isSameToken, isUnwrap, isWrap, wrappedFromAddress, wrappedToAddress]);

  const { maxLiquidity, maxLiquidityPath } = useMemo(() => {
    let maxLiquidity = BigNumber.from(0);
    let maxLiquidityPath: string[] | undefined = undefined;

    if (!allPaths || !marketsInfoData || !wrappedFromAddress) {
      return { maxLiquidity, maxLiquidityPath };
    }

    for (const path of allPaths) {
      const swapPath = path.map((edge) => edge.marketAddress);

      const liquidity = getMaxSwapPathLiquidity({
        marketsInfoData,
        swapPath,
        initialCollateralAddress: wrappedFromAddress,
      });

      if (liquidity.gt(maxLiquidity)) {
        maxLiquidity = liquidity;
        maxLiquidityPath = swapPath;
      }
    }

    return { maxLiquidity, maxLiquidityPath };
  }, [allPaths, marketsInfoData, wrappedFromAddress]);

  const findSwapPath = useCallback(
    (usdIn: BigNumber, opts: { shouldApplyPriceImpact: boolean }) => {
      if (!allPaths || !estimator || !marketsInfoData || !fromTokenAddress) {
        return undefined;
      }

      const bestSwapPathEdges = getBestSwapPath(allPaths, usdIn, estimator);

      const swapPath = bestSwapPathEdges?.map((edge) => edge.marketAddress);

      if (!swapPath) {
        return undefined;
      }

      const swapPathStats = getSwapPathStats({
        marketsInfoData,
        swapPath,
        initialCollateralAddress: fromTokenAddress,
        wrappedNativeTokenAddress: wrappedToken.address,
        shouldUnwrapNativeToken: toTokenAddress === NATIVE_TOKEN_ADDRESS,
        shouldApplyPriceImpact: opts.shouldApplyPriceImpact,
        usdIn,
      });

      if (!swapPathStats) {
        return undefined;
      }

      return swapPathStats;
    },
    [allPaths, estimator, fromTokenAddress, marketsInfoData, toTokenAddress, wrappedToken.address]
  );

  return {
    maxSwapLiquidity: maxLiquidity,
    maxLiquiditySwapPath: maxLiquidityPath,
    allPaths,
    findSwapPath,
  };
}
