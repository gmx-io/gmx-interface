import { t } from "@lingui/macro";
import { useMetrics } from "context/MetricsContext/MetricsContext";
import { getPositionOrderMetricId, getSwapOrderMetricId } from "context/MetricsContext/utils";
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
  OrderType,
  createDecreaseOrderTxn,
  createIncreaseOrderTxn,
  createSwapOrderTxn,
} from "domain/synthetics/orders";
import { createWrapOrUnwrapTxn } from "domain/synthetics/orders/createWrapOrUnwrapTxn";
import { useChainId } from "lib/chains";
import { isUserRejectedActionError } from "lib/contracts/transactionErrors";
import { helperToast } from "lib/helperToast";
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
      const metricType = isLimit ? "limitSwap" : "swap";

      const metricData = {
        metricType,
        fromTokenAddress: fromToken?.address,
        toTokenAddress: toToken?.address,
        fromTokenAmount: swapAmounts?.amountIn,
        minOutputAmount: swapAmounts?.minOutputAmount,
        swapPath: swapAmounts?.swapPathStats?.swapPath,
        executionFee: executionFee?.feeTokenAmount,
        allowedSlippage,
        orderType,
      };

      const metricId = getSwapOrderMetricId(metricData);
      metrics.setPendingEvent(metricId, metricData);

      metrics.sendMetric({
        event: `${metricType}.submitted`,
        isError: false,
        fields: metrics.getPendingEvent(metricId),
      });

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
        metrics.sendMetric({
          event: `${metricType}.fail`,
          isError: true,
          message: "Error submitting order",
          fields: {
            isTokensDataLoaded: Boolean(tokensData),
            isSignerLoaded: Boolean(signer),
            ...metrics.getPendingEvent(metricId, true),
          },
        });
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
        .then(() => {
          metrics.sendMetric({
            event: `${metricType}.sent`,
            isError: false,
            fields: metrics.getPendingEvent(metricId),
          });

          metrics.startTimer(metricId);

          return Promise.resolve();
        })
        .catch((error) => {
          metrics.sendMetric({
            event: `${metricType}.${isUserRejectedActionError(error) ? "rejected" : "fail"}`,
            isError: true,
            message: error.message,
            fields: metrics.getPendingEvent(metricId, true),
          });

          throw error;
        });
    },
    [
      metrics,
      fromToken,
      toToken,
      swapAmounts,
      account,
      tokensData,
      executionFee,
      signer,
      allowedSlippage,
      chainId,
      subaccount,
      isLimit,
      referralCodeForTxn,
      setPendingTxns,
      setPendingOrder,
    ]
  );

  const onSubmitIncreaseOrder = useCallback(
    function onSubmitIncreaseOrder() {
      const orderType = isLimit ? OrderType.LimitIncrease : OrderType.MarketIncrease;
      let metricType: string;

      if (isLimit) {
        metricType = "limitOrder";
      } else if (!selectedPosition) {
        metricType = "openPosition";
      } else {
        metricType = "increasePosition";
      }

      metrics.sendMetric({
        event: `${metricType}.submitted`,
        isError: false,
      });

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
        metrics.sendMetric({
          event: `${metricType}.fail`,
          isError: true,
          message: "Error submitting order",
        });
        return Promise.resolve();
      }

      const metricData = {
        metricType,
        marketAddress: marketInfo?.marketTokenAddress,
        initialCollateralTokenAddress: fromToken?.address,
        initialCollateralDeltaAmount: increaseAmounts?.initialCollateralAmount,
        targetCollateralAddress: collateralToken?.address,
        collateralDeltaAmount: increaseAmounts?.collateralDeltaAmount,
        swapPath: increaseAmounts?.swapPathStats?.swapPath || [],
        sizeDeltaUsd: increaseAmounts?.sizeDeltaUsd,
        sizeDeltaInTokens: increaseAmounts?.sizeDeltaInTokens,
        triggerPrice: isLimit ? triggerPrice : 0n,
        acceptablePrice: increaseAmounts?.acceptablePrice,
        isLong,
        orderType,
        executionFee: executionFee?.feeTokenAmount,
      };

      const metricId = getPositionOrderMetricId(metricData);

      metrics.setPendingEvent(metricId, metricData);

      // DEBUG EVENTS
      // [1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(() => {
      //   metrics.sendMetric({
      //     event: "increasePosition.submitted",
      //     isError: false,
      //     time: Math.floor(Math.random() * (15000 - 1200 + 1)) + 1200,
      //     fields: metrics.getPendingEvent(metricId),
      //   });
      // });

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
        .then(() => {
          metrics.sendMetric({
            event: `${metricType}.sent`,
            isError: false,
            fields: metrics.getPendingEvent(metricId),
          });

          metrics.startTimer(metricId);

          return Promise.resolve();
        })
        .catch((error) => {
          metrics.sendMetric({
            event: `${metricType}.${isUserRejectedActionError(error) ? "rejected" : "fail"}`,
            isError: true,
            message: error.message,
            fields: metrics.getPendingEvent(metricId, true),
          });

          throw error;
        });
    },
    [
      isLimit,
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
      account,
      signer,
      allowedSlippage,
      chainId,
      subaccount,
      referralCodeForTxn,
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
      metrics.sendMetric({
        event: "triggerOrder.submitted",
        isError: false,
      });

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
        metrics.sendMetric({
          event: "triggerOrder.fail",
          isError: true,
          message: "Error submitting order, missed data",
        });
        return Promise.resolve();
      }

      const metricData = {
        metricType: "triggerOrder",
        place: "tradeBox",
        marketAddress: marketInfo?.marketTokenAddress,
        initialCollateralTokenAddress: collateralToken?.address,
        initialCollateralDeltaAmount: decreaseAmounts.collateralDeltaAmount,
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
      metrics.setPendingEvent(metricId, metricData);

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
        .then(() => {
          metrics.sendMetric({
            event: "triggerOrder.sent",
            isError: false,
            fields: metrics.getPendingEvent(metricId),
          });

          metrics.startTimer(metricId);

          return Promise.resolve();
        })
        .catch((error) => {
          if (!isUserRejectedActionError(error)) {
            metrics.sendMetric({
              event: "triggerOrder.fail",
              isError: true,
              message: error.message,
              fields: metrics.getPendingEvent(metricId, true),
            });
          }

          throw error;
        });
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
