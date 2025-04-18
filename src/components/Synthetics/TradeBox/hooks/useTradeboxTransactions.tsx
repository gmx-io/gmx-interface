/* eslint-disable @typescript-eslint/no-unused-vars */
import { t, Trans } from "@lingui/macro";
import { useCallback, useId, useMemo } from "react";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChartHeaderInfo } from "context/SyntheticsStateContext/selectors/chartSelectors";
import { selectSetShouldFallbackToInternalSwap } from "context/SyntheticsStateContext/selectors/externalSwapSelectors";
import {
  makeSelectSubaccountForActions,
  selectBlockTimestampData,
  selectIsFirstOrder,
  selectMarketsInfoData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectIsLeverageSliderEnabled } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import {
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
import { getIsPossibleExternalSwapError } from "domain/synthetics/externalSwaps/utils";
import { sendUniversalBatchTxn } from "domain/synthetics/gassless/txns/universalTxn";
import { OrderTxnCallbackCtx, useOrderTxnCallbacks } from "domain/synthetics/gassless/txns/useOrderTxnCallbacks";
import { BatchOrderTxnEventParams, TxnEvent, TxnEventName } from "domain/synthetics/gassless/txns/walletTxnBuilder";
import { useExpressOrdersParams } from "domain/synthetics/gassless/useRelayerFeeHandler";
import { createWrapOrUnwrapTxn } from "domain/synthetics/orders/createWrapOrUnwrapTxn";
import { formatLeverage } from "domain/synthetics/positions/utils";
import { useMaxAutoCancelOrdersState } from "domain/synthetics/trade/useMaxAutoCancelOrdersState";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import {
  initDecreaseOrderMetricData,
  initIncreaseOrderMetricData,
  initSwapMetricData,
  sendOrderSubmittedMetric,
  sendTxnValidationErrorMetric,
} from "lib/metrics/utils";
import { formatTokenAmount } from "lib/numbers";
import { getByKey } from "lib/objects";
import {
  getTradeInteractionKey,
  sendUserAnalyticsOrderConfirmClickEvent,
  sendUserAnalyticsOrderResultEvent,
  userAnalytics,
} from "lib/userAnalytics";
import useWallet from "lib/wallets/useWallet";
import { OrderType } from "sdk/types/orders";
import { BatchOrderTxnParams } from "sdk/utils/orderTransactions";

import { useRequiredActions, useSecondaryOrderPayloads } from "./useRequiredActions";
import { useTPSLSummaryExecutionFee } from "./useTPSLSummaryExecutionFee";

interface TradeboxTransactionsProps {
  setPendingTxns: (txns: any) => void;
}

const EMPTY_TRIGGER_RATIO = {
  ratio: 0n,
  largestToken: undefined,
  smallestToken: undefined,
};

export function useTradeboxTransactions({ setPendingTxns }: TradeboxTransactionsProps) {
  const { chainId } = useChainId();
  const { signer, account } = useWallet();
  const { setPendingPosition, setPendingOrder } = useSyntheticsEvents();
  const tokensData = useTokensData();
  const { shouldDisableValidationForTesting } = useSettings();
  const { getExecutionFeeAmountForEntry } = useTPSLSummaryExecutionFee();
  const { orderTxnCallback } = useOrderTxnCallbacks();

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

  const setShouldFallbackToInternalSwap = useSelector(selectSetShouldFallbackToInternalSwap);

  const selectedPosition = useSelector(selectTradeboxSelectedPosition);
  const executionFee = useSelector(selectTradeboxExecutionFee);
  const triggerPrice = useSelector(selectTradeboxTriggerPrice);
  const { referralCodeForTxn } = useUserReferralCode(signer, chainId, account);

  const fromToken = getByKey(tokensData, fromTokenAddress);
  const toToken = getByKey(tokensData, toTokenAddress);
  const { requiredActions, createSltpEntries, cancelSltpEntries, updateSltpEntries } = useRequiredActions();

  const { autoCancelOrdersLimit } = useMaxAutoCancelOrdersState({ positionKey: selectedPosition?.key });

  const subaccount = useSelector(makeSelectSubaccountForActions(requiredActions));
  const initialCollateralAllowance = useSelector(selectTradeboxPayTokenAllowance);

  const secondaryOrderPayloads = useSecondaryOrderPayloads({
    cancelSltpEntries,
    createSltpEntries,
    updateSltpEntries,
    autoCancelOrdersLimit,
    getExecutionFeeAmountForEntry,
  });

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
      createOrderParams: [primaryCreateOrderParams, ...(secondaryOrderPayloads?.createPayloads ?? [])],
      updateOrderParams: secondaryOrderPayloads?.updatePayloads ?? [],
      cancelOrderParams: secondaryOrderPayloads?.cancelPayloads ?? [],
    };
  }, [primaryCreateOrderParams, secondaryOrderPayloads]);

  const { expressParams, needGasPaymentTokenApproval } = useExpressOrdersParams({ orderParams: batchParams });

  if (expressParams || needGasPaymentTokenApproval) {
    // TEMP DEBUG
    // eslint-disable-next-line no-console
    console.log("expressParams", expressParams, {
      needGasPaymentTokenApproval,
      gasPaymentFee: formatTokenAmount(expressParams?.relayFeeParams.feeParams.feeAmount, 6, "USDC"),
      relayerFee: formatTokenAmount(expressParams?.relayFeeParams.relayerTokenAmount, 18, "WETH"),
    });
  }

  const initOrderMetricData = useCallback(() => {
    if (isSwap) {
      return initSwapMetricData({
        fromToken,
        toToken,
        hasReferralCode: Boolean(referralCodeForTxn),
        swapAmounts,
        executionFee,
        allowedSlippage,
        orderType: primaryCreateOrderParams?.orderPayload.orderType,
        subaccount,
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
        subaccount,
        triggerPrice,
        allowedSlippage,
        marketInfo,
        isLong,
        isFirstOrder,
        isLeverageEnabled: isLeverageSliderEnabled,
        initialCollateralAllowance,
        isTPSLCreated: createSltpEntries.length > 0,
        slCount: createSltpEntries.filter(
          (entry) => entry.decreaseAmounts.triggerOrderType === OrderType.StopLossDecrease
        ).length,
        tpCount: createSltpEntries.filter((entry) => entry.decreaseAmounts.triggerOrderType === OrderType.LimitDecrease)
          .length,
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
      subaccount,
      triggerPrice,
      marketInfo,
      allowedSlippage,
      isLong,
      place: "tradeBox",
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
    createSltpEntries,
    decreaseAmounts,
    executionFee,
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
    primaryCreateOrderParams,
    referralCodeForTxn,
    selectedPosition,
    subaccount,
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

    return sendUniversalBatchTxn({
      chainId,
      signer,
      batchParams,
      expressParams,
      simulationParams: shouldDisableValidationForTesting
        ? undefined
        : {
            tokensData,
            blockTimestampData,
          },
      callback: (e: TxnEvent<BatchOrderTxnEventParams>) => {
        const ctx: OrderTxnCallbackCtx = {
          metricId: metricData.metricId,
          slippageInputId,
        };

        if (e.event === TxnEventName.TxnError) {
          sendUserAnalyticsOrderResultEvent(chainId, metricData.metricId, false, e.data.error);

          if (getIsPossibleExternalSwapError(e.data.error) && primaryCreateOrderParams) {
            setShouldFallbackToInternalSwap(true);
            ctx.additionalErrorContent = (
              <>
                <br />
                <br />
                <Trans>External swap is temporarily disabled. Please try again.</Trans>
              </>
            );
          }
        }

        orderTxnCallback(ctx, e);
      },
    });
  }, [
    initOrderMetricData,
    primaryCreateOrderParams,
    signer,
    tokensData,
    account,
    marketsInfoData,
    chainId,
    batchParams,
    expressParams,
    shouldDisableValidationForTesting,
    blockTimestampData,
    slippageInputId,
    orderTxnCallback,
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
    needGasPaymentTokenApproval,
  };
}
