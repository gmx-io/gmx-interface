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
import StandardTooltip from "components/Tooltip/StandardTooltip";
import { TooltipAction, TooltipContent, TooltipText } from "components/Tooltip/TooltipBlocks";

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
        <StandardTooltip
          position="bottom-end"
          handle={value}
          renderContent={() => t`External routes are only used for Market Swaps`}
        />
      ) : isExternalRoutePausedByFailure ? (
        <StandardTooltip
          position="bottom-end"
          handle={value}
          renderContent={() => (
            <TooltipContent>
              <TooltipText>
                <Trans>External routing is temporarily paused after a failed attempt.</Trans>
              </TooltipText>
              <TooltipAction onClick={handleRetryExternalSwap}>
                <Trans>Retry external route</Trans>
              </TooltipAction>
            </TooltipContent>
          )}
        />
      ) : (
        value
      )}
    </SyntheticsInfoRow>
  );
}
