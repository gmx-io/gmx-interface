/* eslint-disable @typescript-eslint/no-unused-vars */
import { t } from "@lingui/macro";
import { useCallback, useId, useMemo } from "react";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import { selectChartHeaderInfo } from "context/SyntheticsStateContext/selectors/chartSelectors";
import {
  selectBlockTimestampData,
  selectExpressNoncesData,
  selectIsFirstOrder,
  selectMarketsInfoData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectExecutionFeeBufferBps,
  selectIsLeverageSliderEnabled,
} from "context/SyntheticsStateContext/selectors/settingsSelectors";
import {
  selectSetShouldFallbackToInternalSwap,
  selectTradeboxAllowedSlippage,
  selectTradeboxCollateralToken,
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxExecutionFee,
  selectTradeboxFees,
  selectTradeboxFromTokenAddress,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxMarketInfo,
  selectTradeboxPayTokenAllowance,
  selectTradeboxSelectedPosition,
  selectTradeboxSwapAmounts,
  selectTradeboxToTokenAddress,
  selectTradeboxTradeFlags,
  selectTradeboxTradeMode,
  selectTradeboxTriggerPrice,
  selectTradeboxTwapDuration,
  selectTradeboxTwapNumberOfParts,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { selectTradeBoxCreateOrderParams } from "context/SyntheticsStateContext/selectors/transactionsSelectors/tradeBoxOrdersSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useUserReferralCode } from "domain/referrals";
import { getIsValidExpressParams } from "domain/synthetics/express/expressOrderUtils";
import { useExpressOrdersParams } from "domain/synthetics/express/useRelayerFeeHandler";
import { OrderType } from "domain/synthetics/orders";
import { createStakeOrUnstakeTxn } from "domain/synthetics/orders/createStakeOrUnStakeTxn";
import { createWrapOrUnwrapTxn } from "domain/synthetics/orders/createWrapOrUnwrapTxn";
import { sendBatchOrderTxn } from "domain/synthetics/orders/sendBatchOrderTxn";
import { useOrderTxnCallbacks } from "domain/synthetics/orders/useOrderTxnCallbacks";
import { formatLeverage } from "domain/synthetics/positions/utils";
import { TradeMode } from "domain/synthetics/trade";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import {
  initDecreaseOrderMetricData,
  initIncreaseOrderMetricData,
  initSwapMetricData,
  sendOrderSubmittedMetric,
  sendTxnValidationErrorMetric,
} from "lib/metrics/utils";
import { getByKey } from "lib/objects";
import { getTradeInteractionKey, sendUserAnalyticsOrderConfirmClickEvent, userAnalytics } from "lib/userAnalytics";
import useWallet from "lib/wallets/useWallet";
import { BOTANIX } from "sdk/configs/chains";
import { BatchOrderTxnParams, getBatchTotalExecutionFee } from "sdk/utils/orderTransactions";

import { useSidecarOrderPayloads } from "./useSidecarOrderPayloads";

interface TradeboxTransactionsProps {
  setPendingTxns: (txns: any) => void;
}

export function useTradeboxTransactions({ setPendingTxns }: TradeboxTransactionsProps) {
  const { chainId } = useChainId();
  const { signer, account } = useWallet();
  const tokensData = useTokensData();
  const { shouldDisableValidationForTesting } = useSettings();

  const { makeOrderTxnCallback } = useOrderTxnCallbacks();

  const isFirstOrder = useSelector(selectIsFirstOrder);
  const blockTimestampData = useSelector(selectBlockTimestampData);
  const isLeverageSliderEnabled = useSelector(selectIsLeverageSliderEnabled);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const swapAmounts = useSelector(selectTradeboxSwapAmounts);
  const decreaseAmounts = useSelector(selectTradeboxDecreasePositionAmounts);
  const fromTokenAddress = useSelector(selectTradeboxFromTokenAddress);
  const toTokenAddress = useSelector(selectTradeboxToTokenAddress);
  const marketInfo = useSelector(selectTradeboxMarketInfo);
  const collateralToken = useSelector(selectTradeboxCollateralToken);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const tradeMode = useSelector(selectTradeboxTradeMode);
  const { isLong, isSwap, isIncrease } = tradeFlags;
  const allowedSlippage = useSelector(selectTradeboxAllowedSlippage);
  const fees = useSelector(selectTradeboxFees);
  const chartHeaderInfo = useSelector(selectChartHeaderInfo);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const executionFeeBufferBps = useSelector(selectExecutionFeeBufferBps);
  const duration = useSelector(selectTradeboxTwapDuration);
  const numberOfParts = useSelector(selectTradeboxTwapNumberOfParts);
  const noncesData = useSelector(selectExpressNoncesData);

  const setShouldFallbackToInternalSwap = useSelector(selectSetShouldFallbackToInternalSwap);

  const selectedPosition = useSelector(selectTradeboxSelectedPosition);
  const executionFee = useSelector(selectTradeboxExecutionFee);
  const triggerPrice = useSelector(selectTradeboxTriggerPrice);
  const { referralCodeForTxn } = useUserReferralCode(signer, chainId, account);

  const fromToken = getByKey(tokensData, fromTokenAddress);
  const toToken = getByKey(tokensData, toTokenAddress);

  const initialCollateralAllowance = useSelector(selectTradeboxPayTokenAllowance);
  const sidecarOrderPayloads = useSidecarOrderPayloads();

  const primaryCreateOrderParams = useSelector(selectTradeBoxCreateOrderParams);
  const slippageInputId = useId();

  const batchParams: BatchOrderTxnParams = useMemo(() => {
    if (!primaryCreateOrderParams) {
      return {
        createOrderParams: [],
        updateOrderParams: [],
        cancelOrderParams: [],
      };
    }

    return {
      createOrderParams: [...primaryCreateOrderParams, ...(sidecarOrderPayloads?.createPayloads ?? [])],
      updateOrderParams: sidecarOrderPayloads?.updatePayloads ?? [],
      cancelOrderParams: sidecarOrderPayloads?.cancelPayloads ?? [],
    };
  }, [primaryCreateOrderParams, sidecarOrderPayloads]);

  const totalExecutionFee = useMemo(() => {
    return tokensData ? getBatchTotalExecutionFee({ batchParams, chainId, tokensData }) : undefined;
  }, [batchParams, chainId, tokensData]);

  const {
    expressParams,
    fastExpressParams,
    asyncExpressParams,
    expressParamsPromise,
    isLoading: isExpressLoading,
  } = useExpressOrdersParams({
    orderParams: batchParams,
    label: "TradeBox",
  });

  const initOrderMetricData = useCallback(() => {
    const primaryOrder = primaryCreateOrderParams?.[0];

    if (isSwap) {
      return initSwapMetricData({
        fromToken,
        toToken,
        hasReferralCode: Boolean(referralCodeForTxn),
        swapAmounts,
        isExpress: Boolean(expressParams),
        executionFee,
        allowedSlippage,
        executionFeeBufferBps,
        orderType: primaryOrder?.orderPayload.orderType,
        subaccount: expressParams?.subaccount,
        isFirstOrder,
        initialCollateralAllowance,
        isTwap: tradeMode === TradeMode.Twap,
        duration,
        partsCount: numberOfParts,
        tradeMode,
        expressParams,
        asyncExpressParams,
        fastExpressParams,
      });
    }

    if (isIncrease) {
      return initIncreaseOrderMetricData({
        fromToken,
        increaseAmounts,
        orderPayload: primaryOrder?.orderPayload,
        hasExistingPosition: Boolean(selectedPosition),
        leverage: formatLeverage(increaseAmounts?.estimatedLeverage) ?? "",
        executionFee,
        executionFeeBufferBps,
        orderType: primaryOrder?.orderPayload.orderType ?? OrderType.MarketIncrease,
        hasReferralCode: Boolean(referralCodeForTxn),
        subaccount: expressParams?.subaccount,
        triggerPrice,
        allowedSlippage,
        marketInfo,
        isLong,
        isFirstOrder,
        isExpress: Boolean(expressParams),
        isTwap: tradeMode === TradeMode.Twap,
        isLeverageEnabled: isLeverageSliderEnabled,
        initialCollateralAllowance,
        isTPSLCreated: Boolean(sidecarOrderPayloads?.createPayloads?.length),
        slCount: sidecarOrderPayloads?.createPayloads.filter(
          (entry) => entry.orderPayload.orderType === OrderType.StopLossDecrease
        ).length,
        tpCount: sidecarOrderPayloads?.createPayloads.filter(
          (entry) => entry.orderPayload.orderType === OrderType.LimitDecrease
        ).length,
        priceImpactDeltaUsd: increaseAmounts?.positionPriceImpactDeltaUsd,
        priceImpactPercentage: fees?.positionPriceImpact?.precisePercentage,
        netRate1h: isLong ? chartHeaderInfo?.fundingRateLong : chartHeaderInfo?.fundingRateShort,
        interactionId: marketInfo?.name
          ? userAnalytics.getInteractionId(getTradeInteractionKey(marketInfo.name))
          : undefined,
        duration,
        partsCount: numberOfParts,
        tradeMode: tradeMode,
        expressParams,
        asyncExpressParams,
        fastExpressParams,
      });
    }

    return initDecreaseOrderMetricData({
      collateralToken,
      decreaseAmounts,
      hasExistingPosition: Boolean(selectedPosition),
      executionFee,
      swapPath: [],
      executionFeeBufferBps,
      orderType: primaryOrder?.orderPayload.orderType,
      hasReferralCode: Boolean(referralCodeForTxn),
      subaccount: expressParams?.subaccount,
      triggerPrice,
      marketInfo,
      allowedSlippage,
      isLong,
      place: "tradeBox",
      isExpress: Boolean(expressParams),
      isTwap: tradeMode === TradeMode.Twap,
      interactionId: marketInfo?.name ? userAnalytics.getInteractionId(getTradeInteractionKey(marketInfo.name)) : "",
      priceImpactDeltaUsd: decreaseAmounts?.positionPriceImpactDeltaUsd,
      priceImpactPercentage: fees?.positionPriceImpact?.precisePercentage,
      netRate1h: isLong ? chartHeaderInfo?.fundingRateLong : chartHeaderInfo?.fundingRateShort,
      tradeMode,
      duration,
      partsCount: numberOfParts,
      expressParams,
      asyncExpressParams,
      fastExpressParams,
    });
  }, [
    allowedSlippage,
    asyncExpressParams,
    chartHeaderInfo?.fundingRateLong,
    chartHeaderInfo?.fundingRateShort,
    collateralToken,
    decreaseAmounts,
    duration,
    executionFee,
    executionFeeBufferBps,
    expressParams,
    fastExpressParams,
    fees?.positionPriceImpact?.precisePercentage,
    fromToken,
    increaseAmounts,
    initialCollateralAllowance,
    isFirstOrder,
    isIncrease,
    isLeverageSliderEnabled,
    isLong,
    isSwap,
    marketInfo,
    numberOfParts,
    primaryCreateOrderParams,
    referralCodeForTxn,
    selectedPosition,
    sidecarOrderPayloads?.createPayloads,
    swapAmounts,
    toToken,
    tradeMode,
    triggerPrice,
  ]);

  const onSubmitOrder = useCallback(async () => {
    const fulfilledExpressParams = await expressParamsPromise;

    const metricData = initOrderMetricData();

    sendOrderSubmittedMetric(metricData.metricId);

    if (!primaryCreateOrderParams || !signer || !tokensData || !account || !marketsInfoData) {
      helperToast.error(t`Error submitting order`);
      sendTxnValidationErrorMetric(metricData.metricId);
      return Promise.reject();
    }

    sendUserAnalyticsOrderConfirmClickEvent(chainId, metricData.metricId);

    return sendBatchOrderTxn({
      chainId,
      signer,
      batchParams,
      noncesData,
      expressParams:
        fulfilledExpressParams && getIsValidExpressParams(fulfilledExpressParams) ? fulfilledExpressParams : undefined,
      simulationParams: shouldDisableValidationForTesting
        ? undefined
        : {
            tokensData,
            blockTimestampData,
          },
      callback: makeOrderTxnCallback({
        metricId: metricData.metricId,
        slippageInputId,
        additionalErrorContent: undefined,
        onInternalSwapFallback: () => {
          setShouldFallbackToInternalSwap(true);
        },
      }),
    });
  }, [
    expressParamsPromise,
    initOrderMetricData,
    primaryCreateOrderParams,
    signer,
    tokensData,
    account,
    marketsInfoData,
    chainId,
    batchParams,
    noncesData,
    shouldDisableValidationForTesting,
    blockTimestampData,
    makeOrderTxnCallback,
    slippageInputId,
    setShouldFallbackToInternalSwap,
  ]);

  function onSubmitWrapOrUnwrap() {
    if (!account || !swapAmounts || !fromToken || !signer) {
      return Promise.reject();
    }

    return createWrapOrUnwrapTxn(chainId, signer, {
      amount: swapAmounts.amountIn,
      isWrap: Boolean(fromToken.isNative),
      setPendingTxns,
    });
  }

  function onSubmitStakeOrUnstake() {
    if (!account || !swapAmounts || !fromToken || !signer || !toToken) {
      return Promise.reject();
    }

    return createStakeOrUnstakeTxn(chainId, signer, {
      amount: swapAmounts.amountIn,
      isStake: Boolean(toToken.isStaking),
      isWrapBeforeStake: Boolean(fromToken.isNative),
      isUnwrapAfterStake: Boolean(toToken.isNative),
      setPendingTxns,
    });
  }

  return {
    onSubmitSwap: onSubmitOrder,
    onSubmitIncreaseOrder: onSubmitOrder,
    onSubmitDecreaseOrder: onSubmitOrder,
    onSubmitWrapOrUnwrap,
    onSubmitStakeOrUnstake,
    slippageInputId,
    expressParams,
    batchParams,
    isExpressLoading,
    totalExecutionFee,
  };
}
