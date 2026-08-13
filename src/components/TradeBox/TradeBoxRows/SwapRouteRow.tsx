import { t, Trans } from "@lingui/macro";
import { useCallback } from "react";

import {
  selectExternalSwapBlockReason,
  selectSetShouldFallbackToInternalSwap,
  selectTradeboxIsWrapOrUnwrap,
  selectTradeboxSwapAmounts,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getExternalSwapAggregatorLabel } from "domain/synthetics/externalSwaps/utils";

import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import Tooltip from "components/Tooltip/Tooltip";

export function SwapRouteRow() {
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const swapAmounts = useSelector(selectTradeboxSwapAmounts);
  const isWrapOrUnwrap = useSelector(selectTradeboxIsWrapOrUnwrap);
  const externalSwapBlockReason = useSelector(selectExternalSwapBlockReason);
  const setShouldFallbackToInternalSwap = useSelector(selectSetShouldFallbackToInternalSwap);

  const handleRetryExternalSwap = useCallback(() => {
    setShouldFallbackToInternalSwap(false);
  }, [setShouldFallbackToInternalSwap]);

  const { isSwap, isMarket } = tradeFlags;

  if (!isSwap || isWrapOrUnwrap || !swapAmounts) {
    return null;
  }

  const swapStrategy = swapAmounts.swapStrategy;

  if (swapStrategy.type === "noSwap") {
    return null;
  }

  let value: string;
  if (swapStrategy.type === "externalSwap") {
    value = t`${getExternalSwapAggregatorLabel(swapStrategy.externalSwapQuote.aggregator)} (external)`;
  } else {
    value = t`GMX pools`;
  }

  const isExternalRoutePausedByFailure =
    swapStrategy.type === "internalSwap" && isMarket && externalSwapBlockReason === "temporarilyDisabledByFailure";

  return (
    <SyntheticsInfoRow label={t`Swap route`}>
      {swapStrategy.type === "internalSwap" && !isMarket ? (
        <Tooltip
          position="bottom-end"
          handle={value}
          renderContent={() => <Trans>External routes are only used for market swaps.</Trans>}
        />
      ) : isExternalRoutePausedByFailure ? (
        <Tooltip
          position="bottom-end"
          handle={value}
          renderContent={() => (
            <Trans>
              External routing is temporarily paused after a failed attempt.
              <br />
              <br />
              <button
                type="button"
                className="bg-transparent relative z-[1] inline-flex cursor-pointer touch-manipulation select-none border-0 p-0 text-left text-13 text-gray-400 underline decoration-gray-400 decoration-1 underline-offset-2 hover:text-typography-primary hover:decoration-typography-primary focus-visible:rounded-2 focus-visible:text-typography-primary focus-visible:decoration-typography-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
                onClick={handleRetryExternalSwap}
              >
                Retry external route
              </button>
            </Trans>
          )}
        />
      ) : (
        value
      )}
    </SyntheticsInfoRow>
  );
}
