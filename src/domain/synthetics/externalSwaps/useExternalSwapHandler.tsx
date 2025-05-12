import { useEffect } from "react";

import { isDevelopment } from "config/env";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import {
  selectGasPrice,
  selectSubaccountForAction,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectBaseExternalSwapOutput,
  selectExternalSwapInputs,
  selectExternalSwapQuote,
  selectSetBaseExternalSwapOutput,
  selectSetShouldFallbackToInternalSwap,
  selectShouldFallbackToInternalSwap,
  selectShouldRequestExternalSwapQuote,
  selectTradeboxAllowedSlippage,
  selectTradeboxFromTokenAddress,
  selectTradeboxSelectSwapToToken,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useChainId } from "lib/chains";
import { throttleLog } from "lib/logging";
import { getContract } from "sdk/configs/contracts";

import { selectTradeboxTradeFlags } from "context/SyntheticsStateContext/selectors/shared/baseSelectors";
import { useExternalSwapOutputRequest } from "./useExternalSwapOutputRequest";

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
  const { isTwap } = useSelector(selectTradeboxTradeFlags);

  const subaccount = useSelector(selectSubaccountForAction);

  const { externalSwapOutput } = useExternalSwapOutputRequest({
    chainId,
    tokensData,
    tokenInAddress: fromTokenAddress,
    tokenOutAddress: swapToToken?.address,
    amountIn: externalSwapInputs?.amountIn,
    receiverAddress: getContract(chainId, "OrderVault"),
    slippage,
    gasPrice,
    enabled: !isTwap && !subaccount && shouldRequestExternalSwapQuote,
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
