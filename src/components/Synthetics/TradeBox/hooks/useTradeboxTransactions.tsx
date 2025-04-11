import { t, Trans } from "@lingui/macro";
import { useCallback, useId } from "react";

import { getContract } from "config/contracts";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccount } from "context/SubaccountContext/SubaccountContext";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChartHeaderInfo } from "context/SyntheticsStateContext/selectors/chartSelectors";
import { selectSetShouldFallbackToInternalSwap } from "context/SyntheticsStateContext/selectors/externalSwapSelectors";
import { selectBlockTimestampData, selectIsFirstOrder } from "context/SyntheticsStateContext/selectors/globalSelectors";
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
  selectTradeboxSelectedPosition,
  selectTradeboxSwapAmounts,
  selectTradeboxToTokenAddress,
  selectTradeboxTradeFlags,
  selectTradeboxTradeRatios,
  selectTradeboxTriggerPrice,
  selectTradeboxTWAPDuration,
  selectTradeboxTWAPNumberOfParts,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useUserReferralCode } from "domain/referrals";
import { isPossibleExternalSwapError } from "domain/synthetics/externalSwaps/utils";
import {
  createDecreaseOrderTxn,
  createIncreaseOrderTxn,
  createSwapOrderTxn,
  OrderType,
} from "domain/synthetics/orders";
import { createTWAPIncreaseOrderTxn } from "domain/synthetics/orders/createTwapIncreaseOrderTxn";
import { createWrapOrUnwrapTxn } from "domain/synthetics/orders/createWrapOrUnwrapTxn";
import { formatLeverage } from "domain/synthetics/positions/utils";
import { useTokensAllowanceData } from "domain/synthetics/tokens";
import { useMaxAutoCancelOrdersState } from "domain/synthetics/trade/useMaxAutoCancelOrdersState";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import {
  initDecreaseOrderMetricData,
  initIncreaseOrderMetricData,
  initSwapMetricData,
  makeTxnErrorMetricsHandler,
  makeTxnSentMetricsHandler,
  sendOrderSubmittedMetric,
  sendTxnValidationErrorMetric,
} from "lib/metrics/utils";
import { getByKey } from "lib/objects";
import {
  getTradeInteractionKey,
  makeUserAnalyticsOrderFailResultHandler,
  sendUserAnalyticsOrderConfirmClickEvent,
  userAnalytics,
} from "lib/userAnalytics";
import useWallet from "lib/wallets/useWallet";

