import { useChainId } from "lib/chains";
import { getMarkets, useMarketsData, useMarketsPoolsData } from "domain/synthetics/markets";
import { BigNumber } from "ethers";
import { useMemo } from "react";
import { debounce } from "lodash";
import { SwapData, findSwapPath, getMarketsGraph, getSwapParamsForPosition } from "./swapPath";

const debouncedFindSwapPath: typeof findSwapPath = debounce(findSwapPath, 100);
const debouncedGetSwapParamsForPosition: typeof getSwapParamsForPosition = debounce(getSwapParamsForPosition, 100);

export type SwapRoute = {
  market?: string;
  swapPath: string[];
};

export function useSwapRoute(p: {
  fromToken?: string;
  toToken?: string;
  indexToken?: string;
  isSwap?: boolean;
  amount?: BigNumber;
}): SwapRoute | undefined {
  const { chainId } = useChainId();
  const marketsData = useMarketsData(chainId);
  const poolsData = useMarketsPoolsData(chainId);

  const graph = useMemo(() => {
    const markets = getMarkets(marketsData);

    return getMarketsGraph(markets).collateralsGraph;
  }, [marketsData]);

  const swapRoute = useMemo(() => {
    if (!p.fromToken || !p.toToken || !p.amount) return undefined;

    const swapData: SwapData = {
      marketsData,
      poolsData,
      fromToken: p.fromToken,
      toToken: p.toToken,
      indexToken: p.indexToken,
      amount: p.amount,
    };

    if (p.isSwap) {
      const swapPath = debouncedFindSwapPath(swapData, graph);

      if (!swapPath) return undefined;

      return {
        swapPath: swapPath.map((p) => p.market),
      };
    }

    const positionParams = debouncedGetSwapParamsForPosition(swapData, graph);

    if (!positionParams) return undefined;

    return {
      swapPath: positionParams.swapPath.map((p) => p.market),
      market: positionParams.market,
    };
  }, [graph, marketsData, p.amount, p.fromToken, p.indexToken, p.isSwap, p.toToken, poolsData]);

  return swapRoute;
}
