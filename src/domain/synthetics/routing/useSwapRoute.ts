import { convertTokenAddress } from "config/tokens";
import { useMarketsData, useMarketsPoolsData, useOpenInterestData } from "domain/synthetics/markets";
import { useAvailableTokensData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { useCallback, useMemo } from "react";
import { useMarketsFeesConfigs } from "../fees/useMarketsFeesConfigs";
import { createSwapEstimator, findAllPaths, getBestSwapPath, getMarketsGraph } from "./utils";

export type SwapRoute = {
  findSwapPath: (usdIn: BigNumber) => string[] | undefined;
};

export function useSwapRoute(p: { initialColltaralAddress?: string; targetCollateralAddress?: string }): SwapRoute {
  const { chainId } = useChainId();

  const { marketsData } = useMarketsData(chainId);
  const { poolsData } = useMarketsPoolsData(chainId);
  const { openInterestData } = useOpenInterestData(chainId);
  const { marketsFeesConfigs } = useMarketsFeesConfigs(chainId);
  const { tokensData } = useAvailableTokensData(chainId);

  const fromAddress = p.initialColltaralAddress
    ? convertTokenAddress(chainId, p.initialColltaralAddress, "wrapped")
    : undefined;

  const toAddress = p.targetCollateralAddress
    ? convertTokenAddress(chainId, p.targetCollateralAddress, "wrapped")
    : undefined;

  const graph = useMemo(() => {
    return getMarketsGraph(marketsData);
  }, [marketsData]);

  const paths = useMemo(() => {
    if (!fromAddress || !toAddress) {
      return undefined;
    }

    if (fromAddress === toAddress) {
      return [];
    }

    const p = findAllPaths(graph, fromAddress, toAddress);

    return p;
  }, [fromAddress, graph, toAddress]);

  const findSwapPath = useCallback(
    (usdIn: BigNumber) => {
      if (!paths) {
        return undefined;
      }

      if (fromAddress === toAddress) {
        return [];
      }

      const estimator = createSwapEstimator(marketsData, poolsData, openInterestData, tokensData, marketsFeesConfigs);

      const bestSwapPath = getBestSwapPath(paths, usdIn, estimator);

      const addresses = bestSwapPath?.map((edge) => edge.marketAddress);

      return addresses;
    },
    [fromAddress, marketsData, marketsFeesConfigs, openInterestData, paths, poolsData, toAddress, tokensData]
  );

  return {
    findSwapPath,
  };
}
