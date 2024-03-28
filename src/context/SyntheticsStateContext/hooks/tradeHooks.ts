import { TradeMode, TradeType } from "domain/synthetics/trade";
import { BigNumber } from "ethers";
import { useMemo } from "react";
import {
  TokenTypeForSwapRoute,
  createTradeFlags,
  makeSelectNextPositionValuesForIncrease,
  makeSelectSwapRoutes,
  makeSelectTradeRatios,
} from "../selectors/tradeSelectors";
import { useSelector } from "../utils";
import { selectMarketsInfoData, selectTokensData } from "../selectors/globalSelectors";

export const useNextPositionValuesForIncrease = ({
  collateralTokenAddress,
  fixedAcceptablePriceImpactBps,
  initialCollateralTokenAddress,
  initialCollateralAmount,
  leverage,
  marketAddress,
  positionKey,
  strategy,
  indexTokenAddress,
  indexTokenAmount,
  tradeMode,
  tradeType,
  triggerPrice,
  tokenTypeForSwapRoute,
}: {
  initialCollateralTokenAddress: string | undefined;
  indexTokenAddress: string | undefined;
  positionKey: string | undefined;
  tradeMode: TradeMode;
  tradeType: TradeType;
  collateralTokenAddress: string | undefined;
  marketAddress: string | undefined;
  initialCollateralAmount: BigNumber;
  indexTokenAmount: BigNumber | undefined;
  leverage: BigNumber | undefined;
  triggerPrice: BigNumber | undefined;
  fixedAcceptablePriceImpactBps: BigNumber | undefined;
  strategy: "leverageByCollateral" | "leverageBySize" | "independent";
  tokenTypeForSwapRoute: TokenTypeForSwapRoute;
}) => {
  const selector = useMemo(
    () =>
      makeSelectNextPositionValuesForIncrease({
        collateralTokenAddress,
        fixedAcceptablePriceImpactBps,
        initialCollateralTokenAddress,
        initialCollateralAmount,
        leverage,
        marketAddress,
        positionKey,
        increaseStrategy: strategy,
        indexTokenAddress,
        indexTokenAmount,
        tradeMode,
        tradeType,
        triggerPrice,
        tokenTypeForSwapRoute,
      }),
    [
      collateralTokenAddress,
      fixedAcceptablePriceImpactBps,
      indexTokenAddress,
      indexTokenAmount,
      initialCollateralAmount,
      initialCollateralTokenAddress,
      leverage,
      marketAddress,
      positionKey,
      strategy,
      tokenTypeForSwapRoute,
      tradeMode,
      tradeType,
      triggerPrice,
    ]
  );
  return useSelector(selector);
};

export const useSwapRoutes = (fromTokenAddress: string | undefined, toTokenAddress: string | undefined) => {
  const selector = useMemo(
    () => makeSelectSwapRoutes(fromTokenAddress, toTokenAddress),
    [fromTokenAddress, toTokenAddress]
  );
  return useSelector(selector);
};

export const useTradeRatios = ({
  fromTokenAddress,
  toTokenAddress,
  tradeType,
  tradeMode,
  triggerRatioValue,
}: {
  fromTokenAddress: string | undefined;
  toTokenAddress: string | undefined;
  tradeType: TradeType;
  tradeMode: TradeMode;
  triggerRatioValue: BigNumber | undefined;
}) => {
  const selector = useMemo(
    () =>
      makeSelectTradeRatios({
        fromTokenAddress,
        toTokenAddress,
        tradeType,
        tradeMode,
        triggerRatioValue,
      }),
    [fromTokenAddress, toTokenAddress, tradeType, tradeMode, triggerRatioValue]
  );
  return useSelector(selector);
};

export const useTradeFlags = ({ tradeType, tradeMode }: { tradeType: TradeType; tradeMode: TradeMode }) => {
  return useMemo(() => createTradeFlags(tradeType, tradeMode), [tradeType, tradeMode]);
};

// const market = q((s) => selectMarketsInfoData(s)?.[position.market]);

export const useMarketInfo = (marketAddress: string | undefined) => {
  return useSelector((s) => (marketAddress ? selectMarketsInfoData(s)?.[marketAddress] : undefined));
};

export const useTokenInfo = (tokenAddress: string | undefined) => {
  return useSelector((s) => (tokenAddress ? selectTokensData(s)?.[tokenAddress] : undefined));
};
