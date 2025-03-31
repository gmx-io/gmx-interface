/* eslint-disable @typescript-eslint/no-unused-vars */
import { t, Trans } from "@lingui/macro";
import { useCallback } from "react";

import { getContract } from "config/contracts";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChartHeaderInfo } from "context/SyntheticsStateContext/selectors/chartSelectors";
import { selectSetShouldFallbackToInternalSwap } from "context/SyntheticsStateContext/selectors/externalSwapSelectors";
import {
  selectBlockTimestampData,
  selectIsFirstOrder,
  selectMarketsInfoData,
  selectUserReferralInfo,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { makeSelectSubaccountForActions } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectRelayerFeeState } from "context/SyntheticsStateContext/selectors/relayserFeeSelectors";
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
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { selectTradeBoxOrderPayload } from "context/SyntheticsStateContext/selectors/transactionsSelectors/tradeBoxOrdersSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useUserReferralCode } from "domain/referrals";
import { buildCancelOrderMulticallPayload } from "domain/synthetics/gassless/txns/cancelOrderBuilders";
import { buildDecreaseOrderPayload } from "domain/synthetics/gassless/txns/createOrderBuilders";
import { buildUpdateOrderMulticallPayload } from "domain/synthetics/gassless/txns/updateOrderBuilders";
import {
  combineMulticallPayloads,
  encodeCreateOrderMulticallPayload,
  sendCreateOrderOrderTxn,
} from "domain/synthetics/gassless/txns/walletTxnBuilder";
import { createWrapOrUnwrapTxn } from "domain/synthetics/orders/createWrapOrUnwrapTxn";
import { useTokensAllowanceData } from "domain/synthetics/tokens";
import { useMaxAutoCancelOrdersState } from "domain/synthetics/trade/useMaxAutoCancelOrdersState";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { getByKey } from "lib/objects";
import useWallet from "lib/wallets/useWallet";

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
  const { shouldDisableValidationForTesting, expressOrdersEnabled } = useSettings();
  const relayerFeeState = useSelector(selectRelayerFeeState);
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
  const allowedSlippage = useSelector(selectTradeboxAllowedSlippage);
  const fees = useSelector(selectTradeboxFees);
  const chartHeaderInfo = useSelector(selectChartHeaderInfo);
  const marketsInfoData = useSelector(selectMarketsInfoData);

  const setShouldFallbackToInternalSwap = useSelector(selectSetShouldFallbackToInternalSwap);

  const selectedPosition = useSelector(selectTradeboxSelectedPosition);
  const executionFee = useSelector(selectTradeboxExecutionFee);
  const triggerPrice = useSelector(selectTradeboxTriggerPrice);
  const { triggerRatio = EMPTY_TRIGGER_RATIO } = useSelector(selectTradeboxTradeRatios);
  const { referralCodeForTxn } = useUserReferralCode(signer, chainId, account);

  const fromToken = getByKey(tokensData, fromTokenAddress);
  const toToken = getByKey(tokensData, toTokenAddress);

  const { requiredActions, createSltpEntries, cancelSltpEntries, updateSltpEntries } = useRequiredActions();

  const { autoCancelOrdersLimit } = useMaxAutoCancelOrdersState({ positionKey: selectedPosition?.key });

  const subaccount = useSelector(makeSelectSubaccountForActions(requiredActions));
  const userReferralInfo = useSelector(selectUserReferralInfo);

  const tokensAllowanceData = useTokensAllowanceData(chainId, {
    spenderAddress: getContract(chainId, "SyntheticsRouter"),
    tokenAddresses: fromToken ? [fromToken.address] : [],
  });

  const secondaryOrderPayloads = useSecondaryOrderPayloads({
    cancelSltpEntries,
    createSltpEntries,
    updateSltpEntries,
    autoCancelOrdersLimit,
    getExecutionFeeAmountForEntry,
  });

  const orderCreatePayload = useSelector(selectTradeBoxOrderPayload);

  const initialCollateralAllowance = fromToken?.address
    ? getByKey(tokensAllowanceData.tokensAllowanceData, fromToken.address)
    : undefined;

  const onSubmitOrder = useCallback(() => {
    // sendOrderSubmittedMetric(metricData.metricId);

    if (!orderCreatePayload || !signer || !tokensData) {
      helperToast.error(t`Error submitting order`);
      // sendTxnValidationErrorMetric(metricData.metricId);
      return Promise.reject();
    }

    // const metricData = initSwapMetricData({
    //   fromToken,
    //   toToken,
    //   hasReferralCode: Boolean(referralCodeForTxn),
    //   swapAmounts,
    //   executionFee,
    //   allowedSlippage,
    //   orderType,
    //   subaccount,
    //   isFirstOrder,
    //   initialCollateralAllowance,
    // });

    const additionalErrorContent = orderCreatePayload.collateralTransferParams.externalSwapQuote ? (
      <>
        <br />
        <br />
        <Trans>External swap is temporarily disabled. Please try again.</Trans>
      </>
    ) : undefined;

    const encodedPrimaryOrderPayload = encodeCreateOrderMulticallPayload({
      chainId,
      createOrderPayload: orderCreatePayload,
    });

    const createSecondaryOrderPayloads = secondaryOrderPayloads?.createPayloads.map(buildDecreaseOrderPayload) ?? [];
    const encodedCreateOrderPayloads = createSecondaryOrderPayloads
      .map((p) => ({ chainId, signer, createOrderPayload: p }))
      .map(encodeCreateOrderMulticallPayload);

    const encodedUpdateOrderPayloads =
      secondaryOrderPayloads?.updatePayloads.map((p) =>
        buildUpdateOrderMulticallPayload({ chainId, updateOrderPayload: p })
      ) ?? [];

    const encodedCancelOrderPayloads = buildCancelOrderMulticallPayload({
      orderKeys: (secondaryOrderPayloads?.cancelPayloads.map((p) => p.orderKey).filter(Boolean) as string[]) ?? [],
    });

    const multicallPayloads = combineMulticallPayloads([
      encodedPrimaryOrderPayload,
      ...encodedCreateOrderPayloads,
      ...encodedUpdateOrderPayloads,
      encodedCancelOrderPayloads,
    ]);

    // eslint-disable-next-line no-console
    console.log("payloads", {
      orderCreatePayload,
      encodedPrimaryOrderPayload,
      encodedCreateOrderPayloads,
      encodedUpdateOrderPayloads,
      encodedCancelOrderPayloads,
      multicallPayloads,
    });

    return sendCreateOrderOrderTxn({
      chainId,
      signer,
      callData: multicallPayloads.callData,
      value: multicallPayloads.value,
    });
  }, [
    orderCreatePayload,
    signer,
    tokensData,
    chainId,
    secondaryOrderPayloads?.createPayloads,
    secondaryOrderPayloads?.updatePayloads,
    secondaryOrderPayloads?.cancelPayloads,
  ]);

  // const onSubmitSwap = useCallback(
  //   function onSubmitSwap() {
  //     const orderType = isLimit ? OrderType.LimitSwap : OrderType.MarketSwap;

  //     const metricData = initSwapMetricData({
  //       fromToken,
  //       toToken,
  //       hasReferralCode: Boolean(referralCodeForTxn),
  //       swapAmounts,
  //       executionFee,
  //       allowedSlippage,
  //       orderType,
  //       subaccount,
  //       isFirstOrder,
  //       initialCollateralAllowance,
  //     });

  //     sendOrderSubmittedMetric(metricData.metricId);

  //     if (
  //       !account ||
  //       !tokensData ||
  //       !swapAmounts?.swapPathStats ||
  //       !fromToken ||
  //       !toToken ||
  //       !executionFee ||
  //       !signer ||
  //       typeof allowedSlippage !== "number"
  //     ) {
  //       helperToast.error(t`Error submitting order`);
  //       sendTxnValidationErrorMetric(metricData.metricId);
  //       return Promise.reject();
  //     }

  //     sendUserAnalyticsOrderConfirmClickEvent(chainId, metricData.metricId);

  //     return createSwapOrderTxn(chainId, signer, subaccount, {
  //       account,
  //       fromTokenAddress: fromToken.address,
  //       fromTokenAmount: swapAmounts.amountIn,
  //       swapPath: swapAmounts.swapPathStats?.swapPath,
  //       toTokenAddress: toToken.address,
  //       orderType,
  //       minOutputAmount: swapAmounts.minOutputAmount,
  //       triggerRatio: triggerRatio?.ratio ?? 0n,
  //       referralCode: referralCodeForTxn,
  //       executionFee: executionFee.feeTokenAmount,
  //       executionGasLimit: executionFee.gasLimit,
  //       allowedSlippage,
  //       tokensData,
  //       setPendingTxns,
  //       setPendingOrder,
  //       metricId: metricData.metricId,
  //       skipSimulation: shouldDisableValidationForTesting,
  //       blockTimestampData,
  //     })
  //       .then(makeTxnSentMetricsHandler(metricData.metricId))
  //       .catch(makeTxnErrorMetricsHandler(metricData.metricId))
  //       .catch(makeUserAnalyticsOrderFailResultHandler(chainId, metricData.metricId));
  //   },
  //   [
  //     isLimit,
  //     fromToken,
  //     toToken,
  //     referralCodeForTxn,
  //     swapAmounts,
  //     executionFee,
  //     allowedSlippage,
  //     subaccount,
  //     isFirstOrder,
  //     initialCollateralAllowance,
  //     account,
  //     tokensData,
  //     signer,
  //     chainId,
  //     triggerRatio?.ratio,
  //     setPendingTxns,
  //     setPendingOrder,
  //     shouldDisableValidationForTesting,
  //     blockTimestampData,
  //   ]
  // );

  // const onSubmitIncreaseOrder = useCallback(
  //   async function onSubmitIncreaseOrder() {
  //     // Define a helper function for creating the transaction message
  //     const getSubmittingTxnMessage = (isLong: boolean, isLimit: boolean, isMarket: boolean) => {
  //       if (isLimit) {
  //         return t`Creating ${isLong ? "Long" : "Short"} Limit Order...`;
  //       }
  //       if (isMarket) {
  //         return t`Creating ${isLong ? "Long" : "Short"} Market Order...`;
  //       }
  //       return t`Creating ${isLong ? "Long" : "Short"} Order...`;
  //     };

  //     // Initialize order type flags
  //     const isMarket = !tradeFlags.isLimit;

  //     // Make the submission function async
  //     if (!increaseAmounts) {
  //       helperToast.error(t`Error submitting order`);
  //       return Promise.reject();
  //     }

  //     console.log(
  //       "params",
  //       expressOrdersEnabled,
  //       signer,
  //       fromToken,
  //       collateralToken,
  //       marketInfo,
  //       increaseAmounts,
  //       relayerFeeState
  //     );

  //     if (
  //       expressOrdersEnabled &&
  //       signer &&
  //       fromToken &&
  //       collateralToken &&
  //       marketInfo &&
  //       increaseAmounts &&
  //       relayerFeeState &&
  //       marketsInfoData
  //     ) {
  //       try {
  //         // Create the transaction using the gasless method
  //         const txnResponse = await createGasslessIncreaseOrderTxn({
  //           marketsInfoData,
  //           chainId,
  //           signer,
  //           subaccountApproval: gasslessState.subaccountApprovalForTxn,
  //           subaccountSigner: subaccount?.signer,
  //           tokenPermits: gasslessState.tokenPermits,
  //           relayFeeParams: {
  //             gasPaymentTokenAddress: relayerFeeState?.gasPaymentTokenAddress,
  //             relayerFeeTokenAddress: relayerFeeState?.relayerFeeTokenAddress,
  //             gasPaymentTokenAmount: relayerFeeState?.gasPaymentTokenAmount,
  //             relayerFeeTokenAmount: relayerFeeState?.relayerFeeAmount,
  //             externalSwapQuote: relayerFeeState.externalSwapOutput
  //               ? {
  //                   to: relayerFeeState.externalSwapOutput.txnData.to,
  //                   data: relayerFeeState.externalSwapOutput.txnData.data,
  //                 }
  //               : undefined,
  //             swapPath: relayerFeeState?.internalSwapStats?.swapPath || [],
  //           },
  //           createOrderParams: {
  //             externalSwapQuote: increaseAmounts.externalSwapQuote,
  //             account: account!,
  //             marketAddress: marketInfo.marketTokenAddress,
  //             initialCollateralAddress: fromToken.address,
  //             initialCollateralAmount: increaseAmounts.initialCollateralAmount,
  //             targetCollateralAddress: collateralToken.address,
  //             collateralDeltaAmount: increaseAmounts.collateralDeltaAmount * 3n,
  //             swapPath: increaseAmounts.swapPathStats?.swapPath || [],
  //             sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
  //             sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
  //             triggerPrice: isLimit ? triggerPrice : undefined,
  //             acceptablePrice: increaseAmounts.acceptablePrice,
  //             isLong,
  //             orderType: isLimit ? increaseAmounts.limitOrderType! : OrderType.MarketIncrease,
  //             executionFee: executionFee!.feeTokenAmount,
  //             executionGasLimit: executionFee!.gasLimit,
  //             allowedSlippage,
  //             referralCode: referralCodeForTxn,
  //             indexToken: marketInfo.indexToken,
  //             tokensData: tokensData!,
  //             skipSimulation: isLimit || shouldDisableValidationForTesting,
  //             setPendingTxns,
  //             setPendingOrder,
  //             setPendingPosition,
  //           },
  //         }).then((r) => {
  //           gasslessState.resetSubaccountApproval();
  //           gasslessState.resetTokenPermits();
  //           return r;
  //         });

  //         console.log("Gasless transaction response:", txnResponse);

  //         // Add transaction to pending transactions list
  //         const txnMessage = getSubmittingTxnMessage(isLong, isLimit, isMarket);

  //         setPendingTxns((pendingTxns) => [
  //           ...pendingTxns,
  //           {
  //             hash: txnResponse.transactionHash,
  //             message: txnMessage,
  //             chainId,
  //             gasless: true,
  //           },
  //         ]);

  //         // Wait for transaction to be processed
  //         txnResponse.wait();

  //         toast.success(t`Order submitted!`);

  //         // Return the receipt promise so that calling code can await it if needed
  //         return Promise.resolve("ss" as any);
  //       } catch (error) {
  //         console.error("Error setting up gasless transaction:", error);
  //         // Show a user-friendly error message
  //         helperToast.error(t`Error with gasless transaction: ${error.message || "Unknown error"}`);

  //         // Fall back to regular transaction if desired

  //         return Promise.reject(error);
  //       }
  //     }

  //     const orderType = isLimit ? increaseAmounts.limitOrderType! : OrderType.MarketIncrease;

  //     const metricData = initIncreaseOrderMetricData({
  //       fromToken,
  //       increaseAmounts,
  //       hasExistingPosition: Boolean(selectedPosition),
  //       leverage: formatLeverage(increaseAmounts.estimatedLeverage) ?? "",
  //       executionFee,
  //       orderType,
  //       hasReferralCode: Boolean(referralCodeForTxn),
  //       subaccount,
  //       triggerPrice,
  //       allowedSlippage,
  //       marketInfo,
  //       isLong,
  //       isFirstOrder,
  //       isLeverageEnabled: isLeverageSliderEnabled,
  //       initialCollateralAllowance,
  //       isTPSLCreated: createSltpEntries.length > 0,
  //       slCount: createSltpEntries.filter(
  //         (entry) => entry.decreaseAmounts?.triggerOrderType === OrderType.StopLossDecrease
  //       ).length,
  //       tpCount: createSltpEntries.filter(
  //         (entry) => entry.decreaseAmounts?.triggerOrderType === OrderType.LimitDecrease
  //       ).length,
  //       priceImpactDeltaUsd: increaseAmounts.positionPriceImpactDeltaUsd,
  //       priceImpactPercentage: fees?.positionPriceImpact?.precisePercentage,
  //       netRate1h: isLong ? chartHeaderInfo?.fundingRateLong : chartHeaderInfo?.fundingRateShort,
  //       interactionId: marketInfo?.name
  //         ? userAnalytics.getInteractionId(getTradeInteractionKey(marketInfo.name))
  //         : undefined,
  //       externalSwapQuote: increaseAmounts?.externalSwapQuote,
  //     });

  //     sendOrderSubmittedMetric(metricData.metricId);

  //     if (
  //       !tokensData ||
  //       !account ||
  //       !fromToken ||
  //       !collateralToken ||
  //       increaseAmounts.acceptablePrice === undefined ||
  //       !executionFee ||
  //       !marketInfo ||
  //       !signer ||
  //       typeof allowedSlippage !== "number"
  //     ) {
  //       helperToast.error(t`Error submitting order`);
  //       sendTxnValidationErrorMetric(metricData.metricId);
  //       return Promise.reject();
  //     }

  //     const commonSecondaryOrderParams = {
  //       account,
  //       marketAddress: marketInfo.marketTokenAddress,
  //       swapPath: [],
  //       allowedSlippage,
  //       initialCollateralAddress: collateralToken.address,
  //       receiveTokenAddress: collateralToken.address,
  //       isLong,
  //       indexToken: marketInfo.indexToken,
  //     };

  //     sendUserAnalyticsOrderConfirmClickEvent(chainId, metricData.metricId);

  //     const additionalErrorContent = increaseAmounts.externalSwapQuote ? (
  //       <>
  //         <br />
  //         <br />
  //         <Trans>External swap is temporarily disabled. Please try again.</Trans>
  //       </>
  //     ) : undefined;

  //     return createIncreaseOrderTxn({
  //       chainId,
  //       signer,
  //       subaccount,
  //       metricId: metricData.metricId,
  //       blockTimestampData,
  //       additionalErrorContent,
  //       createIncreaseOrderParams: {
  //         account,
  //         marketAddress: marketInfo.marketTokenAddress,
  //         initialCollateralAddress: fromToken?.address,
  //         initialCollateralAmount: increaseAmounts.initialCollateralAmount,
  //         targetCollateralAddress: collateralToken.address,
  //         collateralDeltaAmount: increaseAmounts.collateralDeltaAmount,
  //         swapPath: increaseAmounts.swapPathStats?.swapPath || [],
  //         externalSwapQuote: increaseAmounts.externalSwapQuote,
  //         sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
  //         sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
  //         triggerPrice: isLimit ? triggerPrice : undefined,
  //         acceptablePrice: increaseAmounts.acceptablePrice,
  //         isLong,
  //         orderType: isLimit ? increaseAmounts.limitOrderType! : OrderType.MarketIncrease,
  //         executionFee: executionFee.feeTokenAmount,
  //         executionGasLimit: executionFee.gasLimit,
  //         allowedSlippage,
  //         referralCode: referralCodeForTxn,
  //         indexToken: marketInfo.indexToken,
  //         tokensData,
  //         skipSimulation: isLimit || shouldDisableValidationForTesting,
  //         setPendingTxns: setPendingTxns,
  //         setPendingOrder,
  //         setPendingPosition,
  //       },
  //       createDecreaseOrderParams: createSltpEntries.map((entry, i) => {
  //         return {
  //           ...commonSecondaryOrderParams,
  //           initialCollateralDeltaAmount: entry.decreaseAmounts.collateralDeltaAmount ?? 0n,
  //           sizeDeltaUsd: entry.decreaseAmounts.sizeDeltaUsd,
  //           sizeDeltaInTokens: entry.decreaseAmounts.sizeDeltaInTokens,
  //           acceptablePrice: entry.decreaseAmounts.acceptablePrice,
  //           triggerPrice: entry.decreaseAmounts.triggerPrice,
  //           minOutputUsd: 0n,
  //           decreasePositionSwapType: entry.decreaseAmounts.decreaseSwapType,
  //           orderType: entry.decreaseAmounts.triggerOrderType!,
  //           referralCode: referralCodeForTxn,
  //           executionFee: getExecutionFeeAmountForEntry(entry) ?? 0n,
  //           executionGasLimit: 0n, // Don't need for tp/sl entries
  //           tokensData,
  //           txnType: entry.txnType!,
  //           skipSimulation: isLimit || shouldDisableValidationForTesting,
  //           autoCancel: i < autoCancelOrdersLimit,
  //         };
  //       }),
  //       cancelOrderParams: cancelSltpEntries.map((entry) => ({
  //         ...commonSecondaryOrderParams,
  //         orderKey: entry.order!.key,
  //         orderType: entry.order!.orderType,
  //         minOutputAmount: 0n,
  //         sizeDeltaUsd: entry.order!.sizeDeltaUsd,
  //         txnType: entry.txnType!,
  //         initialCollateralDeltaAmount: entry.order?.initialCollateralDeltaAmount ?? 0n,
  //       })),
  //       updateOrderParams: updateSltpEntries.map((entry) => ({
  //         ...commonSecondaryOrderParams,
  //         orderKey: entry.order!.key,
  //         orderType: entry.order!.orderType,
  //         sizeDeltaUsd: (entry.increaseAmounts?.sizeDeltaUsd || entry.decreaseAmounts?.sizeDeltaUsd)!,
  //         acceptablePrice: (entry.increaseAmounts?.acceptablePrice || entry.decreaseAmounts?.acceptablePrice)!,
  //         triggerPrice: (entry.increaseAmounts?.triggerPrice || entry.decreaseAmounts?.triggerPrice)!,
  //         executionFee: getExecutionFeeAmountForEntry(entry) ?? 0n,
  //         minOutputAmount: 0n,
  //         txnType: entry.txnType!,
  //         initialCollateralDeltaAmount: entry.order?.initialCollateralDeltaAmount ?? 0n,
  //         autoCancel: entry.order!.autoCancel,
  //       })),
  //     })
  //       .then(makeTxnSentMetricsHandler(metricData.metricId))
  //       .catch(makeTxnErrorMetricsHandler(metricData.metricId))
  //       .catch((e) => {
  //         if (isPossibleExternalSwapError(e) && increaseAmounts.externalSwapQuote) {
  //           setShouldFallbackToInternalSwap(true);
  //         }

  //         throw e;
  //       })
  //       .catch(makeUserAnalyticsOrderFailResultHandler(chainId, metricData.metricId));
  //   },
  //   [
  //     tradeFlags.isLimit,
  //     increaseAmounts,
  //     expressOrdersEnabled,
  //     signer,
  //     fromToken,
  //     collateralToken,
  //     marketInfo,
  //     relayerFeeState,
  //     marketsInfoData,
  //     isLimit,
  //     selectedPosition,
  //     executionFee,
  //     referralCodeForTxn,
  //     subaccount,
  //     triggerPrice,
  //     allowedSlippage,
  //     isLong,
  //     isFirstOrder,
  //     isLeverageSliderEnabled,
  //     initialCollateralAllowance,
  //     createSltpEntries,
  //     fees?.positionPriceImpact?.precisePercentage,
  //     chartHeaderInfo?.fundingRateLong,
  //     chartHeaderInfo?.fundingRateShort,
  //     tokensData,
  //     account,
  //     chainId,
  //     blockTimestampData,
  //     shouldDisableValidationForTesting,
  //     setPendingTxns,
  //     setPendingOrder,
  //     setPendingPosition,
  //     cancelSltpEntries,
  //     updateSltpEntries,
  //     gasslessState,
  //     getExecutionFeeAmountForEntry,
  //     autoCancelOrdersLimit,
  //     setShouldFallbackToInternalSwap,
  //   ]
  // );

  // const onSubmitDecreaseOrder = useCallback(
  //   function onSubmitDecreaseOrder() {
  //     const metricData = initDecreaseOrderMetricData({
  //       collateralToken,
  //       decreaseAmounts,
  //       hasExistingPosition: Boolean(selectedPosition),
  //       executionFee,
  //       swapPath: [],
  //       orderType: decreaseAmounts?.triggerOrderType,
  //       hasReferralCode: Boolean(userReferralInfo?.referralCodeForTxn),
  //       subaccount,
  //       triggerPrice,
  //       marketInfo,
  //       allowedSlippage,
  //       isLong,
  //       place: "tradeBox",
  //       interactionId: marketInfo?.name ? userAnalytics.getInteractionId(getTradeInteractionKey(marketInfo.name)) : "",
  //       priceImpactDeltaUsd: decreaseAmounts?.positionPriceImpactDeltaUsd,
  //       priceImpactPercentage: fees?.positionPriceImpact?.precisePercentage,
  //       netRate1h: isLong ? chartHeaderInfo?.fundingRateLong : chartHeaderInfo?.fundingRateShort,
  //     });

  //     sendOrderSubmittedMetric(metricData.metricId);

  //     if (
  //       !account ||
  //       !marketInfo ||
  //       !collateralToken ||
  //       decreaseAmounts?.triggerOrderType === undefined ||
  //       decreaseAmounts?.triggerThresholdType === undefined ||
  //       decreaseAmounts?.acceptablePrice === undefined ||
  //       decreaseAmounts?.triggerPrice === undefined ||
  //       !executionFee ||
  //       !tokensData ||
  //       !signer ||
  //       typeof allowedSlippage !== "number"
  //     ) {
  //       helperToast.error(t`Error submitting order`);
  //       sendTxnValidationErrorMetric(metricData.metricId);
  //       return Promise.reject();
  //     }

  //     sendUserAnalyticsOrderConfirmClickEvent(chainId, metricData.metricId);

  //     return createDecreaseOrderTxn(
  //       chainId,
  //       signer,
  //       subaccount,
  //       {
  //         account,
  //         marketAddress: marketInfo.marketTokenAddress,
  //         swapPath: [],
  //         initialCollateralDeltaAmount: decreaseAmounts.collateralDeltaAmount,
  //         initialCollateralAddress: collateralToken.address,
  //         receiveTokenAddress: collateralToken.address,
  //         triggerPrice: decreaseAmounts.triggerPrice,
  //         acceptablePrice: decreaseAmounts.acceptablePrice,
  //         sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
  //         sizeDeltaInTokens: decreaseAmounts.sizeDeltaInTokens,
  //         minOutputUsd: BigInt(0),
  //         isLong,
  //         decreasePositionSwapType: decreaseAmounts.decreaseSwapType,
  //         orderType: decreaseAmounts?.triggerOrderType,
  //         executionFee: executionFee.feeTokenAmount,
  //         executionGasLimit: executionFee.gasLimit,
  //         allowedSlippage,
  //         referralCode: userReferralInfo?.referralCodeForTxn,
  //         // Skip simulation to avoid EmptyPosition error
  //         // skipSimulation: !existingPosition || shouldDisableValidation,
  //         skipSimulation: true,
  //         indexToken: marketInfo.indexToken,
  //         tokensData,
  //         autoCancel: autoCancelOrdersLimit > 0,
  //       },
  //       {
  //         setPendingTxns,
  //         setPendingOrder,
  //         setPendingPosition,
  //       },
  //       blockTimestampData,
  //       metricData.metricId
  //     )
  //       .then(makeTxnSentMetricsHandler(metricData.metricId))
  //       .catch(makeTxnErrorMetricsHandler(metricData.metricId))
  //       .catch(makeUserAnalyticsOrderFailResultHandler(chainId, metricData.metricId));
  //   },
  //   [
  //     collateralToken,
  //     decreaseAmounts,
  //     selectedPosition,
  //     executionFee,
  //     userReferralInfo?.referralCodeForTxn,
  //     subaccount,
  //     triggerPrice,
  //     marketInfo,
  //     allowedSlippage,
  //     isLong,
  //     fees?.positionPriceImpact?.precisePercentage,
  //     chartHeaderInfo?.fundingRateLong,
  //     chartHeaderInfo?.fundingRateShort,
  //     account,
  //     tokensData,
  //     signer,
  //     chainId,
  //     autoCancelOrdersLimit,
  //     setPendingTxns,
  //     setPendingOrder,
  //     setPendingPosition,
  //     blockTimestampData,
  //   ]
  // );

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
  };
}
