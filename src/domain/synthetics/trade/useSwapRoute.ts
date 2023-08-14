import { NATIVE_TOKEN_ADDRESS, convertTokenAddress, getWrappedToken } from "config/tokens";
import { MarketsInfoData } from "domain/synthetics/markets";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { useCallback, useMemo } from "react";
import { FindSwapPath } from "./types";
import {
  createSwapEstimator,
  findAllPaths,
  getBestSwapPath,
  getMarketsGraph,
  getMaxSwapPathLiquidity,
  getSwapPathStats,
} from "./utils";

export type SwapRoutesResult = {
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

  const allRoutes = useMemo(() => {
    if (!marketsInfoData || !graph || !wrappedFromAddress || !wrappedToAddress || isWrap || isUnwrap || isSameToken) {
      return undefined;
    }

    const paths = findAllPaths(marketsInfoData, graph, wrappedFromAddress, wrappedToAddress)
      ?.sort((a, b) => {
        return b.liquidity.sub(a.liquidity).gt(0) ? 1 : -1;
      })
      .slice(0, 5);

    return paths;
  }, [graph, isSameToken, isUnwrap, isWrap, marketsInfoData, wrappedFromAddress, wrappedToAddress]);

  const { maxLiquidity, maxLiquidityPath } = useMemo(() => {
    let maxLiquidity = BigNumber.from(0);
    let maxLiquidityPath: string[] | undefined = undefined;

    if (!allRoutes || !marketsInfoData || !wrappedFromAddress) {
      return { maxLiquidity, maxLiquidityPath };
    }

    for (const route of allRoutes) {
      const liquidity = getMaxSwapPathLiquidity({
        marketsInfoData,
        swapPath: route.path,
        initialCollateralAddress: wrappedFromAddress,
      });

      if (liquidity.gt(maxLiquidity)) {
        maxLiquidity = liquidity;
        maxLiquidityPath = route.path;
      }
    }

    return { maxLiquidity, maxLiquidityPath };
  }, [allRoutes, marketsInfoData, wrappedFromAddress]);

  const findSwapPath = useCallback(
    (usdIn: BigNumber, opts: { byLiquidity?: boolean }) => {
      if (!allRoutes?.length || !estimator || !marketsInfoData || !fromTokenAddress) {
        return undefined;
      }

      let swapPath: string[] | undefined = undefined;

      if (opts.byLiquidity) {
        swapPath = allRoutes[0].path;
      } else {
        swapPath = getBestSwapPath(allRoutes, usdIn, estimator);
      }

      if (!swapPath) {
        return undefined;
      }

      const swapPathStats = getSwapPathStats({
        marketsInfoData,
        swapPath,
        initialCollateralAddress: fromTokenAddress,
        wrappedNativeTokenAddress: wrappedToken.address,
        shouldUnwrapNativeToken: toTokenAddress === NATIVE_TOKEN_ADDRESS,
        shouldApplyPriceImpact: true,
        usdIn,
      });

      if (!swapPathStats) {
        return undefined;
      }

      return swapPathStats;
    },
    [allRoutes, estimator, fromTokenAddress, marketsInfoData, toTokenAddress, wrappedToken.address]
  );

  return {
    maxSwapLiquidity: maxLiquidity,
    maxLiquiditySwapPath: maxLiquidityPath,
    findSwapPath,
  };
}
