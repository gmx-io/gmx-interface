/* eslint-disable @typescript-eslint/no-unused-vars */
import { t } from "@lingui/macro";
import { useCallback, useId } from "react";

import { getContract } from "config/contracts";
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
import {
  selectRelayerFeeState,
  selectRelayerFeeSwapParams,
} from "context/SyntheticsStateContext/selectors/relayserFeeSelectors";
import { selectIsLeverageSliderEnabled } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { selectTokenPermits } from "context/SyntheticsStateContext/selectors/tokenPermitsSelectors";
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
import { selectTradeBoxCreateOrderParams } from "context/SyntheticsStateContext/selectors/transactionsSelectors/tradeBoxOrdersSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useUserReferralCode } from "domain/referrals";
import { sendUniversalBatchTxn } from "domain/synthetics/gassless/txns/universalTxn";
import { useOrderTxnCallbacks } from "domain/synthetics/gassless/txns/useOrderTxnCallbacks";
import { useRelayRouterNonce } from "domain/synthetics/gassless/txns/useRelayRouterNonce";
import { createWrapOrUnwrapTxn } from "domain/synthetics/orders/createWrapOrUnwrapTxn";
import { useTokensAllowanceData } from "domain/synthetics/tokens";
import { useMaxAutoCancelOrdersState } from "domain/synthetics/trade/useMaxAutoCancelOrdersState";
import { useChainId } from "lib/chains";
import { parseError } from "lib/errors";
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
  const { relayRouterNonce } = useRelayRouterNonce();
  const cbFactories = useOrderTxnCallbacks();

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
  const relayerFeeSwapParams = useSelector(selectRelayerFeeSwapParams);
  const tokenPermits = useSelector(selectTokenPermits);

  const setShouldFallbackToInternalSwap = useSelector(selectSetShouldFallbackToInternalSwap);

  const selectedPosition = useSelector(selectTradeboxSelectedPosition);
  const executionFee = useSelector(selectTradeboxExecutionFee);
  const triggerPrice = useSelector(selectTradeboxTriggerPrice);
  const { triggerRatio = EMPTY_TRIGGER_RATIO } = useSelector(selectTradeboxTradeRatios);
  const { referralCodeForTxn } = useUserReferralCode(signer, chainId, account);

  const fromToken = getByKey(tokensData, fromTokenAddress);

  const { requiredActions, createSltpEntries, cancelSltpEntries, updateSltpEntries } = useRequiredActions();

  const { autoCancelOrdersLimit } = useMaxAutoCancelOrdersState({ positionKey: selectedPosition?.key });

  const subaccount = useSelector(makeSelectSubaccountForActions(requiredActions));

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

  const primaryCreateOrderParams = useSelector(selectTradeBoxCreateOrderParams);
  const slippageInputId = useId();

  // const additionalErrorContent = primaryCreateOrderParams.collateralTransferParams.externalSwapQuote ? (
  //   <>
  //     <br />
  //     <br />
  //     <Trans>External swap is temporarily disabled. Please try again.</Trans>
  //   </>
  // ) : undefined;

  // const ctx = {
  //   slippageInputId,
  //   batchParams,
  //   metricId: "swap:1",
  // };

  // const callback = (event) => {
  //   console.log("event", event, ctx);
  // };

  const initialCollateralAllowance = fromToken?.address
    ? getByKey(tokensAllowanceData.tokensAllowanceData, fromToken.address)
    : undefined;

  const onSubmitOrder = useCallback(async () => {
    // sendOrderSubmittedMetric(metricData.metricId);

    if (!primaryCreateOrderParams || !signer || !tokensData || !account || !marketsInfoData) {
      helperToast.error(t`Error submitting order`);
      // sendTxnValidationErrorMetric(metricData.metricId);
      return Promise.reject();
    }

    return sendUniversalBatchTxn({
      chainId,
      signer,
      batchParams: {
        createOrderParams: [primaryCreateOrderParams, ...(secondaryOrderPayloads?.createPayloads ?? [])],
        updateOrderParams: secondaryOrderPayloads?.updatePayloads ?? [],
        cancelOrderParams: secondaryOrderPayloads?.cancelPayloads ?? [],
      },
      expressParams:
        expressOrdersEnabled && relayerFeeSwapParams && relayRouterNonce !== undefined
          ? {
              subaccount,
              relayFeeParams: relayerFeeSwapParams,
              tokenPermits: tokenPermits ?? [],
              relayRouterNonce,
            }
          : undefined,
      tokensData,
      marketsInfoData,
      blockTimestampData,
      skipSimulation: shouldDisableValidationForTesting,
      callback: (event) => {
        const parsed = "error" in event.data ? parseError(event.data.error as any) : undefined;
        console.log("event", event, parsed);
      },
    });
  }, [
    primaryCreateOrderParams,
    signer,
    tokensData,
    account,
    marketsInfoData,
    chainId,
    secondaryOrderPayloads?.createPayloads,
    secondaryOrderPayloads?.updatePayloads,
    secondaryOrderPayloads?.cancelPayloads,
    expressOrdersEnabled,
    relayerFeeSwapParams,
    relayRouterNonce,
    subaccount,
    tokenPermits,
    blockTimestampData,
    shouldDisableValidationForTesting,
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
  };
}
