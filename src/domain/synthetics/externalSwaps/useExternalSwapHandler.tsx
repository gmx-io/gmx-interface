import { useEffect } from "react";

import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import { selectGasPrice } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectBaseExternalSwapOutput,
  selectBuildExternalSwapCalldataRef,
  selectExternalSwapInputs,
  selectExternalSwapQuote,
  selectSetBaseExternalSwapOutput,
  selectSetShouldFallbackToInternalSwap,
  selectShouldFallbackToInternalSwap,
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
  const buildCalldataRef = useSelector(selectBuildExternalSwapCalldataRef);
  const gasPrice = useSelector(selectGasPrice);

  const swapToToken = useSelector(selectTradeboxSelectSwapToToken);

  const externalSwapInputs = useSelector(selectExternalSwapInputs);
  const shouldDebugValues = useShowDebugValues();

  const externalSwapQuote = useSelector(selectExternalSwapQuote);
  const shouldFallbackToInternalSwap = useSelector(selectShouldFallbackToInternalSwap);
  const setShouldFallbackToInternalSwap = useSelector(selectSetShouldFallbackToInternalSwap);

  const enabled = useExternalSwapsEnabled();

  const { quote, buildExternalSwapCalldata } = useExternalSwapOutputRequest({
    chainId,
    tokenInAddress: fromTokenAddress,
    tokenOutAddress: swapToToken?.address,
    amountIn: externalSwapInputs?.amountIn,
    receiverAddress: getContract(chainId, "OrderVault"),
    slippage,
    gasPrice,
    enabled,
  });

  // Keep the build callback ref in sync
  buildCalldataRef.current = buildExternalSwapCalldata;

  if (shouldDebugValues) {
    throttleLog("external swaps", {
      baseOutput: quote,
      externalSwapQuote,
      inputs: externalSwapInputs,
    });
  }

  useEffect(
    function setBaseExternalSwapOutputEff() {
      // Update quote only if route output has changed
      if (storedBaseExternalSwapOutput?.amountOut !== quote?.amountOut) {
        setBaseExternalSwapOutput(quote);
      }
    },
    [quote, setBaseExternalSwapOutput, storedBaseExternalSwapOutput]
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
