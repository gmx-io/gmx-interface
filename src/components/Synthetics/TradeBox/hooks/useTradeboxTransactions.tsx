import { t } from "@lingui/macro";
import { useMetrics } from "context/MetricsContext/MetricsContext";
import {
  getPositionOrderMetricId,
  getSwapOrderMetricId,
  getTxnErrorMetricsHandler,
  getTxnSentMetricsHandler,
  sendOrderSubmittedMetric,
  sendTxnValidationErrorMetric,
} from "context/MetricsContext/utils";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccount } from "context/SubaccountContext/SubaccountContext";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  selectTradeboxAllowedSlippage,
  selectTradeboxCollateralToken,
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxExecutionFee,
  selectTradeboxFixedTriggerOrderType,
  selectTradeboxFixedTriggerThresholdType,
  selectTradeboxFromTokenAddress,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxMarketInfo,
  selectTradeboxSelectedPosition,
  selectTradeboxSwapAmounts,
  selectTradeboxToTokenAddress,
  selectTradeboxTradeFlags,
  selectTradeboxTriggerPrice,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useUserReferralCode } from "domain/referrals";
import {
  createDecreaseOrderTxn,
  createIncreaseOrderTxn,
  createSwapOrderTxn,
  OrderType,
} from "domain/synthetics/orders";
import { createWrapOrUnwrapTxn } from "domain/synthetics/orders/createWrapOrUnwrapTxn";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { getByKey } from "lib/objects";
import useWallet from "lib/wallets/useWallet";
import { useCallback } from "react";
import { useRequiredActions } from "./useRequiredActions";
import { useTPSLSummaryExecutionFee } from "./useTPSLSummaryExecutionFee";
import { DecreaseOrderMetricData, IncreaseOrderMetricData, SwapMetricData } from "context/MetricsContext/types";

interface TradeboxTransactionsProps {
  setPendingTxns: (txns: any) => void;
}

