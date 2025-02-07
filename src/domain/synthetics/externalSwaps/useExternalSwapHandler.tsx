import { Trans } from "@lingui/macro";
import { isDevelopment } from "config/env";
import {
  AUTO_SWAP_FALLBACK_MAX_FEES_BPS,
  DISABLE_EXTERNAL_SWAP_AGGREGATOR_FAILS_COUNT,
  getSwapDebugSettings,
  SWAP_PRICE_IMPACT_FOR_EXTERNAL_SWAP_THRESHOLD_BPS,
} from "config/externalSwaps";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import {
  selectExternalSwapFails,
  selectSetExternalSwapFails,
  selectSetExternalSwapQuote,
} from "context/SyntheticsStateContext/selectors/externalSwapSelectors";
import {
  selectGasPrice,
  selectMarketsInfoData,
  selectPositionsInfoData,
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
import { useExternalSwapsQuote } from "domain/synthetics/externalSwaps/useExternalSwapsQuote";
import { getPositionFee } from "domain/synthetics/fees";
import { convertToTokenAmount, convertToUsd, getIsEquivalentTokens } from "domain/synthetics/tokens";
import {
  getMarkPrice,
  getSwapAmountsByFromValue,
  getSwapAmountsByToValue,
  leverageBySizeValues,
} from "domain/synthetics/trade";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { getByKey } from "lib/objects";
import { mustNeverExist } from "lib/types";
import throttle from "lodash/throttle";
import { useEffect, useMemo, useState } from "react";
import { bigMath } from "sdk/utils/bigmath";
import { getFeeItem } from "sdk/utils/fees";
import { applyFactor } from "sdk/utils/numbers";

const throttleLog = throttle((...args) => {
  // eslint-disable-next-line no-console
  console.log(...args);
}, 1000);

export function useExternalSwapHandler() {
  const { chainId } = useChainId();
  const { orderStatuses } = useSyntheticsEvents();
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
  const gasPrice = useSelector(selectGasPrice);
  const findSwapPath = useSelector(selectTradeboxFindSwapPath);

  const swapDebugSettings = getSwapDebugSettings();

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

  const [shouldFallbackToInternalSwap, setShouldFallbackToInternalSwap] = useState(false);

  const isExternalSwapsEnabled = settings.externalSwapsEnabled && !shouldFallbackToInternalSwap;
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
    gasPrice,
    enabled: debugForceExternalSwaps || (isExternalSwapsEnabled && isSwapImpactConditionMet),
  });

  const isInternalSwapBetter =
    internalSwapFeesDeltaUsd !== undefined &&
    baseExternalSwapQuote &&
    internalSwapFeesDeltaUsd > -baseExternalSwapQuote.feesUsd;

  const adjustedExternalSwapQuote = useMemo(() => {
    if (!baseExternalSwapQuote || (!debugForceExternalSwaps && isInternalSwapBetter)) {
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
    debugForceExternalSwaps,
    fromToken,
    isInternalSwapBetter,
    priceIn,
    strategy,
    tradeFlags.isIncrease,
    usdOut,
  ]);

  useEffect(() => {
    if (externalSwapFails > 0 && shouldFallbackToInternalSwap) {
      if (
        internalSwapFeesDeltaUsd !== undefined &&
        baseExternalSwapQuote &&
        internalSwapFeesDeltaUsd - -baseExternalSwapQuote.feesUsd > AUTO_SWAP_FALLBACK_MAX_FEES_BPS
      ) {
        setShouldFallbackToInternalSwap(true);
      } else {
        helperToast.error(
          <div>
            <div>External swap failed. Fallback to internal swap.</div>
            <span
              className="inline-block cursor-pointer border-b border-dashed"
              onClick={() => setShouldFallbackToInternalSwap(true)}
            >
              <Trans>Switch to internal swap</Trans>
            </span>
          </div>
        );
      }
    }

    if (externalSwapFails >= DISABLE_EXTERNAL_SWAP_AGGREGATOR_FAILS_COUNT && settings.externalSwapsEnabled) {
      setExternalSwapFails(0);
      settings.setExternalSwapsEnabled(false);
    }
  }, [
    baseExternalSwapQuote,
    externalSwapFails,
    internalSwapFeesDeltaUsd,
    setExternalSwapFails,
    settings,
    shouldFallbackToInternalSwap,
  ]);

  useEffect(
    function resetInternalSwapFallbackEff() {
      const isLastOrderExecuted = Object.values(orderStatuses).every((os) => os.executedTxnHash);

      if (isLastOrderExecuted && shouldFallbackToInternalSwap) {
        setShouldFallbackToInternalSwap(false);
      }
    },
    [orderStatuses, shouldFallbackToInternalSwap]
  );

  if (isDevelopment()) {
    throttleLog("SWAPS", {
      internalSwapFeesDeltaUsd,
      internalSwapPriceImpact,
      baseExternalSwapQuote,
      adjustedExternalSwapQuote,
    });
  }

  useEffect(() => {
    setExternalSwapQuote(adjustedExternalSwapQuote);
  }, [adjustedExternalSwapQuote, fromTokenAddress, setExternalSwapQuote]);
}
