import { TradeMode, TradeType } from "domain/synthetics/trade";
import { BigNumber } from "ethers";
import { useMemo } from "react";
import {
  createTradeFlags,
  makeSelectDecreasePositionAmounts,
  makeSelectIncreasePositionAmounts,
  makeSelectNextPositionValuesForDecrease,
  makeSelectNextPositionValuesForIncrease,
  makeSelectSwapAmounts,
  makeSelectSwapRoutes,
  makeSelectTradeRatios,
} from "../selectors/tradeSelectors";
import { useSelector } from "../utils";

export const useIncreasePositionAmounts = ({
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
}: {
  initialCollateralTokenAddress: string | undefined;
  indexTokenAddress: string | undefined;
  positionKey: string | undefined;
  tradeMode: TradeMode;
  tradeType: TradeType;
  collateralTokenAddress: string | undefined;
  marketAddress: string | undefined;
  initialCollateralAmount: BigNumber;
  indexTokenAmount: BigNumber;
  leverage: BigNumber | undefined;
  triggerPrice: BigNumber | undefined;
  fixedAcceptablePriceImpactBps: BigNumber | undefined;
  strategy: "leverageByCollateral" | "leverageBySize" | "independent";
}) => {
  const selector = useMemo(
    () =>
      makeSelectIncreasePositionAmounts({
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
      tradeMode,
      tradeType,
      triggerPrice,
    ]
  );
  return useSelector(selector);
};

export const useDecreasePositionAmounts = ({
  collateralTokenAddress,
  marketAddress,
  positionKey,
  tradeMode,
  tradeType,
  triggerPrice,
  closeSizeUsd,
  keepLeverage,
  fixedAcceptablePriceImpactBps,
}: {
  positionKey: string | undefined;
  tradeMode: TradeMode;
  tradeType: TradeType;
  collateralTokenAddress: string | undefined;
  marketAddress: string | undefined;
  triggerPrice: BigNumber | undefined;
  closeSizeUsd: BigNumber | undefined;
  fixedAcceptablePriceImpactBps: BigNumber | undefined;
  keepLeverage: boolean;
}) => {
  const selector = useMemo(
    () =>
      makeSelectDecreasePositionAmounts({
        collateralTokenAddress,
        marketAddress,
        positionKey,
        tradeMode,
        tradeType,
        triggerPrice,
        closeSizeUsd,
        keepLeverage,
        fixedAcceptablePriceImpactBps,
      }),
    [
      closeSizeUsd,
      collateralTokenAddress,
      fixedAcceptablePriceImpactBps,
      keepLeverage,
      marketAddress,
      positionKey,
      tradeMode,
      tradeType,
      triggerPrice,
    ]
  );
  return useSelector(selector);
};

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
      tradeMode,
      tradeType,
      triggerPrice,
    ]
  );
  return useSelector(selector);
};

export const useNextPositionValuesForDecrease = ({
  closeSizeUsd,
  collateralTokenAddress,
  fixedAcceptablePriceImpactBps,
  keepLeverage,
  marketAddress,
  positionKey,
  tradeMode,
  tradeType,
  triggerPrice,
}: {
  closeSizeUsd: BigNumber | undefined;
  collateralTokenAddress: string | undefined;
  fixedAcceptablePriceImpactBps: BigNumber | undefined;
  keepLeverage: boolean;
  marketAddress: string | undefined;
  positionKey: string | undefined;
  tradeMode: TradeMode;
  tradeType: TradeType;
  triggerPrice: BigNumber | undefined;
}) => {
  const selector = useMemo(
    () =>
      makeSelectNextPositionValuesForDecrease({
        collateralTokenAddress,
        fixedAcceptablePriceImpactBps,
        marketAddress,
        positionKey,
        tradeMode,
        tradeType,
        triggerPrice,
        closeSizeUsd,
        keepLeverage,
      }),
    [
      closeSizeUsd,
      collateralTokenAddress,
      fixedAcceptablePriceImpactBps,
      keepLeverage,
      marketAddress,
      positionKey,
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

export const useSwapAmounts = ({
  amountBy,
  fromTokenAddress,
  fromTokenAmount,
  isWrapOrUnwrap,
  toTokenAddress,
  toTokenAmount,
  tradeMode,
  triggerRatioValue,
}: {
  fromTokenAddress: string | undefined;
  toTokenAddress: string | undefined;
  tradeMode: TradeMode;
  isWrapOrUnwrap: boolean;
  amountBy: "from" | "to" | undefined;
  fromTokenAmount: BigNumber;
  toTokenAmount: BigNumber;
  triggerRatioValue: BigNumber | undefined;
}) => {
  const selector = useMemo(
    () =>
      makeSelectSwapAmounts({
        amountBy,
        fromTokenAddress,
        fromTokenAmount,
        isWrapOrUnwrap,
        toTokenAddress,
        toTokenAmount,
        tradeMode,
        triggerRatioValue,
      }),
    [
      amountBy,
      fromTokenAddress,
      fromTokenAmount,
      isWrapOrUnwrap,
      toTokenAddress,
      toTokenAmount,
      tradeMode,
      triggerRatioValue,
    ]
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
