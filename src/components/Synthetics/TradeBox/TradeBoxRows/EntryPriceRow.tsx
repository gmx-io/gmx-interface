import { t } from "@lingui/macro";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import {
  selectTradeboxAdvancedOptions,
  selectTradeboxMarkPrice,
  selectTradeboxNextPositionValues,
  selectTradeboxSelectedPosition,
  selectTradeboxToToken,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatUsd } from "lib/numbers";

export function EntryPriceRow() {
  const { advancedDisplay } = useSelector(selectTradeboxAdvancedOptions);
  const selectedPosition = useSelector(selectTradeboxSelectedPosition);
  const nextPositionValues = useSelector(selectTradeboxNextPositionValues);
  const markPrice = useSelector(selectTradeboxMarkPrice);

  const toToken = useSelector(selectTradeboxToToken);

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
              displayDecimals: toToken?.priceDecimals,
            })}
            to={formatUsd(nextPositionValues?.nextEntryPrice, {
              displayDecimals: toToken?.priceDecimals,
            })}
          />
        ) : (
          formatUsd(markPrice, {
            displayDecimals: toToken?.priceDecimals,
          })
        )
      }
    />
  );
}
