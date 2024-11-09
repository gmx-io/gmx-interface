import { t } from "@lingui/macro";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccount } from "context/SubaccountContext/SubaccountContext";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  selectTradeboxAllowedSlippage,
  selectTradeboxCollateralToken,
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxExecutionFee,
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
import { useMaxAutoCancelOrdersState } from "domain/synthetics/trade/useMaxAutoCancelOrdersState";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import {
  makeTxnErrorMetricsHandler,
  initDecreaseOrderMetricData,
  initIncreaseOrderMetricData,
  initSwapMetricData,
  sendOrderSubmittedMetric,
  sendTxnValidationErrorMetric,
} from "lib/metrics/utils";
import { makeTxnSentMetricsHandler } from "lib/metrics/utils";
import { getByKey } from "lib/objects";
import useWallet from "lib/wallets/useWallet";
import { useCallback } from "react";
import { useRequiredActions } from "./useRequiredActions";
import { useTPSLSummaryExecutionFee } from "./useTPSLSummaryExecutionFee";

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
  const { account, signer } = useWallet();
  const { referralCodeForTxn } = useUserReferralCode(signer, chainId, account);

  const fromToken = getByKey(tokensData, fromTokenAddress);
  const toToken = getByKey(tokensData, toTokenAddress);

  const { requiredActions, createSltpEntries, cancelSltpEntries, updateSltpEntries } = useRequiredActions();
  const { setPendingPosition, setPendingOrder } = useSyntheticsEvents();

  const { summaryExecutionFee, getExecutionFeeAmountForEntry } = useTPSLSummaryExecutionFee();

  const { autoCancelOrdersLimit } = useMaxAutoCancelOrdersState({ positionKey: selectedPosition?.key });

  const subaccount = useSubaccount(summaryExecutionFee?.feeTokenAmount ?? null, requiredActions);

  const onSubmitSwap = useCallback(
    function onSubmitSwap() {
      const orderType = isLimit ? OrderType.LimitSwap : OrderType.MarketSwap;

      const metricData = initSwapMetricData({
        fromToken,
        toToken,
        hasReferralCode: Boolean(referralCodeForTxn),
        swapAmounts,
        executionFee,
        allowedSlippage,
        orderType,
        subaccount,
      });

      sendOrderSubmittedMetric(metricData.metricId);

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
        sendTxnValidationErrorMetric(metricData.metricId);
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
        metricId: metricData.metricId,
        skipSimulation: shouldDisableValidationForTesting,
      })
        .then(makeTxnSentMetricsHandler(metricData.metricId))
        .catch(makeTxnErrorMetricsHandler(metricData.metricId));
    },
    [
      isLimit,
      fromToken,
      toToken,
      referralCodeForTxn,
      swapAmounts,
      executionFee,
      allowedSlippage,
      subaccount,
      account,
      tokensData,
      signer,
      chainId,
      setPendingTxns,
      setPendingOrder,
      shouldDisableValidationForTesting,
    ]
  );

  const onSubmitIncreaseOrder = useCallback(
    function onSubmitIncreaseOrder() {
      const orderType = isLimit ? OrderType.LimitIncrease : OrderType.MarketIncrease;

      const metricData = initIncreaseOrderMetricData({
        fromToken,
        increaseAmounts,
        hasExistingPosition: Boolean(selectedPosition),
        executionFee,
        orderType,
        hasReferralCode: Boolean(referralCodeForTxn),
        subaccount,
        triggerPrice,
        allowedSlippage,
        marketInfo,
        isLong,
      });

      sendOrderSubmittedMetric(metricData.metricId);

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
        sendTxnValidationErrorMetric(metricData.metricId);
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
        metricId: metricData.metricId,
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
        createDecreaseOrderParams: createSltpEntries.map((entry, i) => {
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
            autoCancel: i < autoCancelOrdersLimit,
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
          autoCancel: entry.order!.autoCancel,
        })),
      })
        .then(makeTxnSentMetricsHandler(metricData.metricId))
        .catch(makeTxnErrorMetricsHandler(metricData.metricId));
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
      autoCancelOrdersLimit,
    ]
  );

  const onSubmitDecreaseOrder = useCallback(
    function onSubmitDecreaseOrder() {
      const metricData = initDecreaseOrderMetricData({
        collateralToken,
        decreaseAmounts,
        hasExistingPosition: Boolean(selectedPosition),
        executionFee,
        orderType: decreaseAmounts?.triggerOrderType,
        hasReferralCode: Boolean(referralCodeForTxn),
        subaccount,
        triggerPrice,
        marketInfo,
        allowedSlippage,
        isLong,
        place: "tradeBox",
      });

      sendOrderSubmittedMetric(metricData.metricId);

      if (
        !account ||
        !marketInfo ||
        !collateralToken ||
        decreaseAmounts?.triggerOrderType === undefined ||
        decreaseAmounts?.triggerThresholdType === undefined ||
        decreaseAmounts?.acceptablePrice === undefined ||
        decreaseAmounts?.triggerPrice === undefined ||
        !executionFee ||
        !tokensData ||
        !signer ||
        typeof allowedSlippage !== "number"
      ) {
        helperToast.error(t`Error submitting order`);
        sendTxnValidationErrorMetric(metricData.metricId);
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
          orderType: decreaseAmounts?.triggerOrderType,
          executionFee: executionFee.feeTokenAmount,
          allowedSlippage,
          referralCode: referralCodeForTxn,
          // Skip simulation to avoid EmptyPosition error
          // skipSimulation: !existingPosition || shouldDisableValidation,
          skipSimulation: true,
          indexToken: marketInfo.indexToken,
          tokensData,
          autoCancel: autoCancelOrdersLimit > 0,
        },
        {
          setPendingTxns,
          setPendingOrder,
          setPendingPosition,
        },
        metricData.metricId
      )
        .then(makeTxnSentMetricsHandler(metricData.metricId))
        .catch(makeTxnErrorMetricsHandler(metricData.metricId));
    },
    [
      account,
      allowedSlippage,
      chainId,
      collateralToken,
      decreaseAmounts,
      executionFee,
      isLong,
      marketInfo,
      referralCodeForTxn,
      selectedPosition,
      setPendingOrder,
      setPendingPosition,
      setPendingTxns,
      signer,
      subaccount,
      tokensData,
      triggerPrice,
      autoCancelOrdersLimit,
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
