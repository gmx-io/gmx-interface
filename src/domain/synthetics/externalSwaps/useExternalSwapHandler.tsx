import { useEffect } from "react";

import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import { selectGasPrice } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectBaseExternalSwapOutput,
  selectExternalSwapInputs,
  selectExternalSwapQuote,
  selectSetBaseExternalSwapOutput,
  selectSetShouldFallbackToInternalSwap,
  selectSetShouldForceExternalSwap,
  selectShouldFallbackToInternalSwap,
  selectShouldForceExternalSwap,
  selectTradeboxAllowedSlippage,
  selectTradeboxFromTokenAddress,
  selectTradeboxSelectSwapToToken,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useChainId } from "lib/chains";
import { throttleLog } from "lib/logging";
import { getContract } from "sdk/configs/contracts";

import { useExternalSwapOutputRequest } from "./useExternalSwapOutputRequest";
import { useExternalSwapsEnabled } from "./useExternalSwapsEnabled";

export function useExternalSwapHandler() {
  const { chainId } = useChainId();
  const { orderStatuses } = useSyntheticsEvents();
  const fromTokenAddress = useSelector(selectTradeboxFromTokenAddress);
  const slippage = useSelector(selectTradeboxAllowedSlippage);
  const setBaseExternalSwapOutput = useSelector(selectSetBaseExternalSwapOutput);
  const storedBaseExternalSwapOutput = useSelector(selectBaseExternalSwapOutput);
  const gasPrice = useSelector(selectGasPrice);

  const swapToToken = useSelector(selectTradeboxSelectSwapToToken);

  const externalSwapInputs = useSelector(selectExternalSwapInputs);
  const shouldDebugValues = useShowDebugValues();

  const externalSwapQuote = useSelector(selectExternalSwapQuote);
  const shouldFallbackToInternalSwap = useSelector(selectShouldFallbackToInternalSwap);
  const setShouldFallbackToInternalSwap = useSelector(selectSetShouldFallbackToInternalSwap);
  const shouldForceExternalSwap = useSelector(selectShouldForceExternalSwap);
  const setShouldForceExternalSwap = useSelector(selectSetShouldForceExternalSwap);

  const enabled = useExternalSwapsEnabled();

  const { quote } = useExternalSwapOutputRequest({
    chainId,
    tokenInAddress: fromTokenAddress,
    tokenOutAddress: swapToToken?.address,
    amountIn: externalSwapInputs?.amountIn,
    receiverAddress: getContract(chainId, "OrderVault"),
    slippage,
    gasPrice,
    enabled,
  });

  if (shouldDebugValues) {
    throttleLog("external swaps", {
      baseOutput: quote,
      externalSwapQuote,
      inputs: externalSwapInputs,
    });
  }

  useEffect(
    function setBaseExternalSwapOutputEff() {
      const shouldClearBaseOutput =
        !enabled ||
        externalSwapInputs?.amountIn === undefined ||
        externalSwapInputs.amountIn <= 0n ||
        !fromTokenAddress ||
        !swapToToken?.address;

      if (shouldClearBaseOutput) {
        if (storedBaseExternalSwapOutput !== undefined) {
          setBaseExternalSwapOutput(undefined);
        }

        return;
      }

      // Keep last quote while refresh is loading to avoid flapping to internal swap pricing
      if (!quote) {
        return;
      }

      // Update quote only if actual txn data has changed
      if (storedBaseExternalSwapOutput?.txnData?.data !== quote.txnData.data) {
        setBaseExternalSwapOutput(quote);
      }
    },
    [
      enabled,
      externalSwapInputs?.amountIn,
      fromTokenAddress,
      quote,
      setBaseExternalSwapOutput,
      storedBaseExternalSwapOutput,
      swapToToken?.address,
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
}
