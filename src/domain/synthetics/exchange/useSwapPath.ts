import { getPoolAmountUsd, useMarketsData, useMarketsPoolsData } from "domain/synthetics/markets";
import { BigNumber, ethers } from "ethers";
import { useChainId } from "lib/chains";
import { debounce } from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SwapParams, SwapPathItem, findSwapPath, getMarketsGraph, getSwapPathForPosition } from "./swapPath";
import { getSwapFee, usePriceImpactConfigs } from "domain/synthetics/fees";
import { useAvailableTokensData } from "domain/synthetics/tokens";
import { getConvertedTokenAddress } from "config/tokens";

export type SwapRoute = {
  market?: string;
  swapPath: string[];
  swapFeesUsd: BigNumber;
  fullSwapPath?: SwapPathItem[];
};

export function useSwapPath(p: {
  isSwap: boolean;
  fromToken?: string;
  toToken?: string;

  // for positions
  indexToken?: string;
  collateralToken?: string;

  // which amount?
  amountUsd?: BigNumber;
}): SwapRoute | undefined {
  const { chainId } = useChainId();

  const [swapPath, setSwapPath] = useState<string[] | undefined>();
  const [market, setMarket] = useState<string | undefined>();
  const [swapFeesUsd, setSwapFeesUsd] = useState<BigNumber | undefined>();
  const [fullSwapPath, setFullSwapPath] = useState<SwapPathItem[]>();

  const { marketsData } = useMarketsData(chainId);
  const { poolsData } = useMarketsPoolsData(chainId);
  const { tokensData } = useAvailableTokensData(chainId);
  const priceImpactConfigsData = usePriceImpactConfigs(chainId);

  const graph = useMemo(() => {
    return getMarketsGraph(marketsData);
  }, [marketsData]);

  const feeEstimator = useCallback(
    (market: string, fromToken: string, toToken: string, amountUsd: BigNumber) => {
      const toPool = getPoolAmountUsd(marketsData, poolsData, tokensData, market, toToken);

      // TODO: check for reserves
      if (!toPool?.gt(amountUsd)) return ethers.constants.MaxUint256;

      const fees = getSwapFee(
        marketsData,
        poolsData,
        tokensData,
        priceImpactConfigsData,
        market,
        fromToken,
        toToken,
        amountUsd
      );

      // if there are no valid fees, return infinity
      if (!fees) return ethers.constants.MaxUint256;

      const totalFee = fees.swapFee.add(fees.priceImpact.impactUsd);

      return totalFee;
    },
    [marketsData, poolsData, priceImpactConfigsData, tokensData]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedUpdateSwapPath = useCallback(
    debounce((swapParams: SwapParams) => {
      const swapPath = findSwapPath(swapParams, graph);

      setSwapPath(swapPath?.map((p) => p.market));
      setSwapFeesUsd(swapPath?.reduce((acc, p) => acc.add(p.feeUsd), BigNumber.from(0)));
      setMarket(undefined);
      setFullSwapPath(swapPath);
    }, 10),
    [graph]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedUpdateSwapPathForPosition = useCallback(
    debounce((swapParams: SwapParams) => {
      const result = getSwapPathForPosition(marketsData, swapParams, graph);

      setSwapPath(result?.swapPath.map((p) => p.market));
      setSwapFeesUsd(result?.swapPath.reduce((acc, p) => acc.add(p.feeUsd), BigNumber.from(0)));
      setMarket(result?.market);
      setFullSwapPath(result?.swapPath);
    }, 10),
    [graph]
  );

  // TODO: find all paths and estimate fees after that
  useEffect(() => {
    if (!p.amountUsd?.gt(0)) return;

    if (p.isSwap) {
      if (!p.fromToken || !p.toToken) return;

      const fromToken = getConvertedTokenAddress(chainId, p.fromToken, "wrapped");
      const toToken = getConvertedTokenAddress(chainId, p.toToken, "wrapped");

      debouncedUpdateSwapPath({
        fromToken: fromToken,
        toToken: toToken,
        indexToken: p.indexToken,
        amountUsd: p.amountUsd,
        feeEstimator,
      });
    } else {
      if (!p.fromToken || !p.collateralToken || !p.indexToken) return;

      // Todo: to swapPath
      const fromToken = getConvertedTokenAddress(chainId, p.fromToken, "wrapped");
      const toToken = getConvertedTokenAddress(chainId, p.collateralToken, "wrapped");
      const indexToken = getConvertedTokenAddress(chainId, p.indexToken, "wrapped");

      debouncedUpdateSwapPathForPosition({
        fromToken: fromToken,
        toToken: toToken,
        indexToken,
        amountUsd: p.amountUsd,
        feeEstimator,
      });
    }
  }, [
    chainId,
    debouncedUpdateSwapPath,
    debouncedUpdateSwapPathForPosition,
    feeEstimator,
    p.amountUsd,
    p.collateralToken,
    p.fromToken,
    p.indexToken,
    p.isSwap,
    p.toToken,
  ]);

  if (!swapPath || !swapFeesUsd) return undefined;

  return {
    swapPath,
    market,
    swapFeesUsd,
    fullSwapPath,
  };
}
