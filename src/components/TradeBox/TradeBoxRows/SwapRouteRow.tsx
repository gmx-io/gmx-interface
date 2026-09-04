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

import { EmbeddedActionButton } from "components/Button/EmbeddedActionButton";
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
              <EmbeddedActionButton onClick={handleRetryExternalSwap}>Retry external route</EmbeddedActionButton>
            </Trans>
          )}
        />
      ) : (
        value
      )}
    </SyntheticsInfoRow>
  );
}
