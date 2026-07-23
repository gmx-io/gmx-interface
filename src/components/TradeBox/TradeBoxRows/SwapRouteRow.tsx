import { t, Trans } from "@lingui/macro";

import {
  selectTradeboxIsStakeOrUnstake,
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
  const isStakeOrUnstake = useSelector(selectTradeboxIsStakeOrUnstake);

  const { isSwap, isMarket } = tradeFlags;

  if (!isSwap || isWrapOrUnwrap || isStakeOrUnstake || !swapAmounts) {
    return null;
  }

  const swapStrategy = swapAmounts.swapStrategy;

  if (swapStrategy.type === "noSwap") {
    return null;
  }

  let value: string;
  if (swapStrategy.type === "externalSwap") {
    value = t`${getExternalSwapAggregatorLabel(swapStrategy.externalSwapQuote.aggregator)} (external)`;
  } else if (swapStrategy.type === "combinedSwap") {
    value = t`GMX pools + ${getExternalSwapAggregatorLabel(swapStrategy.externalSwapQuote.aggregator)}`;
  } else {
    value = t`GMX pools`;
  }

  return (
    <SyntheticsInfoRow label={t`Swap route`}>
      {swapStrategy.type === "internalSwap" && !isMarket ? (
        <Tooltip
          position="bottom-end"
          handle={value}
          renderContent={() => <Trans>External routes are only used for market swaps.</Trans>}
        />
      ) : (
        value
      )}
    </SyntheticsInfoRow>
  );
}
