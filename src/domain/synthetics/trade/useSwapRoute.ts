import { NATIVE_TOKEN_ADDRESS, convertTokenAddress, getWrappedToken } from "config/tokens";
import { useMarketsInfo } from "domain/synthetics/markets";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { useCallback, useMemo } from "react";
import { createSwapEstimator, findAllPaths, getBestSwapPath, getMarketsGraph, getSwapPathStats } from "./utils/index";

export function useSwapRoute(p: { fromTokenAddress?: string; toTokenAddress?: string }) {
  const { chainId } = useChainId();
  const { marketsInfoData } = useMarketsInfo(chainId);

  const wrappedToken = getWrappedToken(chainId);

  const graph = useMemo(() => {
    return getMarketsGraph(Object.values(marketsInfoData));
  }, [marketsInfoData]);

  const paths = useMemo(() => {
    const fromAddress = p.fromTokenAddress ? convertTokenAddress(chainId, p.fromTokenAddress, "wrapped") : undefined;
    const toAddress = p.toTokenAddress ? convertTokenAddress(chainId, p.toTokenAddress, "wrapped") : undefined;

    if (!fromAddress || !toAddress) {
      return undefined;
    }

    if (fromAddress === toAddress) {
      return [];
    }

    const allPaths = findAllPaths(graph, fromAddress, toAddress);

    return allPaths;
  }, [chainId, graph, p.fromTokenAddress, p.toTokenAddress]);

  const findSwapPath = useCallback(
    (usdIn: BigNumber, opts: { disablePriceImpact?: boolean } = {}) => {
      if (!paths || !p.fromTokenAddress || !p.toTokenAddress) {
        return undefined;
      }

      let swapPath: string[] | undefined;

      const isWrap = p.fromTokenAddress === NATIVE_TOKEN_ADDRESS && p.toTokenAddress === wrappedToken.address;
      const isUnwrap = p.fromTokenAddress === wrappedToken.address && p.toTokenAddress === NATIVE_TOKEN_ADDRESS;
      const isSameToken = p.fromTokenAddress === p.toTokenAddress;

      if (isWrap || isUnwrap || isSameToken) {
        swapPath = [];
      } else {
        const estimator = createSwapEstimator(marketsInfoData);

        const bestSwapPathEdges = getBestSwapPath(paths, usdIn, estimator);

        swapPath = bestSwapPathEdges?.map((edge) => edge.marketAddress);
      }

      if (!swapPath) {
        return undefined;
      }

      const swapPathStats = getSwapPathStats(
        chainId,
        marketsInfoData,
        swapPath,
        p.fromTokenAddress,
        p.toTokenAddress,
        usdIn,
        opts
      );

      if (!swapPathStats) {
        return undefined;
      }

      return swapPathStats;
    },
    [chainId, marketsInfoData, p.fromTokenAddress, p.toTokenAddress, paths, wrappedToken.address]
  );

  return {
    findSwapPath,
  };
}
