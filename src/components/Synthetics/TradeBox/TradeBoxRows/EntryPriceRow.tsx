import { t } from "@lingui/macro";

import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import {
  selectTradeboxAdvancedOptions,
  selectTradeboxMarkPrice,
  selectTradeboxNextPositionValues,
  selectTradeboxSelectedPosition,
  selectTradeboxToToken,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatUsdPrice } from "lib/numbers";

export function EntryPriceRow() {
  const selectedPosition = useSelector(selectTradeboxSelectedPosition);
  const nextPositionValues = useSelector(selectTradeboxNextPositionValues);
  const markPrice = useSelector(selectTradeboxMarkPrice);
  const toToken = useSelector(selectTradeboxToToken);

  if (!selectedPosition) {
    return null;
  }

  return (
    <SyntheticsInfoRow
      label={t`Entry Price`}
      value={
        nextPositionValues?.nextEntryPrice || selectedPosition?.entryPrice ? (
          <ValueTransition
            from={formatUsdPrice(selectedPosition?.entryPrice, {
              visualMultiplier: toToken?.visualMultiplier,
            })}
            to={formatUsdPrice(nextPositionValues?.nextEntryPrice, {
              visualMultiplier: toToken?.visualMultiplier,
            })}
          />
        ) : (
          formatUsdPrice(markPrice, {
            visualMultiplier: toToken?.visualMultiplier,
          })
        )
      }
    />
  );
}
