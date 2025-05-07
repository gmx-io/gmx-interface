import { t } from "@lingui/macro";
import { useCallback, useId, useMemo } from "react";
import { usePublicClient } from "wagmi";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import { selectChartHeaderInfo } from "context/SyntheticsStateContext/selectors/chartSelectors";
import {
  selectBlockTimestampData,
  selectIsFirstOrder,
  selectMarketsInfoData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectIsLeverageSliderEnabled } from "context/SyntheticsStateContext/selectors/settingsSelectors";
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
  selectTradeboxTriggerPrice,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { selectTradeBoxCreateOrderParams } from "context/SyntheticsStateContext/selectors/transactionsSelectors/tradeBoxOrdersSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useUserReferralCode } from "domain/referrals";
import { useExpressOrdersParams } from "domain/synthetics/express/useRelayerFeeHandler";
import { createWrapOrUnwrapTxn } from "domain/synthetics/orders/createWrapOrUnwrapTxn";
import { sendBatchOrderTxn } from "domain/synthetics/orders/sendBatchOrderTxn";
import { useOrderTxnCallbacks } from "domain/synthetics/orders/useOrderTxnCallbacks";
import { formatLeverage } from "domain/synthetics/positions/utils";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { throttleLog } from "lib/logging";
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
import { OrderType } from "sdk/types/orders";
import { BatchOrderTxnParams } from "sdk/utils/orderTransactions";

import { useSidecarOrderPayloads } from "./useSidecarOrderPayloads";

interface TradeboxTransactionsProps {
  setPendingTxns: (txns: any) => void;
}

export function useTradeboxTransactions({ setPendingTxns }: TradeboxTransactionsProps) {
  const { chainId } = useChainId();
  const { signer, account } = useWallet();
  const settlementChainClient = usePublicClient({ chainId });
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
  const { isLong, isIncrease, isSwap } = tradeFlags;
  const allowedSlippage = useSelector(selectTradeboxAllowedSlippage);
  const fees = useSelector(selectTradeboxFees);
  const chartHeaderInfo = useSelector(selectChartHeaderInfo);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const showDebugValues = useShowDebugValues();

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
      createOrderParams: [primaryCreateOrderParams, ...(sidecarOrderPayloads?.createPayloads ?? [])],
      updateOrderParams: sidecarOrderPayloads?.updatePayloads ?? [],
      cancelOrderParams: sidecarOrderPayloads?.cancelPayloads ?? [],
    };
  }, [primaryCreateOrderParams, sidecarOrderPayloads]);

  const { expressParams, expressEstimateMethod } = useExpressOrdersParams({
    orderParams: batchParams,
  });

  if (expressParams && showDebugValues) {
    throttleLog("TradeBox express params", {
      expressParams,
      expressEstimateMethod,
    });
  }

  const initOrderMetricData = useCallback(() => {
    if (isSwap) {
      return initSwapMetricData({
        fromToken,
        toToken,
        hasReferralCode: Boolean(referralCodeForTxn),
        swapAmounts,
        isExpress: Boolean(expressParams),
        executionFee,
        allowedSlippage,
        orderType: primaryCreateOrderParams?.orderPayload.orderType,
        subaccount: expressParams?.subaccount,
        isFirstOrder,
        initialCollateralAllowance,
      });
    }

    if (isIncrease) {
      return initIncreaseOrderMetricData({
        chainId,
        fromToken,
        increaseAmounts,
        collateralToken,
        hasExistingPosition: Boolean(selectedPosition),
        leverage: formatLeverage(increaseAmounts?.estimatedLeverage) ?? "",
        executionFee,
        orderType: primaryCreateOrderParams?.orderPayload.orderType ?? OrderType.MarketIncrease,
        hasReferralCode: Boolean(referralCodeForTxn),
        subaccount: expressParams?.subaccount,
        triggerPrice,
        allowedSlippage,
        marketInfo,
        isLong,
        isFirstOrder,
        isExpress: Boolean(expressParams),
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
      });
    }

    return initDecreaseOrderMetricData({
      collateralToken,
      decreaseAmounts,
      hasExistingPosition: Boolean(selectedPosition),
      executionFee,
      swapPath: [],
      orderType: decreaseAmounts?.triggerOrderType,
      hasReferralCode: Boolean(referralCodeForTxn),
      subaccount: expressParams?.subaccount,
      triggerPrice,
      marketInfo,
      allowedSlippage,
      isLong,
      place: "tradeBox",
      isExpress: Boolean(expressParams),
      interactionId: marketInfo?.name ? userAnalytics.getInteractionId(getTradeInteractionKey(marketInfo.name)) : "",
      priceImpactDeltaUsd: decreaseAmounts?.positionPriceImpactDeltaUsd,
      priceImpactPercentage: fees?.positionPriceImpact?.precisePercentage,
      netRate1h: isLong ? chartHeaderInfo?.fundingRateLong : chartHeaderInfo?.fundingRateShort,
    });
  }, [
    allowedSlippage,
    chainId,
    chartHeaderInfo?.fundingRateLong,
    chartHeaderInfo?.fundingRateShort,
    collateralToken,
    decreaseAmounts,
    executionFee,
    expressParams,
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
    primaryCreateOrderParams?.orderPayload.orderType,
    referralCodeForTxn,
    selectedPosition,
    sidecarOrderPayloads?.createPayloads,
    swapAmounts,
    toToken,
    triggerPrice,
  ]);

  const onSubmitOrder = useCallback(async () => {
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
      settlementChainClient,
      batchParams,
      expressParams,
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
    initOrderMetricData,
    primaryCreateOrderParams,
    signer,
    tokensData,
    account,
    marketsInfoData,
    chainId,
    settlementChainClient,
    batchParams,
    expressParams,
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

  return {
    onSubmitSwap: onSubmitOrder,
    onSubmitIncreaseOrder: onSubmitOrder,
    onSubmitDecreaseOrder: onSubmitOrder,
    onSubmitWrapOrUnwrap,
    slippageInputId,
    relayerFeeParams: expressParams?.relayFeeParams,
    needGasPaymentTokenApproval: expressParams?.relayFeeParams.needGasPaymentTokenApproval,
  };
}
