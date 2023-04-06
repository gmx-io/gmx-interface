import { NATIVE_TOKEN_ADDRESS, convertTokenAddress, getWrappedToken } from "config/tokens";
import { useMarketsInfo } from "domain/synthetics/markets";
import { useChainId } from "lib/chains";
import { useCallback, useMemo } from "react";
import { FindSwapPath, MarketEdge } from "./types";
import { createSwapEstimator, findAllPaths, getBestSwapPath, getMarketsGraph, getSwapPathStats } from "./utils";
import { BigNumber } from "ethers";

export type SwapRoutesResult = {
  allPaths?: MarketEdge[][];
  findSwapPath: FindSwapPath;
};

export function useSwapRoutes(p: { fromTokenAddress?: string; toTokenAddress?: string }): SwapRoutesResult {
  const { fromTokenAddress, toTokenAddress } = p;
  const { chainId } = useChainId();
  const { marketsInfoData } = useMarketsInfo(chainId);
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

    return findAllPaths(graph, wrappedFromAddress, wrappedToAddress);
  }, [graph, isSameToken, isUnwrap, isWrap, wrappedFromAddress, wrappedToAddress]);

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
    allPaths,
    findSwapPath,
  };
}