export function useTradeboxTransactions({ setPendingTxns }: TradeboxTransactionsProps) {
  const { chainId } = useChainId();
  const tokensData = useTokensData();
  const marketInfo = useSelector(selectTradeboxMarketInfo);
  const collateralToken = useSelector(selectTradeboxCollateralToken);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const { isLong, isLimit } = tradeFlags;
  const allowedSlippage = useSelector(selectTradeboxAllowedSlippage);

  const fromTokenAddress = useSelector(selectTradeboxFromTokenAddress);
  const toTokenAddress = useSelector(selectTradeboxToTokenAddress);

  const swapAmounts = useSelector(selectTradeboxSwapAmounts);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const decreaseAmounts = useSelector(selectTradeboxDecreasePositionAmounts);

  const { shouldDisableValidationForTesting } = useSettings();
  const selectedPosition = useSelector(selectTradeboxSelectedPosition);
  const executionFee = useSelector(selectTradeboxExecutionFee);
  const triggerPrice = useSelector(selectTradeboxTriggerPrice);
  const fixedTriggerThresholdType = useSelector(selectTradeboxFixedTriggerThresholdType);
  const fixedTriggerOrderType = useSelector(selectTradeboxFixedTriggerOrderType);
  const { account, signer } = useWallet();
  const { referralCodeForTxn } = useUserReferralCode(signer, chainId, account);

  const fromToken = getByKey(tokensData, fromTokenAddress);
  const toToken = getByKey(tokensData, toTokenAddress);

  const { requiredActions, createSltpEntries, cancelSltpEntries, updateSltpEntries } = useRequiredActions();
  const { setPendingPosition, setPendingOrder } = useSyntheticsEvents();

  const { summaryExecutionFee, getExecutionFeeAmountForEntry } = useTPSLSummaryExecutionFee();

  const subaccount = useSubaccount(summaryExecutionFee?.feeTokenAmount ?? null, requiredActions);

  const metrics = useMetrics();

  const onSubmitSwap = useCallback(
    function onSubmitSwap() {
      const orderType = isLimit ? OrderType.LimitSwap : OrderType.MarketSwap;

      const metricData: SwapMetricData = {
        metricType: isLimit ? "limitSwap" : "swap",
        account,
        initialCollateralTokenAddress: fromToken?.address,
        toTokenAddress: toToken?.address,
        initialCollateralDeltaAmount: swapAmounts?.amountIn,
        minOutputAmount: swapAmounts?.minOutputAmount,
        swapPath: swapAmounts?.swapPathStats?.swapPath,
        executionFee: executionFee?.feeTokenAmount,
        allowedSlippage,
        orderType,
      };

      const { metricType } = metricData;
      const metricId = getSwapOrderMetricId(metricData);

      metrics.setCachedMetricData(metricId, metricData);
      sendOrderSubmittedMetric(metrics, metricId, metricType);

      if (
        !account ||
        !tokensData ||
        !swapAmounts?.swapPathStats ||
        !fromToken ||
        !toToken ||
        !executionFee ||
        !signer ||
        typeof allowedSlippage !== "number"
      ) {
        helperToast.error(t`Error submitting order`);
        sendTxnValidationErrorMetric(metrics, metricId, metricType);
        return Promise.resolve();
      }

      return createSwapOrderTxn(chainId, signer, subaccount, {
        account,
        fromTokenAddress: fromToken.address,
        fromTokenAmount: swapAmounts.amountIn,
        swapPath: swapAmounts.swapPathStats?.swapPath,
        toTokenAddress: toToken.address,
        orderType,
        minOutputAmount: swapAmounts.minOutputAmount,
        referralCode: referralCodeForTxn,
        executionFee: executionFee.feeTokenAmount,
        allowedSlippage,
        tokensData,
        setPendingTxns,
        setPendingOrder,
        metricId,
      })
        .then(getTxnSentMetricsHandler(metrics, metricId, metricType))
        .catch(getTxnErrorMetricsHandler(metrics, metricId, metricType));
    },
    [
      isLimit,
      account,
      fromToken,
      toToken,
      swapAmounts,
      executionFee,
      allowedSlippage,
      metrics,
      tokensData,
      signer,
      chainId,
      subaccount,
      referralCodeForTxn,
      setPendingTxns,
      setPendingOrder,
    ]
  );

  const onSubmitIncreaseOrder = useCallback(
    function onSubmitIncreaseOrder() {
      const orderType = isLimit ? OrderType.LimitIncrease : OrderType.MarketIncrease;

      const metricData: IncreaseOrderMetricData = {
        metricType: isLimit ? "limitOrder" : "increasePosition",
        account,
        referralCodeForTxn,
        hasExistingPosition: Boolean(selectedPosition),
        marketAddress: marketInfo?.marketTokenAddress,
        initialCollateralTokenAddress: fromToken?.address,
        initialCollateralDeltaAmount: increaseAmounts?.initialCollateralAmount,
        swapPath: increaseAmounts?.swapPathStats?.swapPath || [],
        sizeDeltaUsd: increaseAmounts?.sizeDeltaUsd,
        sizeDeltaInTokens: increaseAmounts?.sizeDeltaInTokens,
        triggerPrice: isLimit ? triggerPrice : 0n,
        acceptablePrice: increaseAmounts?.acceptablePrice,
        isLong,
        orderType,
        executionFee: executionFee?.feeTokenAmount,
      };
      const { metricType } = metricData;
      const metricId = getPositionOrderMetricId(metricData);

      metrics.setCachedMetricData(metricId, metricData);

      sendOrderSubmittedMetric(metrics, metricId, metricType);

      if (
        !tokensData ||
        !account ||
        !fromToken ||
        !collateralToken ||
        increaseAmounts?.acceptablePrice === undefined ||
        !executionFee ||
        !marketInfo ||
        !signer ||
        typeof allowedSlippage !== "number"
      ) {
        helperToast.error(t`Error submitting order`);
        sendTxnValidationErrorMetric(metrics, metricId, metricType);
        return Promise.resolve();
      }

      const commonSecondaryOrderParams = {
        account,
        marketAddress: marketInfo.marketTokenAddress,
        swapPath: [],
        allowedSlippage,
        initialCollateralAddress: collateralToken.address,
        receiveTokenAddress: collateralToken.address,
        isLong,
        indexToken: marketInfo.indexToken,
      };

      return createIncreaseOrderTxn({
        chainId,
        signer,
        subaccount,
        metricId,
        createIncreaseOrderParams: {
          account,
          marketAddress: marketInfo.marketTokenAddress,
          initialCollateralAddress: fromToken?.address,
          initialCollateralAmount: increaseAmounts.initialCollateralAmount,
          targetCollateralAddress: collateralToken.address,
          collateralDeltaAmount: increaseAmounts.collateralDeltaAmount,
          swapPath: increaseAmounts.swapPathStats?.swapPath || [],
          sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
          sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
          triggerPrice: isLimit ? triggerPrice : undefined,
          acceptablePrice: increaseAmounts.acceptablePrice,
          isLong,
          orderType: isLimit ? OrderType.LimitIncrease : OrderType.MarketIncrease,
          executionFee: executionFee.feeTokenAmount,
          allowedSlippage,
          referralCode: referralCodeForTxn,
          indexToken: marketInfo.indexToken,
          tokensData,
          skipSimulation: isLimit || shouldDisableValidationForTesting,
          setPendingTxns: setPendingTxns,
          setPendingOrder,
          setPendingPosition,
        },
        createDecreaseOrderParams: createSltpEntries.map((entry) => {
          return {
            ...commonSecondaryOrderParams,
            initialCollateralDeltaAmount: entry.decreaseAmounts.collateralDeltaAmount ?? 0n,
            sizeDeltaUsd: entry.decreaseAmounts.sizeDeltaUsd,
            sizeDeltaInTokens: entry.decreaseAmounts.sizeDeltaInTokens,
            acceptablePrice: entry.decreaseAmounts.acceptablePrice,
            triggerPrice: entry.decreaseAmounts.triggerPrice,
            minOutputUsd: 0n,
            decreasePositionSwapType: entry.decreaseAmounts.decreaseSwapType,
            orderType: entry.decreaseAmounts.triggerOrderType!,
            referralCode: referralCodeForTxn,
            executionFee: getExecutionFeeAmountForEntry(entry) ?? 0n,
            tokensData,
            txnType: entry.txnType!,
            skipSimulation: isLimit || shouldDisableValidationForTesting,
          };
        }),
        cancelOrderParams: cancelSltpEntries.map((entry) => ({
          ...commonSecondaryOrderParams,
          orderKey: entry.order!.key,
          orderType: entry.order!.orderType,
          minOutputAmount: 0n,
          sizeDeltaUsd: entry.order!.sizeDeltaUsd,
          txnType: entry.txnType!,
          initialCollateralDeltaAmount: entry.order?.initialCollateralDeltaAmount ?? 0n,
        })),
        updateOrderParams: updateSltpEntries.map((entry) => ({
          ...commonSecondaryOrderParams,
          orderKey: entry.order!.key,
          orderType: entry.order!.orderType,
          sizeDeltaUsd: (entry.increaseAmounts?.sizeDeltaUsd || entry.decreaseAmounts?.sizeDeltaUsd)!,
          acceptablePrice: (entry.increaseAmounts?.acceptablePrice || entry.decreaseAmounts?.acceptablePrice)!,
          triggerPrice: (entry.increaseAmounts?.triggerPrice || entry.decreaseAmounts?.triggerPrice)!,
          executionFee: getExecutionFeeAmountForEntry(entry) ?? 0n,
          minOutputAmount: 0n,
          txnType: entry.txnType!,
          initialCollateralDeltaAmount: entry.order?.initialCollateralDeltaAmount ?? 0n,
        })),
      })
        .then(getTxnSentMetricsHandler(metrics, metricId, metricType))
        .catch(getTxnErrorMetricsHandler(metrics, metricId, metricType));
    },
    [
      isLimit,
      account,
      referralCodeForTxn,
      selectedPosition,
      marketInfo,
      fromToken,
      increaseAmounts,
      collateralToken,
      triggerPrice,
      isLong,
      executionFee,
      metrics,
      tokensData,
      signer,
      allowedSlippage,
      chainId,
      subaccount,
      shouldDisableValidationForTesting,
      setPendingTxns,
      setPendingOrder,
      setPendingPosition,
      createSltpEntries,
      cancelSltpEntries,
      updateSltpEntries,
      getExecutionFeeAmountForEntry,
    ]
  );

  const onSubmitDecreaseOrder = useCallback(
    function onSubmitDecreaseOrder() {
      const metricType = fixedTriggerOrderType === OrderType.LimitDecrease ? "takeProfitOrder" : "stopLossOrder";

      const metricData: DecreaseOrderMetricData = {
        metricType,
        place: "tradeBox",
        account,
        referralCodeForTxn,
        isFullClose: decreaseAmounts?.isFullClose,
        hasExistingPosition: Boolean(selectedPosition),
        marketAddress: marketInfo?.marketTokenAddress,
        initialCollateralTokenAddress: collateralToken?.address,
        initialCollateralDeltaAmount: decreaseAmounts?.collateralDeltaAmount,
        swapPath: [],
        triggerPrice: decreaseAmounts?.triggerPrice,
        acceptablePrice: decreaseAmounts?.acceptablePrice,
        sizeDeltaUsd: decreaseAmounts?.sizeDeltaUsd,
        sizeDeltaInTokens: decreaseAmounts?.sizeDeltaInTokens,
        orderType: fixedTriggerOrderType,
        isLong,
        executionFee: executionFee?.feeTokenAmount,
      };

      const metricId = getPositionOrderMetricId(metricData);
      metrics.setCachedMetricData(metricId, metricData);

      sendOrderSubmittedMetric(metrics, metricId, metricType);

      if (
        !account ||
        !marketInfo ||
        !collateralToken ||
        fixedTriggerOrderType === undefined ||
        fixedTriggerThresholdType === undefined ||
        decreaseAmounts?.acceptablePrice === undefined ||
        decreaseAmounts?.triggerPrice === undefined ||
        !executionFee ||
        !tokensData ||
        !signer ||
        typeof allowedSlippage !== "number"
      ) {
        helperToast.error(t`Error submitting order`);
        sendTxnValidationErrorMetric(metrics, metricId, metricType);
        return Promise.resolve();
      }

      return createDecreaseOrderTxn(
        chainId,
        signer,
        subaccount,
        {
          account,
          marketAddress: marketInfo.marketTokenAddress,
          swapPath: [],
          initialCollateralDeltaAmount: decreaseAmounts.collateralDeltaAmount,
          initialCollateralAddress: collateralToken.address,
          receiveTokenAddress: collateralToken.address,
          triggerPrice: decreaseAmounts.triggerPrice,
          acceptablePrice: decreaseAmounts.acceptablePrice,
          sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
          sizeDeltaInTokens: decreaseAmounts.sizeDeltaInTokens,
          minOutputUsd: BigInt(0),
          isLong,
          decreasePositionSwapType: decreaseAmounts.decreaseSwapType,
          orderType: fixedTriggerOrderType,
          executionFee: executionFee.feeTokenAmount,
          allowedSlippage,
          referralCode: referralCodeForTxn,
          // Skip simulation to avoid EmptyPosition error
          // skipSimulation: !existingPosition || shouldDisableValidation,
          skipSimulation: true,
          indexToken: marketInfo.indexToken,
          tokensData,
        },
        {
          setPendingTxns,
          setPendingOrder,
          setPendingPosition,
        },
        metricId
      )
        .then(getTxnSentMetricsHandler(metrics, metricId, metricType))
        .catch(getTxnErrorMetricsHandler(metrics, metricId, metricType));
    },
    [
      account,
      allowedSlippage,
      chainId,
      collateralToken,
      decreaseAmounts,
      executionFee,
      fixedTriggerOrderType,
      fixedTriggerThresholdType,
      isLong,
      marketInfo,
      metrics,
      referralCodeForTxn,
      selectedPosition,
      setPendingOrder,
      setPendingPosition,
      setPendingTxns,
      signer,
      subaccount,
      tokensData,
    ]
  );

  function onSubmitWrapOrUnwrap() {
    if (!account || !swapAmounts || !fromToken || !signer) {
      return Promise.resolve();
    }

    return createWrapOrUnwrapTxn(chainId, signer, {
      amount: swapAmounts.amountIn,
      isWrap: Boolean(fromToken.isNative),
      setPendingTxns,
    });
  }

  return {
    onSubmitSwap,
    onSubmitIncreaseOrder,
    onSubmitDecreaseOrder,
    onSubmitWrapOrUnwrap,
  };
}
