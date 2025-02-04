import { getSwapDebugSettings, SWAP_PRICE_IMPACT_FOR_EXTERNAL_SWAP_THRESHOLD_BPS } from "config/externalSwaps";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  selectExternalSwapFails,
  selectMarketsInfoData,
  selectPositionsInfoData,
  selectSetExternalSwapFails,
  selectSetExternalSwapQuote,
  selectTokensData,
  selectUiFeeFactor,
  selectUserReferralInfo,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxAllowedSlippage,
  selectTradeboxCollateralTokenAddress,
  selectTradeboxFindSwapPath,
  selectTradeboxFromTokenAddress,
  selectTradeboxFromTokenAmount,
  selectTradeBoxLeverage,
  selectTradeboxLeverageStrategy,
  selectTradeboxMarketAddress,
  selectTradeboxSelectedPositionKey,
  selectTradeboxToTokenAddress,
  selectTradeboxToTokenAmount,
  selectTradeboxTradeMode,
  selectTradeboxTradeType,
  selectTradeboxTriggerPrice,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { createTradeFlags } from "context/SyntheticsStateContext/selectors/tradeSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { ExternalSwapQuote, useExternalSwapsQuote } from "domain/synthetics/externalSwaps/useExternalSwapsQuote";
import { getPositionFee } from "domain/synthetics/fees";
import { convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import {
  getMarkPrice,
  getSwapAmountsByFromValue,
  getSwapAmountsByToValue,
  leverageBySizeValues,
} from "domain/synthetics/trade";
import { getIsEquivalentTokens } from "domain/tokens";
import { useChainId } from "lib/chains";
import { getByKey } from "lib/objects";
import { mustNeverExist } from "lib/types";
import React, { createContext, useContext, useEffect, useMemo } from "react";
import { bigMath } from "sdk/utils/bigmath";
import { getFeeItem } from "sdk/utils/fees";
import { applyFactor } from "sdk/utils/numbers";
import { useContextSelector } from "use-context-selector";

type ExternalSwapsContextType = {
  externalSwapQuote?: ExternalSwapQuote;
};

const ExternalSwapsContext = createContext<ExternalSwapsContextType>({ externalSwapQuote: undefined });

const swapDebugSettings = getSwapDebugSettings();

export function ExternalSwapsContextProvider({ children }: { children: React.ReactNode }) {
  const { chainId } = useChainId();
  const settings = useSettings();
  const tradeMode = useSelector(selectTradeboxTradeMode);
  const tradeType = useSelector(selectTradeboxTradeType);
  const tradeFlags = createTradeFlags(tradeType, tradeMode);
  const tokensData = useSelector(selectTokensData);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const positionsInfoData = useSelector(selectPositionsInfoData);
  const fromTokenAddress = useSelector(selectTradeboxFromTokenAddress);
  const toTokenAddress = useSelector(selectTradeboxToTokenAddress);
  const userReferralInfo = useSelector(selectUserReferralInfo);
  const collateralTokenAddress = useSelector(selectTradeboxCollateralTokenAddress);
  const triggerPrice = useSelector(selectTradeboxTriggerPrice);
  const marketAddress = useSelector(selectTradeboxMarketAddress);
  const fromToken = getByKey(tokensData, fromTokenAddress);
  const toToken = getByKey(tokensData, toTokenAddress);
  const collateralToken = getByKey(tokensData, collateralTokenAddress);
  const fromTokenAmount = useSelector(selectTradeboxFromTokenAmount);
  const toTokenAmount = useSelector(selectTradeboxToTokenAmount);
  const slippage = useSelector(selectTradeboxAllowedSlippage);
  const existingPositionKey = useSelector(selectTradeboxSelectedPositionKey);
  const marketInfo = getByKey(marketsInfoData, marketAddress);
  const leverage = useSelector(selectTradeBoxLeverage);
  const strategy = useSelector(selectTradeboxLeverageStrategy);
  const existingPosition = getByKey(positionsInfoData, existingPositionKey);
  const setExternalSwapQuote = useSelector(selectSetExternalSwapQuote);
  const findSwapPath = useSelector(selectTradeboxFindSwapPath);
  const externalSwapFails = useSelector(selectExternalSwapFails);
  const setExternalSwapFails = useSelector(selectSetExternalSwapFails);
  const uiFeeFactor = useSelector(selectUiFeeFactor);

  const swapToTokenAddress = tradeFlags.isSwap ? toTokenAddress : collateralTokenAddress;

  const { amountIn, priceIn, usdOut, baseUsdIn, baseAmountIn, internalSwapPriceImpact, internalSwapFeesDeltaUsd } =
    useMemo(() => {
      if (tradeFlags.isIncrease) {
        switch (strategy) {
          case "leverageByCollateral":
          case "independent": {
            if (!fromToken || !collateralToken) {
              return {};
            }

            const swapAmounts = getSwapAmountsByFromValue({
              tokenIn: fromToken,
              tokenOut: collateralToken,
              amountIn: fromTokenAmount,
              isLimit: false,
              externalSwapQuote: undefined,
              findSwapPath,
              uiFeeFactor,
            });

            const internalSwapPriceImpact = getFeeItem(
              swapAmounts.swapPathStats?.totalSwapPriceImpactDeltaUsd,
              swapAmounts.usdIn
            );

            const internalSwapFeesDeltaUsd = swapAmounts.swapPathStats
              ? -swapAmounts.swapPathStats.totalSwapFeeUsd + swapAmounts.swapPathStats.totalSwapPriceImpactDeltaUsd
              : 0n;

            return {
              amountIn: fromTokenAmount,
              internalSwapPriceImpact,
              internalSwapFeesDeltaUsd,
            };
          }

          case "leverageBySize": {
            if (!toToken || !collateralToken || !marketInfo || !fromToken) {
              return {};
            }

            const indexPrice =
              tradeFlags.isLimit && triggerPrice !== undefined
                ? triggerPrice
                : getMarkPrice({ prices: toToken.prices, isIncrease: true, isLong: tradeFlags.isLong });

            const collateralPrice = getIsEquivalentTokens(toToken, collateralToken)
              ? indexPrice
              : collateralToken.prices.minPrice;

            const sizeDeltaUsd = convertToUsd(toTokenAmount, toToken.decimals, indexPrice)!;

            const positionFeeInfo = getPositionFee(marketInfo, sizeDeltaUsd, false, userReferralInfo);

            const positionFeeUsd = positionFeeInfo.positionFeeUsd;
            const uiFeeUsd = applyFactor(sizeDeltaUsd, uiFeeFactor);

            const { baseCollateralAmount } = leverageBySizeValues({
              collateralToken,
              leverage,
              sizeDeltaUsd,
              collateralPrice,
              uiFeeFactor,
              positionFeeUsd,
              fundingFeeUsd: existingPosition?.pendingFundingFeesUsd || 0n,
              borrowingFeeUsd: existingPosition?.pendingBorrowingFeesUsd || 0n,
              uiFeeUsd,
              swapUiFeeUsd: 0n,
            });

            const usdOut = convertToUsd(
              baseCollateralAmount,
              collateralToken.decimals,
              collateralToken.prices.maxPrice
            );
            const baseUsdIn = usdOut;
            const baseAmountIn = convertToTokenAmount(baseUsdIn, fromToken.decimals, fromToken.prices.minPrice);

            const swapAmounts = getSwapAmountsByToValue({
              tokenIn: fromToken,
              tokenOut: collateralToken,
              amountOut: baseCollateralAmount,
              isLimit: false,
              externalSwapQuote: undefined,
              findSwapPath,
              uiFeeFactor,
            });

            const internalSwapPriceImpact = getFeeItem(
              swapAmounts.swapPathStats?.totalSwapPriceImpactDeltaUsd,
              swapAmounts.usdIn
            );

            const internalSwapFeesDeltaUsd = swapAmounts.swapPathStats
              ? -swapAmounts.swapPathStats.totalSwapFeeUsd + swapAmounts.swapPathStats.totalSwapPriceImpactDeltaUsd
              : 0n;

            return {
              priceIn: fromToken.prices.minPrice,
              priceOut: collateralToken.prices.maxPrice,
              usdOut,
              baseUsdIn,
              baseAmountIn,
              internalSwapPriceImpact,
              internalSwapFeesDeltaUsd,
            };
          }

          default: {
            mustNeverExist(strategy);
          }
        }
      }

      return {};
    }, [
      tradeFlags.isIncrease,
      tradeFlags.isLimit,
      tradeFlags.isLong,
      fromToken,
      toToken,
      fromTokenAmount,
      findSwapPath,
      uiFeeFactor,
      strategy,
      collateralToken,
      marketInfo,
      triggerPrice,
      toTokenAmount,
      userReferralInfo,
      leverage,
      existingPosition?.pendingFundingFeesUsd,
      existingPosition?.pendingBorrowingFeesUsd,
    ]);

  const swapPriceImpactForExternalSwapThresholdBps =
    swapDebugSettings?.swapPriceImpactForExternalSwapThresholdBps || SWAP_PRICE_IMPACT_FOR_EXTERNAL_SWAP_THRESHOLD_BPS;

  const isExternalSwapsEnabled = settings.externalSwapsEnabled && !externalSwapFails;
  const isSwapImpactConditionMet =
    // np internal swap or negative swap impact is less than threshold
    !internalSwapPriceImpact || internalSwapPriceImpact.bps < swapPriceImpactForExternalSwapThresholdBps;
  const debugForceExternalSwaps = swapDebugSettings?.forceExternalSwaps || false;

  const { externalSwapQuote: baseExternalSwapQuote } = useExternalSwapsQuote({
    chainId,
    tokensData,
    fromTokenAddress,
    toTokenAddress: swapToTokenAddress,
    fromTokenAmount: baseAmountIn ?? amountIn,
    slippage,
    enabled: debugForceExternalSwaps || (isExternalSwapsEnabled && isSwapImpactConditionMet),
  });

  const isInternalSwapBetter =
    (!debugForceExternalSwaps && !baseExternalSwapQuote) ||
    (internalSwapFeesDeltaUsd !== undefined &&
      baseExternalSwapQuote &&
      internalSwapFeesDeltaUsd > -baseExternalSwapQuote.feesUsd);

  // console.log(
  //   "externalSwapQuote",
  //   baseExternalSwapQuote,
  //   Boolean(
  //     settings.externalSwapsEnabled &&
  //       (!internalSwapPriceImpact || internalSwapPriceImpact.bps < swapPriceImpactForExternalSwapThresholdBps)
  //   )
  // );

  const adjustedExternalSwapQuote = useMemo(() => {
    if (!baseExternalSwapQuote || isInternalSwapBetter) {
      return undefined;
    }

    if (
      tradeFlags.isIncrease &&
      strategy === "leverageBySize" &&
      baseUsdIn !== undefined &&
      usdOut !== undefined &&
      fromToken &&
      priceIn !== undefined
    ) {
      const adjustedExternalSwapQuote = { ...baseExternalSwapQuote };
      const adjustedUsdIn =
        baseExternalSwapQuote.outputUsd > 0 ? bigMath.mulDiv(baseUsdIn, usdOut, baseExternalSwapQuote.outputUsd) : 0n;

      adjustedExternalSwapQuote.fromTokenUsd = adjustedUsdIn;
      adjustedExternalSwapQuote.fromTokenAmount = convertToTokenAmount(adjustedUsdIn, fromToken.decimals, priceIn)!;

      return adjustedExternalSwapQuote;
    }

    return baseExternalSwapQuote;
  }, [
    baseExternalSwapQuote,
    baseUsdIn,
    fromToken,
    isInternalSwapBetter,
    priceIn,
    strategy,
    tradeFlags.isIncrease,
    usdOut,
  ]);

  useEffect(() => {
    setExternalSwapQuote(adjustedExternalSwapQuote);
  }, [adjustedExternalSwapQuote, setExternalSwapQuote]);

  const state = useMemo(() => {
    return {
      externalSwapQuote: adjustedExternalSwapQuote,
    };
  }, [adjustedExternalSwapQuote]);

  return <ExternalSwapsContext.Provider value={state}>{children}</ExternalSwapsContext.Provider>;
}

export function useExternalSwapsContext() {
  return useContext(ExternalSwapsContext);
}

export function useExternalSwapsSelector<Selected>(selector: (state: ExternalSwapsContextType) => Selected) {
  const value = useContext(ExternalSwapsContext);

  if (!value) {
    throw new Error("Used useExternalSwapsSelector outside of ExternalSwapsContextProvider");
  }

  return useContextSelector(ExternalSwapsContext, selector);
}
