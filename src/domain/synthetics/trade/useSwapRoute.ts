import { NATIVE_TOKEN_ADDRESS, convertTokenAddress, getWrappedToken } from "config/tokens";
import { useMarketsInfo } from "domain/synthetics/markets";
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
import { BigNumber } from "ethers";
import { useVirtualInventory } from "../fees/useVirtualInventory";

export type SwapRoutesResult = {
  allPaths?: MarketEdge[][];
  maxSwapLiquidity: BigNumber;
  maxLiquiditySwapPath?: string[];
  findSwapPath: FindSwapPath;
};

export function useSwapRoutes(p: { fromTokenAddress?: string; toTokenAddress?: string }): SwapRoutesResult {
  const { fromTokenAddress, toTokenAddress } = p;
  const { chainId } = useChainId();
  const { marketsInfoData } = useMarketsInfo(chainId);
  const { virtualInventoryForSwaps } = useVirtualInventory(chainId);

  const wrappedToken = getWrappedToken(chainId);

  const isWrap = fromTokenAddress === NATIVE_TOKEN_ADDRESS && toTokenAddress === wrappedToken.address;
  const isUnwrap = fromTokenAddress === wrappedToken.address && toTokenAddress === NATIVE_TOKEN_ADDRESS;
  const isSameToken = fromTokenAddress === toTokenAddress;

  const wrappedFromAddress = fromTokenAddress ? convertTokenAddress(chainId, fromTokenAddress, "wrapped") : undefined;
  const wrappedToAddress = toTokenAddress ? convertTokenAddress(chainId, toTokenAddress, "wrapped") : undefined;

  const { graph, estimator } = useMemo(() => {
    if (!marketsInfoData || !virtualInventoryForSwaps) {
      return {};
    }

    return {
      graph: getMarketsGraph(Object.values(marketsInfoData)),
      estimator: createSwapEstimator(marketsInfoData, virtualInventoryForSwaps),
    };
  }, [marketsInfoData, virtualInventoryForSwaps]);

  const allPaths = useMemo(() => {
    if (!graph || !wrappedFromAddress || !wrappedToAddress || isWrap || isUnwrap || isSameToken) {
      return undefined;
    }

    const p = findAllPaths(graph, wrappedFromAddress, wrappedToAddress);

    return p;
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
      if (!allPaths || !estimator || !marketsInfoData || !fromTokenAddress || !virtualInventoryForSwaps) {
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
        virtualInventoryForSwaps,
      });

      if (!swapPathStats) {
        return undefined;
      }

      return swapPathStats;
    },
    [
      allPaths,
      estimator,
      fromTokenAddress,
      marketsInfoData,
      toTokenAddress,
      virtualInventoryForSwaps,
      wrappedToken.address,
    ]
  );

  return {
    maxSwapLiquidity: maxLiquidity,
    maxLiquiditySwapPath: maxLiquidityPath,
    allPaths,
    findSwapPath,
  };
}
