import { useEffect } from "react";

import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import { selectGasPrice, selectRawSubaccount } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectExpressOrdersEnabled } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import {
  selectExternalSwapInputs,
  selectExternalSwapQuote,
  selectExternalSwapRequestResult,
  selectSetExternalSwapRequestResult,
  selectSetShouldFallbackToInternalSwap,
  selectSetShouldForceExternalSwap,
  selectShouldFallbackToInternalSwap,
  selectShouldForceExternalSwap,
  selectShouldRequestExternalSwapQuote,
  selectTradeboxAllowedSlippage,
  selectTradeboxFromTokenAddress,
  selectTradeboxSelectSwapToToken,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useChainId } from "lib/chains";
import { throttleLog } from "lib/logging";
import { getContract } from "sdk/configs/contracts";

import { useExternalSwapInputRequest } from "./useExternalSwapInputRequest";
import { useExternalSwapOutputRequest } from "./useExternalSwapOutputRequest";
import { getExternalSwapRequestKey } from "./utils";

export function useExternalSwapHandler() {
  const { chainId } = useChainId();
  const { orderStatuses } = useSyntheticsEvents();
  const fromTokenAddress = useSelector(selectTradeboxFromTokenAddress);
  const slippage = useSelector(selectTradeboxAllowedSlippage);
  const storedResult = useSelector(selectExternalSwapRequestResult);
  const setRequestResult = useSelector(selectSetExternalSwapRequestResult);
  const gasPrice = useSelector(selectGasPrice);

  const swapToToken = useSelector(selectTradeboxSelectSwapToToken);

  const externalSwapInputs = useSelector(selectExternalSwapInputs);
  const shouldDebugValues = useShowDebugValues();

  const externalSwapQuote = useSelector(selectExternalSwapQuote);
  const shouldFallbackToInternalSwap = useSelector(selectShouldFallbackToInternalSwap);
  const setShouldFallbackToInternalSwap = useSelector(selectSetShouldFallbackToInternalSwap);
  const shouldForceExternalSwap = useSelector(selectShouldForceExternalSwap);
  const setShouldForceExternalSwap = useSelector(selectSetShouldForceExternalSwap);

  const hasRawSubaccount = Boolean(useSelector(selectRawSubaccount));
  const expressOrdersEnabled = useSelector(selectExpressOrdersEnabled);
  const swapToTokenAddress = swapToToken?.address;

  const enabled = useSelector(selectShouldRequestExternalSwapQuote);

  const isByToValue = externalSwapInputs?.strategy === "byToValue";

  const { quote: outputQuote, error: outputError } = useExternalSwapOutputRequest({
    chainId,
    tokenInAddress: fromTokenAddress,
    tokenOutAddress: swapToToken?.address,
    amountIn: externalSwapInputs?.amountIn,
    receiverAddress: getContract(chainId, "OrderVault"),
    slippage,
    gasPrice,
    enabled: enabled && !isByToValue,
  });

  const { quote: inputQuote, error: inputError } = useExternalSwapInputRequest({
    chainId,
    tokenInAddress: fromTokenAddress,
    tokenOutAddress: swapToToken?.address,
    desiredAmountOut: externalSwapInputs?.desiredAmountOut,
    initialAmountIn: externalSwapInputs?.amountIn,
    receiverAddress: getContract(chainId, "OrderVault"),
    slippage,
    gasPrice,
    enabled: enabled && isByToValue,
  });

  const quote = isByToValue ? inputQuote : outputQuote;
  const requestError = isByToValue ? inputError : outputError;

  if (shouldDebugValues) {
    throttleLog("external swaps", {
      quote,
      externalSwapQuote,
      inputs: externalSwapInputs,
      isByToValue,
    });
  }

  useEffect(
    function syncRequestResultEff() {
      const shouldClear =
        !enabled ||
        externalSwapInputs?.amountIn === undefined ||
        externalSwapInputs.amountIn <= 0n ||
        !fromTokenAddress ||
        !swapToToken?.address;

      if (shouldClear) {
        if (storedResult !== undefined) {
          setRequestResult(undefined);
        }
        return;
      }

      const key = getExternalSwapRequestKey({
        fromTokenAddress,
        toTokenAddress: swapToToken.address,
        strategy: externalSwapInputs.strategy,
        amountIn: externalSwapInputs.amountIn,
        desiredAmountOut: externalSwapInputs.desiredAmountOut,
        slippage,
      });
      if (!key) return;

      if (requestError) {
        if (storedResult?.status !== "failed" || storedResult.key !== key) {
          setRequestResult({ status: "failed", key });
        }
        return;
      }

      if (quote) {
        if (storedResult?.status !== "success" || storedResult.quote.txnData.data !== quote.txnData.data) {
          setRequestResult({ status: "success", key, quote });
        }
      }
    },
    [
      enabled,
      fromTokenAddress,
      swapToToken?.address,
      externalSwapInputs,
      slippage,
      quote,
      requestError,
      storedResult,
      setRequestResult,
    ]
  );

  useEffect(
    function resetExternalSwapFallbackEff() {
      const orderStatusesValues = Object.values(orderStatuses);
      const isLastOrderExecuted =
        orderStatusesValues.length > 0 && orderStatusesValues.every((os) => os.executedTxnHash);

      if (isLastOrderExecuted) {
        if (shouldFallbackToInternalSwap) {
          setShouldFallbackToInternalSwap(false);
        }
        if (shouldForceExternalSwap) {
          setShouldForceExternalSwap(false);
        }
      }
    },
    [
      orderStatuses,
      shouldFallbackToInternalSwap,
      setShouldFallbackToInternalSwap,
      shouldForceExternalSwap,
      setShouldForceExternalSwap,
    ]
  );

  useEffect(
    function resetFallbackFlagsOnContextChangeEff() {
      setShouldFallbackToInternalSwap(false);
      setShouldForceExternalSwap(false);
    },
    [
      hasRawSubaccount,
      expressOrdersEnabled,
      fromTokenAddress,
      swapToTokenAddress,
      chainId,
      setShouldFallbackToInternalSwap,
      setShouldForceExternalSwap,
    ]
  );
}
