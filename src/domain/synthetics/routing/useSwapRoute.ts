import { convertTokenAddress } from "config/tokens";
import { useMarketsData, useMarketsPoolsData, useOpenInterestData } from "domain/synthetics/markets";
import { useAvailableTokensData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { useCallback, useMemo, useState } from "react";
import { useMarketsFeesConfigs } from "../fees/useMarketsFeesConfigs";
import { createSwapEstimator, findAllPaths, getBestSwapPath, getMarketsGraph } from "./utils";

export type SwapRoute = {
  findSwapPath: (usdIn: BigNumber) => string[] | undefined;
  positionMarketAddress?: string;
  mostLiquidMarketAddressForSwap?: string;
};

export function useSwapRoute(p: {
  initialColltaralAddress?: string;
  targetCollateralAddress?: string;
  indexTokenAddress?: string;
  initialCollateralAmount?: BigNumber;
  sizeDeltaUsd?: BigNumber;
  isLong?: boolean;
}): SwapRoute {
  const { chainId } = useChainId();
  const [mostAbundantSwapMarketAddress, setMostAbundantSwapMarketAddress] = useState<string>();

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

  //   const indexAddress = p.indexTokenAddress ? convertTokenAddress(chainId, p.indexTokenAddress, "wrapped") : undefined;

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

  //   useEffect(() => {
  //     if (!paths) {
  //       setSwapPath(undefined);
  //       return;
  //     }

  //     if (fromAddress === toAddress) {
  //       setSwapPath([]);
  //       return;
  //     }

  //     const estimator = createSwapEstimator(marketsData, poolsData, openInterestData, tokensData, marketsFeesConfigs);

  //     const tokenIn = getTokenData(tokensData, fromAddress);
  //     const usdIn = convertToUsd(p.initialCollateralAmount, tokenIn?.decimals, tokenIn?.prices?.minPrice);

  //     if (!usdIn) {
  //       setSwapPath(undefined);
  //       return;
  //     }

  //     const bestSwapPath = getBestSwapPath(paths, usdIn, estimator);
  //     const addresses = bestSwapPath?.map((edge) => edge.marketAddress);

  //     setSwapPath(addresses);
  //   }, [
  //     fromAddress,
  //     marketsData,
  //     marketsFeesConfigs,
  //     openInterestData,
  //     p.initialCollateralAmount,
  //     paths,
  //     poolsData,
  //     toAddress,
  //     tokensData,
  //   ]);

  //   useEffect(() => {
  //     if (!indexAddress || p.isLong === undefined) {
  //       setPositionMarketAddress(undefined);
  //       return;
  //     }

  //     const bestMarket = getMostLiquidMarketForPosition(
  //       marketsData,
  //       poolsData,
  //       openInterestData,
  //       tokensData,
  //       indexAddress,
  //       toAddress,
  //       p.sizeDeltaUsd,
  //       p.isLong
  //     );

  //     setPositionMarketAddress(bestMarket);
  //   }, [indexAddress, p.isLong, p.sizeDeltaUsd, marketsData, tokensData, poolsData, openInterestData, toAddress]);

  //   useEffect(() => {
  //     const targetCollateralAddress = convertTokenAddress(chainId, p.targetCollateralAddress!, "wrapped");

  //     const market = getMostLiquidMarketForSwap(
  //       marketsData,
  //       poolsData,
  //       openInterestData,
  //       tokensData,
  //       targetCollateralAddress
  //     );

  //     setMostAbundantSwapMarketAddress(market);
  //   }, [chainId, marketsData, openInterestData, p.targetCollateralAddress, poolsData, tokensData]);

  return {
    findSwapPath,
    // positionMarketAddress,
    mostLiquidMarketAddressForSwap: mostAbundantSwapMarketAddress,
  };
}
