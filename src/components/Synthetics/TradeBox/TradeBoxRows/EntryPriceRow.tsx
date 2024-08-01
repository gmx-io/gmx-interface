import { t } from "@lingui/macro";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { selectSelectedMarketPriceDecimals } from "context/SyntheticsStateContext/selectors/statsSelectors";
import {
  selectTradeboxAdvancedOptions,
  selectTradeboxMarkPrice,
  selectTradeboxNextPositionValues,
  selectTradeboxSelectedPosition,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatUsd } from "lib/numbers";

export function EntryPriceRow() {
  const { advancedDisplay } = useSelector(selectTradeboxAdvancedOptions);
  const selectedPosition = useSelector(selectTradeboxSelectedPosition);
  const nextPositionValues = useSelector(selectTradeboxNextPositionValues);
  const markPrice = useSelector(selectTradeboxMarkPrice);

  const marketDecimals = useSelector(selectSelectedMarketPriceDecimals);

  if (!advancedDisplay || !selectedPosition) {
    return null;
  }

  return (
    <ExchangeInfoRow
      label={t`Entry Price`}
      value={
        nextPositionValues?.nextEntryPrice || selectedPosition?.entryPrice ? (
          <ValueTransition
            from={formatUsd(selectedPosition?.entryPrice, {
              displayDecimals: marketDecimals,
            })}
            to={formatUsd(nextPositionValues?.nextEntryPrice, {
              displayDecimals: marketDecimals,
            })}
          />
        ) : (
          formatUsd(markPrice, {
            displayDecimals: marketDecimals,
          })
        )
      }
    />
  );
}
