import { t } from "@lingui/macro";
import { getContract } from "config/contracts";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccount } from "context/SubaccountContext/SubaccountContext";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChartHeaderInfo } from "context/SyntheticsStateContext/selectors/chartSelectors";
import {
  selectBlockTimestampData,
  selectIsFirstOrder,
  selectUserReferralInfo,
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
import {
  createGasslessIncreaseOrderTxn,
  prepareSubaccountApproval,
} from "domain/synthetics/gassless/createGasslessOrderTxn";
import { createSubaccountApproval } from "domain/synthetics/gassless/subaccountUtils";
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
import { useCallback, useState } from "react";
import { useRequiredActions } from "./useRequiredActions";
import { useTPSLSummaryExecutionFee } from "./useTPSLSummaryExecutionFee";
import { parseUnits, Signer } from "ethers";
import { toast } from "react-toastify";
import { getWrappedToken } from "sdk/configs/tokens";
import { SUBACCOUNT_ORDER_ACTION } from "sdk/configs/dataStore";

// Gasless transaction settings
const USE_GASLESS_TRANSACTIONS = true; // Flag to enable/disable gasless transactions

interface TradeboxTransactionsProps {
  setPendingTxns: (txns: any) => void;
}

export function useTradeboxTransactions({ setPendingTxns }: TradeboxTransactionsProps) {
  const { chainId } = useChainId();
  const { signer, account } = useWallet();
  const { setPendingPosition, setPendingOrder } = useSyntheticsEvents();
  const tokensData = useTokensData();
  const { shouldDisableValidationForTesting } = useSettings();
  const { getExecutionFeeAmountForEntry, summaryExecutionFee } = useTPSLSummaryExecutionFee();

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
  const { isLong, isLimit } = tradeFlags;
  const triggerPrice = useSelector(selectTradeboxTriggerPrice);
  const selectedPosition = useSelector(selectTradeboxSelectedPosition);
  const allowedSlippage = useSelector(selectTradeboxAllowedSlippage);
  const executionFee = useSelector(selectTradeboxExecutionFee);
  const fees = useSelector(selectTradeboxFees);
  // Hooks for required actions
  const { requiredActions, createSltpEntries, cancelSltpEntries, updateSltpEntries } = useRequiredActions();
  const chartHeaderInfo = useSelector(selectChartHeaderInfo);

  const { autoCancelOrdersLimit } = useMaxAutoCancelOrdersState({ positionKey: selectedPosition?.key });

  const subaccount = useSubaccount(summaryExecutionFee?.feeTokenAmount ?? null, requiredActions);
  const userReferralInfo = useSelector(selectUserReferralInfo);

  // State for tracking gasless transaction status
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

  // Action creators for required actions
  const fromToken = getByKey(tokensData, fromTokenAddress);
  const toToken = getByKey(tokensData, toTokenAddress);

  // Get token allowance data
  const tokensAllowanceData = useTokensAllowanceData(chainId, {
    spenderAddress: getContract(chainId, "SyntheticsRouter"),
    tokenAddresses: fromToken ? [fromToken.address] : [],
  });

  const initialCollateralAllowance = fromToken?.address
    ? getByKey(tokensAllowanceData.tokensAllowanceData, fromToken.address)
    : undefined;

  const onSubmitSwap = useCallback(
    function onSubmitSwap() {
      const orderType = isLimit ? OrderType.LimitSwap : OrderType.MarketSwap;

      const metricData = initSwapMetricData({
        fromToken,
        toToken,
        hasReferralCode: Boolean(userReferralInfo?.referralCodeForTxn),
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
        referralCode: userReferralInfo?.referralCodeForTxn,
        executionFee: executionFee.feeTokenAmount,
        executionGasLimit: executionFee.gasLimit,
        allowedSlippage,
        tokensData,
        setPendingTxns,
        setPendingOrder,
        metricId: metricData.metricId,
        skipSimulation: shouldDisableValidationForTesting,
        blockTimestampData,
      })
        .then(makeTxnSentMetricsHandler(metricData.metricId))
        .catch(makeTxnErrorMetricsHandler(metricData.metricId))
        .catch(makeUserAnalyticsOrderFailResultHandler(chainId, metricData.metricId));
    },
    [
      isLimit,
      fromToken,
      toToken,
      userReferralInfo?.referralCodeForTxn,
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
    ]
  );

  console.log("subaccount", subaccount);

  const onSubmitIncreaseOrder = useCallback(
    async function onSubmitIncreaseOrder() {
      // Define a helper function for creating the transaction message
      const getSubmittingTxnMessage = (isLong: boolean, isLimit: boolean, isMarket: boolean) => {
        if (isLimit) {
          return t`Creating ${isLong ? "Long" : "Short"} Limit Order...`;
        }
        if (isMarket) {
          return t`Creating ${isLong ? "Long" : "Short"} Market Order...`;
        }
        return t`Creating ${isLong ? "Long" : "Short"} Order...`;
      };

      // Initialize order type flags
      const isMarket = !tradeFlags.isLimit;

      // Make the submission function async
      if (!increaseAmounts) {
        helperToast.error(t`Error submitting order`);
        return Promise.reject();
      }

      const orderType = isLimit ? increaseAmounts.limitOrderType! : OrderType.MarketIncrease;

      const metricData = initIncreaseOrderMetricData({
        fromToken,
        increaseAmounts,
        hasExistingPosition: Boolean(selectedPosition),
        leverage: formatLeverage(increaseAmounts.estimatedLeverage) ?? "",
        executionFee,
        orderType,
        hasReferralCode: Boolean(userReferralInfo?.referralCodeForTxn),
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
          (entry) => entry.decreaseAmounts?.triggerOrderType === OrderType.StopLossDecrease
        ).length,
        tpCount: createSltpEntries.filter(
          (entry) => entry.decreaseAmounts?.triggerOrderType === OrderType.LimitDecrease
        ).length,
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

      // Check if we should use gasless transactions
      if (USE_GASLESS_TRANSACTIONS && signer && fromToken && collateralToken && marketInfo && increaseAmounts) {
        try {
          // Set up the gasless transaction parameters
          const feeToken = getWrappedToken(chainId).address; // Use collateral token as fee token
          const feeAmount = parseUnits("1", 6); // Use the existing execution fee

          console.log("Setting up gasless transaction with params:", {
            feeToken,
            feeAmount: feeAmount.toString(),
            collateralToken: collateralToken.address,
            marketAddress: marketInfo.marketTokenAddress,
          });

          const subaccountApproval = subaccount
            ? await createSubaccountApproval(chainId, signer, subaccount.signer.address, {
                shouldAdd: true,
                actionType: SUBACCOUNT_ORDER_ACTION,
                deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
                maxAllowedCount: 10n,
              })
            : undefined;

          console.log("subaccountApproval", subaccountApproval);

          // Create the transaction using the gasless method
          const txnResponse = await createGasslessIncreaseOrderTxn({
            chainId,
            subaccountApproval,
            subaccountSigner: subaccount?.signer,
            createOrderParams: {
              account,
              marketAddress: marketInfo.marketTokenAddress,
              initialCollateralAddress: fromToken.address,
              initialCollateralAmount: increaseAmounts.initialCollateralAmount,
              targetCollateralAddress: collateralToken.address,
              collateralDeltaAmount: increaseAmounts.collateralDeltaAmount * 3n,
              swapPath: increaseAmounts.swapPathStats?.swapPath || [],
              sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
              sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
              triggerPrice: isLimit ? triggerPrice : undefined,
              acceptablePrice: increaseAmounts.acceptablePrice,
              isLong,
              orderType: isLimit ? increaseAmounts.limitOrderType! : OrderType.MarketIncrease,
              executionFee: executionFee.feeTokenAmount,
              executionGasLimit: executionFee.gasLimit,
              allowedSlippage,
              referralCode: userReferralInfo?.referralCodeForTxn,
              indexToken: marketInfo.indexToken,
              tokensData,
              skipSimulation: isLimit || shouldDisableValidationForTesting,
              setPendingTxns,
              setPendingOrder,
              setPendingPosition,
            },
            signer,
            feeToken,
            feeAmount,
            relayFeeToken: feeToken,
            relayFeeAmount: feeAmount,
          });

          console.log("Gasless transaction response:", txnResponse);

          // Add transaction to pending transactions list
          const txnMessage = getSubmittingTxnMessage(isLong, isLimit, isMarket);

          setPendingTxns((pendingTxns) => [
            ...pendingTxns,
            {
              hash: txnResponse.transactionHash,
              message: txnMessage,
              chainId,
              gasless: true,
            },
          ]);

          // Wait for transaction to be processed
          txnResponse.wait();

          toast.success(t`Order submitted!`);

          // Return the receipt promise so that calling code can await it if needed
          return Promise.resolve("ss" as any);
        } catch (error) {
          console.error("Error setting up gasless transaction:", error);
          // Show a user-friendly error message
          helperToast.error(t`Error with gasless transaction: ${error.message || "Unknown error"}`);

          // Fall back to regular transaction if desired
          if (window.confirm("Would you like to try submitting a regular transaction instead?")) {
            return submitRegularTransaction();
          }

          return Promise.reject(error);
        }
      }

      return submitRegularTransaction();

      function submitRegularTransaction() {
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
          return Promise.reject();
        }

        return createIncreaseOrderTxn({
          chainId,
          signer,
          subaccount,
          metricId: metricData.metricId,
          blockTimestampData,
          createIncreaseOrderParams: {
            account,
            marketAddress: marketInfo.marketTokenAddress,
            initialCollateralAddress: fromToken.address,
            initialCollateralAmount: increaseAmounts.initialCollateralAmount,
            targetCollateralAddress: collateralToken.address,
            collateralDeltaAmount: increaseAmounts.collateralDeltaAmount,
            swapPath: increaseAmounts.swapPathStats?.swapPath || [],
            sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
            sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
            triggerPrice: isLimit ? triggerPrice : undefined,
            acceptablePrice: increaseAmounts.acceptablePrice,
            isLong,
            orderType: isLimit ? increaseAmounts.limitOrderType! : OrderType.MarketIncrease,
            executionFee: executionFee.feeTokenAmount,
            executionGasLimit: executionFee.gasLimit,
            allowedSlippage,
            referralCode: userReferralInfo?.referralCodeForTxn,
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
              initialCollateralDeltaAmount: entry.decreaseAmounts?.collateralDeltaAmount ?? 0n,
              sizeDeltaUsd: entry.decreaseAmounts?.sizeDeltaUsd,
              sizeDeltaInTokens: entry.decreaseAmounts?.sizeDeltaInTokens,
              acceptablePrice: entry.decreaseAmounts?.acceptablePrice,
              triggerPrice: entry.decreaseAmounts?.triggerPrice,
              minOutputUsd: 0n,
              decreasePositionSwapType: entry.decreaseAmounts?.decreaseSwapType,
              orderType: entry.decreaseAmounts!.triggerOrderType!,
              referralCode: userReferralInfo?.referralCodeForTxn,
              executionFee: getExecutionFeeAmountForEntry(entry) ?? 0n,
              executionGasLimit: 0n, // Don't need for tp/sl entries
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
          .catch(makeTxnErrorMetricsHandler(metricData.metricId))
          .catch(makeUserAnalyticsOrderFailResultHandler(chainId, metricData.metricId));
      }
    },
    [
      tradeFlags.isLimit,
      increaseAmounts,
      isLimit,
      fromToken,
      selectedPosition,
      executionFee,
      userReferralInfo?.referralCodeForTxn,
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
      collateralToken,
      signer,
      chainId,
      shouldDisableValidationForTesting,
      setPendingTxns,
      setPendingOrder,
      setPendingPosition,
      blockTimestampData,
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
        swapPath: [],
        orderType: decreaseAmounts?.triggerOrderType,
        hasReferralCode: Boolean(userReferralInfo?.referralCodeForTxn),
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
          referralCode: userReferralInfo?.referralCodeForTxn,
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
      userReferralInfo?.referralCodeForTxn,
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
    pendingTaskId,
  };
}