import { useRequiredActions } from "./useRequiredActions";
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
  const tokensData = useTokensData();
  const marketInfo = useSelector(selectTradeboxMarketInfo);
  const collateralToken = useSelector(selectTradeboxCollateralToken);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const { isLong, isLimit, isTwap: isTWAP } = tradeFlags;
  const allowedSlippage = useSelector(selectTradeboxAllowedSlippage);
  const isLeverageSliderEnabled = useSelector(selectIsLeverageSliderEnabled);
  const isFirstOrder = useSelector(selectIsFirstOrder);
  const blockTimestampData = useSelector(selectBlockTimestampData);
  const fees = useSelector(selectTradeboxFees);
  const chartHeaderInfo = useSelector(selectChartHeaderInfo);
  const fromTokenAddress = useSelector(selectTradeboxFromTokenAddress);
  const toTokenAddress = useSelector(selectTradeboxToTokenAddress);
  const duration = useSelector(selectTradeboxTWAPDuration);
  const numberOfParts = useSelector(selectTradeboxTWAPNumberOfParts);

  const swapAmounts = useSelector(selectTradeboxSwapAmounts);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const decreaseAmounts = useSelector(selectTradeboxDecreasePositionAmounts);

  const setShouldFallbackToInternalSwap = useSelector(selectSetShouldFallbackToInternalSwap);

  const { shouldDisableValidationForTesting } = useSettings();
  const selectedPosition = useSelector(selectTradeboxSelectedPosition);
  const executionFee = useSelector(selectTradeboxExecutionFee);
  const triggerPrice = useSelector(selectTradeboxTriggerPrice);
  const { triggerRatio = EMPTY_TRIGGER_RATIO } = useSelector(selectTradeboxTradeRatios);
  const { account, signer } = useWallet();
  const { referralCodeForTxn } = useUserReferralCode(signer, chainId, account);

  const fromToken = getByKey(tokensData, fromTokenAddress);
  const toToken = getByKey(tokensData, toTokenAddress);

  const { requiredActions, createSltpEntries, cancelSltpEntries, updateSltpEntries } = useRequiredActions();
  const { setPendingPosition, setPendingOrder } = useSyntheticsEvents();

  const { summaryExecutionFee, getExecutionFeeAmountForEntry } = useTPSLSummaryExecutionFee();

  const { autoCancelOrdersLimit } = useMaxAutoCancelOrdersState({ positionKey: selectedPosition?.key });

  const subaccount = useSubaccount(summaryExecutionFee?.feeTokenAmount ?? null, requiredActions);

  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: getContract(chainId, "SyntheticsRouter"),
    tokenAddresses: fromToken ? [fromToken.address] : [],
  });

  const initialCollateralAllowance = getByKey(tokensAllowanceData, fromToken?.address);

  const slippageInputId = useId();

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
        isFirstOrder,
        initialCollateralAllowance,
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
        return Promise.reject();
      }

      sendUserAnalyticsOrderConfirmClickEvent(chainId, metricData.metricId);

      return createSwapOrderTxn(chainId, signer, subaccount, {
        account,
        fromTokenAddress: fromToken.address,
        fromTokenAmount: swapAmounts.amountIn,
        swapPath: swapAmounts.swapPathStats?.swapPath,
        toTokenAddress: toToken.address,
        orderType,
        minOutputAmount: swapAmounts.minOutputAmount,
        triggerRatio: triggerRatio?.ratio ?? 0n,
        referralCode: referralCodeForTxn,
        executionFee: executionFee.feeTokenAmount,
        executionGasLimit: executionFee.gasLimit,
        allowedSlippage,
        tokensData,
        setPendingTxns,
        setPendingOrder,
        metricId: metricData.metricId,
        skipSimulation: shouldDisableValidationForTesting,
        blockTimestampData,
        slippageInputId,
      })
        .then(makeTxnSentMetricsHandler(metricData.metricId))
        .catch(makeTxnErrorMetricsHandler(metricData.metricId))
        .catch(makeUserAnalyticsOrderFailResultHandler(chainId, metricData.metricId));
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
      isFirstOrder,
      initialCollateralAllowance,
      account,
      tokensData,
      signer,
      chainId,
      setPendingTxns,
      setPendingOrder,
      shouldDisableValidationForTesting,
      blockTimestampData,
      triggerRatio,
      slippageInputId,
    ]
  );

  const onSubmitIncreaseOrder = useCallback(
    function onSubmitIncreaseOrder() {
      if (!increaseAmounts) {
        helperToast.error(t`Error submitting order`);
        return Promise.reject();
      }

      const orderType = isLimit ? increaseAmounts.limitOrderType! : OrderType.MarketIncrease;

      const metricData = initIncreaseOrderMetricData({
        chainId,
        fromToken,
        increaseAmounts,
        collateralToken,
        hasExistingPosition: Boolean(selectedPosition),
        leverage: formatLeverage(increaseAmounts.estimatedLeverage) ?? "",
        executionFee,
        orderType,
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
        priceImpactDeltaUsd: increaseAmounts.positionPriceImpactDeltaUsd,
        priceImpactPercentage: fees?.positionPriceImpact?.precisePercentage,
        netRate1h: isLong ? chartHeaderInfo?.fundingRateLong : chartHeaderInfo?.fundingRateShort,
        interactionId: marketInfo?.name
          ? userAnalytics.getInteractionId(getTradeInteractionKey(marketInfo.name))
          : undefined,
      });

      sendOrderSubmittedMetric(metricData.metricId);

      if (
        !tokensData ||
        !account ||
        !fromToken ||
        !collateralToken ||
        increaseAmounts.acceptablePrice === undefined ||
        !executionFee ||
        !marketInfo ||
        !signer ||
        typeof allowedSlippage !== "number"
      ) {
        helperToast.error(t`Error submitting order`);
        sendTxnValidationErrorMetric(metricData.metricId);
        return Promise.reject();
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

      sendUserAnalyticsOrderConfirmClickEvent(chainId, metricData.metricId);

      const additionalErrorContent = increaseAmounts.externalSwapQuote ? (
        <>
          <br />
          <br />
          <Trans>External swap is temporarily disabled. Please try again.</Trans>
        </>
      ) : undefined;

      let txnPromise: Promise<void>;

      if (isTWAP) {
        txnPromise = createTWAPIncreaseOrderTxn({
          chainId,
          signer,
          subaccount,
          metricId: metricData.metricId,
          additionalErrorContent,
          createTWAPIncreaseOrderParams: {
            account,
            marketAddress: marketInfo.marketTokenAddress,
            initialCollateralAddress: fromToken?.address,
            initialCollateralAmount: increaseAmounts.initialCollateralAmount,
            targetCollateralAddress: collateralToken.address,
            collateralDeltaAmount: increaseAmounts.collateralDeltaAmount,
            swapPath: increaseAmounts.swapPathStats?.swapPath || [],
            externalSwapQuote: increaseAmounts.externalSwapQuote,
            sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
            sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
            isLong,
            executionFee: executionFee.feeTokenAmount,
            executionGasLimit: executionFee.gasLimit,
            allowedSlippage,
            referralCode: referralCodeForTxn,
            indexToken: marketInfo.indexToken,
            tokensData,
            skipSimulation: isLimit || shouldDisableValidationForTesting,
            setPendingTxns: setPendingTxns,
            setPendingOrder,
            setPendingPosition,
            slippageInputId,
            duration,
            numberOfParts,
          },
        });
      } else {
        txnPromise = createIncreaseOrderTxn({
          chainId,
          signer,
          subaccount,
          metricId: metricData.metricId,
          blockTimestampData,
          additionalErrorContent,
          createIncreaseOrderParams: {
            account,
            marketAddress: marketInfo.marketTokenAddress,
            initialCollateralAddress: fromToken?.address,
            initialCollateralAmount: increaseAmounts.initialCollateralAmount,
            targetCollateralAddress: collateralToken.address,
            collateralDeltaAmount: increaseAmounts.collateralDeltaAmount,
            swapPath: increaseAmounts.swapPathStats?.swapPath || [],
            externalSwapQuote: increaseAmounts.externalSwapQuote,
            sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
            sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
            triggerPrice: isLimit ? triggerPrice : undefined,
            acceptablePrice: increaseAmounts.acceptablePrice,
            isLong,
            orderType: isLimit ? increaseAmounts.limitOrderType! : OrderType.MarketIncrease,
            executionFee: executionFee.feeTokenAmount,
            executionGasLimit: executionFee.gasLimit,
            allowedSlippage,
            referralCode: referralCodeForTxn,
            indexToken: marketInfo.indexToken,
            tokensData,
            skipSimulation: isLimit || shouldDisableValidationForTesting,
            setPendingTxns: setPendingTxns,
            setPendingOrder,
            setPendingPosition,
            slippageInputId,
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
              executionGasLimit: 0n, // Don't need for tp/sl entries
              tokensData,
              txnType: entry.txnType!,
              skipSimulation: isLimit || shouldDisableValidationForTesting,
              autoCancel: i < autoCancelOrdersLimit,
              slippageInputId,
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
        });
      }

      return txnPromise
        .then(makeTxnSentMetricsHandler(metricData.metricId))
        .catch(makeTxnErrorMetricsHandler(metricData.metricId))
        .catch((e) => {
          if (isPossibleExternalSwapError(e) && increaseAmounts.externalSwapQuote) {
            setShouldFallbackToInternalSwap(true);
          }

          throw e;
        })
        .catch(makeUserAnalyticsOrderFailResultHandler(chainId, metricData.metricId));
    },
    [
      increaseAmounts,
      isLimit,
      chainId,
      fromToken,
      collateralToken,
      selectedPosition,
      executionFee,
      referralCodeForTxn,
      subaccount,
      triggerPrice,
      allowedSlippage,
      marketInfo,
      isLong,
      isFirstOrder,
      isLeverageSliderEnabled,
      initialCollateralAllowance,
      createSltpEntries,
      fees?.positionPriceImpact?.precisePercentage,
      chartHeaderInfo?.fundingRateLong,
      chartHeaderInfo?.fundingRateShort,
      tokensData,
      account,
      signer,
      isTWAP,
      blockTimestampData,
      shouldDisableValidationForTesting,
      setPendingTxns,
      setPendingOrder,
      setPendingPosition,
      slippageInputId,
      cancelSltpEntries,
      updateSltpEntries,
      getExecutionFeeAmountForEntry,
      autoCancelOrdersLimit,
      setShouldFallbackToInternalSwap,
      duration,
      numberOfParts,
    ]
  );

  const onSubmitDecreaseOrder = useCallback(
    function onSubmitDecreaseOrder() {
      const metricData = initDecreaseOrderMetricData({
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
        return Promise.reject();
      }

      sendUserAnalyticsOrderConfirmClickEvent(chainId, metricData.metricId);

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
          executionGasLimit: executionFee.gasLimit,
          allowedSlippage,
          referralCode: referralCodeForTxn,
          // Skip simulation to avoid EmptyPosition error
          // skipSimulation: !existingPosition || shouldDisableValidation,
          skipSimulation: true,
          indexToken: marketInfo.indexToken,
          tokensData,
          autoCancel: autoCancelOrdersLimit > 0,
          slippageInputId,
        },
        {
          setPendingTxns,
          setPendingOrder,
          setPendingPosition,
        },
        blockTimestampData,
        metricData.metricId
      )
        .then(makeTxnSentMetricsHandler(metricData.metricId))
        .catch(makeTxnErrorMetricsHandler(metricData.metricId))
        .catch(makeUserAnalyticsOrderFailResultHandler(chainId, metricData.metricId));
    },
    [
      collateralToken,
      decreaseAmounts,
      selectedPosition,
      executionFee,
      referralCodeForTxn,
      subaccount,
      triggerPrice,
      marketInfo,
      allowedSlippage,
      isLong,
      fees?.positionPriceImpact?.precisePercentage,
      chartHeaderInfo?.fundingRateLong,
      chartHeaderInfo?.fundingRateShort,
      account,
      tokensData,
      signer,
      chainId,
      autoCancelOrdersLimit,
      setPendingTxns,
      setPendingOrder,
      setPendingPosition,
      blockTimestampData,
      slippageInputId,
    ]
  );

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
    onSubmitSwap,
    onSubmitIncreaseOrder,
    onSubmitDecreaseOrder,
    onSubmitWrapOrUnwrap,
    slippageInputId,
  };
}
