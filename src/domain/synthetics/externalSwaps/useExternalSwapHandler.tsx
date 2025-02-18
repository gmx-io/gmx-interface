import { isDevelopment } from "config/env";
import { AUTO_SWAP_FALLBACK_MAX_FEES_BPS, DISABLE_EXTERNAL_SWAP_AGGREGATOR_FAILS_COUNT } from "config/externalSwaps";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccount } from "context/SubaccountContext/SubaccountContext";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import {
  selectExternalSwapFails,
  selectExternalSwapInputs,
  selectExternalSwapQuote,
  selectSetBaseExternalSwapOutput,
  selectSetExternalSwapFails,
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
import { formatUsd } from "lib/numbers";
import { useEffect } from "react";
import { useExternalSwapOutputRequest } from "./useExternalSwapOutputRequest";

export function useExternalSwapHandler() {
  const { chainId } = useChainId();
  const { orderStatuses } = useSyntheticsEvents();
  const settings = useSettings();
  const tokensData = useSelector(selectTokensData);
  const fromTokenAddress = useSelector(selectTradeboxFromTokenAddress);
  const slippage = useSelector(selectTradeboxAllowedSlippage);
  const setBaseExternalSwapOutput = useSelector(selectSetBaseExternalSwapOutput);
  const gasPrice = useSelector(selectGasPrice);

  const externalSwapFails = useSelector(selectExternalSwapFails);
  const setExternalSwapFails = useSelector(selectSetExternalSwapFails);

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
    slippage,
    gasPrice,
    enabled: !subaccount && shouldRequestExternalSwapQuote,
  });

  if (isDevelopment() && settings.showDebugValues) {
    throttleLog("external swaps", {
      baseOutput: externalSwapOutput
        ? {
            amountIn: externalSwapOutput.amountIn,
            amountOut: externalSwapOutput.amountOut,
          }
        : undefined,
      externalSwapQuote,
      inputs: externalSwapInputs
        ? {
            ...externalSwapInputs,
            usdIn: formatUsd(externalSwapInputs.usdIn),
            usdOut: formatUsd(externalSwapInputs.usdOut),
          }
        : undefined,
    });
  }

  useEffect(
    function setBaseExternalSwapOutputEff() {
      setBaseExternalSwapOutput(externalSwapOutput);
    },
    [externalSwapOutput, setBaseExternalSwapOutput]
  );

  useEffect(() => {
    if (externalSwapFails > 0 && !shouldFallbackToInternalSwap) {
      if (
        externalSwapInputs?.internalSwapTotalFeesDeltaUsd !== undefined &&
        externalSwapQuote &&
        externalSwapInputs.internalSwapTotalFeesDeltaUsd - -externalSwapQuote.feesUsd > AUTO_SWAP_FALLBACK_MAX_FEES_BPS
      ) {
        setShouldFallbackToInternalSwap(true);
      }
    }
  }, [
    externalSwapQuote,
    externalSwapFails,
    setExternalSwapFails,
    settings,
    shouldFallbackToInternalSwap,
    externalSwapInputs,
    setShouldFallbackToInternalSwap,
  ]);

  useEffect(
    function disableExternalSwapByFails() {
      if (externalSwapFails >= DISABLE_EXTERNAL_SWAP_AGGREGATOR_FAILS_COUNT && settings.externalSwapsEnabled) {
        setExternalSwapFails(0);
        setShouldFallbackToInternalSwap(false);
        settings.setExternalSwapsEnabled(false);
      }
    },
    [
      externalSwapFails,
      settings.externalSwapsEnabled,
      shouldFallbackToInternalSwap,
      setExternalSwapFails,
      setShouldFallbackToInternalSwap,
      settings,
    ]
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
