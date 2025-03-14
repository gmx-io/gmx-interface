import { getIsFlagEnabled } from "config/ab";
import { isDevelopment } from "config/env";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccount } from "context/SubaccountContext/SubaccountContext";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import {
  selectBaseExternalSwapOutput,
  selectExternalSwapInputs,
  selectExternalSwapQuote,
  selectSetBaseExternalSwapOutput,
  selectSetShouldFallbackToInternalSwap,
  selectShouldFallbackToInternalSwap,
  selectShouldRequestExternalSwapQuote,
} from "context/SyntheticsStateContext/selectors/externalSwapSelectors";
import { selectGasPrice, selectTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxAllowedSlippage,
  selectTradeboxFromTokenAddress,
  selectTradeboxSelectSwapToToken,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useChainId } from "lib/chains";
import { throttleLog } from "lib/logging";
import { useEffect } from "react";
import { useExternalSwapOutputRequest } from "./useExternalSwapOutputRequest";
import { getContract } from "sdk/configs/contracts";

export function useExternalSwapHandler() {
  const { chainId } = useChainId();
  const { orderStatuses } = useSyntheticsEvents();
  const settings = useSettings();
  const tokensData = useSelector(selectTokensData);
  const fromTokenAddress = useSelector(selectTradeboxFromTokenAddress);
  const slippage = useSelector(selectTradeboxAllowedSlippage);
  const setBaseExternalSwapOutput = useSelector(selectSetBaseExternalSwapOutput);
  const storedBaseExternalSwapOutput = useSelector(selectBaseExternalSwapOutput);
  const gasPrice = useSelector(selectGasPrice);

  const swapToToken = useSelector(selectTradeboxSelectSwapToToken);

  const externalSwapInputs = useSelector(selectExternalSwapInputs);

  const shouldRequestExternalSwapQuote = useSelector(selectShouldRequestExternalSwapQuote);

  const externalSwapQuote = useSelector(selectExternalSwapQuote);
  const shouldFallbackToInternalSwap = useSelector(selectShouldFallbackToInternalSwap);
  const setShouldFallbackToInternalSwap = useSelector(selectSetShouldFallbackToInternalSwap);

  const subaccount = useSubaccount(null);

  const { externalSwapOutput } = useExternalSwapOutputRequest({
    chainId,
    tokensData,
    tokenInAddress: fromTokenAddress,
    tokenOutAddress: swapToToken?.address,
    amountIn: externalSwapInputs?.amountIn,
    receiverAddress: getContract(chainId, "OrderVault"),
    slippage,
    gasPrice,
    enabled: getIsFlagEnabled("testExternalSwap") && !subaccount && shouldRequestExternalSwapQuote,
  });

  if (isDevelopment() && settings.showDebugValues) {
    throttleLog("external swaps", {
      baseOutput: externalSwapOutput,
      externalSwapQuote,
      inputs: externalSwapInputs,
    });
  }

  useEffect(
    function setBaseExternalSwapOutputEff() {
      // Update quote only if actual txn data has changed
      if (storedBaseExternalSwapOutput?.txnData?.data !== externalSwapOutput?.txnData?.data) {
        setBaseExternalSwapOutput(externalSwapOutput);
      }
    },
    [externalSwapOutput, setBaseExternalSwapOutput, storedBaseExternalSwapOutput]
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
