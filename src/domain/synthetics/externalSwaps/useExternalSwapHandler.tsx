import { useEffect } from "react";

import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import { selectGasPrice } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectBaseExternalSwapOutput,
  selectExternalSwapInputs,
  selectExternalSwapQuote,
  selectSetBaseExternalSwapOutput,
  selectSetExternalSwapIsLoading,
  selectSetShouldFallbackToInternalSwap,
  selectShouldFallbackToInternalSwap,
  selectShouldRequestExternalSwapQuote,
  selectTradeboxAllowedSlippage,
  selectTradeboxFromTokenAddress,
  selectTradeboxSelectSwapToToken,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useChainId } from "lib/chains";
import { throttleLog } from "lib/logging";
import { getContract } from "sdk/configs/contracts";

import { useExternalSwapOutputRequest } from "./useExternalSwapOutputRequest";
import { useExternalSwapReverseSearch } from "./useExternalSwapReverseSearch";
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
  const setIsLoading = useSelector(selectSetExternalSwapIsLoading);

  const shouldRequest = useSelector(selectShouldRequestExternalSwapQuote);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);

  const enabled = useExternalSwapsEnabled();

  const isReverseSearch = externalSwapInputs?.strategy === "byToValue";

  const { quote: forwardQuote, isLoading: isForwardLoading } = useExternalSwapOutputRequest({
    chainId,
    tokenInAddress: fromTokenAddress,
    tokenOutAddress: swapToToken?.address,
    amountIn: externalSwapInputs?.amountIn,
    receiverAddress: getContract(chainId, "OrderVault"),
    slippage,
    gasPrice,
    enabled: enabled && !isReverseSearch,
  });

  const { quote: reverseQuote, isLoading: isReverseLoading } = useExternalSwapReverseSearch({
    chainId,
    tokenInAddress: fromTokenAddress,
    tokenOutAddress: swapToToken?.address,
    desiredAmountOut: externalSwapInputs?.desiredAmountOut,
    initialAmountIn: externalSwapInputs?.amountIn,
    receiverAddress: getContract(chainId, "OrderVault"),
    slippage,
    gasPrice,
    enabled: enabled && isReverseSearch,
  });

  const quote = isReverseSearch ? reverseQuote : forwardQuote;

  const isHookLoading = isReverseSearch ? isReverseLoading : isForwardLoading;

  useEffect(
    function updateExternalSwapLoadingEff() {
      const isSwapMarket = tradeFlags.isSwap && tradeFlags.isMarket;
      const hasInputs = Boolean(shouldRequest && externalSwapInputs && externalSwapInputs.amountIn > 0n);
      const newIsLoading = isSwapMarket && hasInputs && isHookLoading;

      setIsLoading(newIsLoading);
    },
    [
      tradeFlags.isSwap,
      tradeFlags.isMarket,
      shouldRequest,
      externalSwapInputs,
      isHookLoading,
      setIsLoading,
      isReverseSearch,
      isForwardLoading,
      isReverseLoading,
      enabled,
    ]
  );

  if (shouldDebugValues) {
    throttleLog("external swaps", {
      baseOutput: quote,
      externalSwapQuote,
      inputs: externalSwapInputs,
      isReverseSearch,
      isReverseLoading,
    });
  }

  useEffect(
    function setBaseExternalSwapOutputEff() {
      if (quote) {
        if (storedBaseExternalSwapOutput?.txnData?.data !== quote.txnData.data) {
          setBaseExternalSwapOutput(quote);
        }
      } else if (!isHookLoading) {
        if (storedBaseExternalSwapOutput) {
          setBaseExternalSwapOutput(undefined);
        }
      }
    },
    [quote, setBaseExternalSwapOutput, storedBaseExternalSwapOutput, isHookLoading]
  );

  useEffect(
    function clearStaleOutputOnTokenChange() {
      if (
        storedBaseExternalSwapOutput &&
        (storedBaseExternalSwapOutput.inTokenAddress !== fromTokenAddress ||
          storedBaseExternalSwapOutput.outTokenAddress !== swapToToken?.address)
      ) {
        setBaseExternalSwapOutput(undefined);
      }
    },
    [fromTokenAddress, swapToToken?.address, storedBaseExternalSwapOutput, setBaseExternalSwapOutput]
  );

  useEffect(
    function resetExternalSwapFallbackEff() {
      const orderStatusesValues = Object.values(orderStatuses);
      const isLastOrderExecuted =
        orderStatusesValues.length > 0 && orderStatusesValues.every((os) => os.executedTxnHash);

      if (isLastOrderExecuted && shouldFallbackToInternalSwap) {
        setShouldFallbackToInternalSwap(false);
      }
    },
    [orderStatuses, shouldFallbackToInternalSwap, setShouldFallbackToInternalSwap]
  );
}
