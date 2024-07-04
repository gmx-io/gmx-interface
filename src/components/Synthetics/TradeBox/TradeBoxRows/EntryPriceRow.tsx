import { t } from "@lingui/macro";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import {
  useToToken,
  useTradeboxAdvancedOptions,
  useTradeboxMarkPrice,
  useTradeboxNextPositionValues,
  useTradeboxSelectedPosition,
} from "context/SyntheticsStateContext/hooks/tradeboxHooks";
import { formatUsd } from "lib/numbers";

export function EntryPriceRow() {
  const { advancedDisplay } = useTradeboxAdvancedOptions();
  const selectedPosition = useTradeboxSelectedPosition();
  const nextPositionValues = useTradeboxNextPositionValues();
  const markPrice = useTradeboxMarkPrice();

  const toToken = useToToken();

  if (!advancedDisplay || !selectedPosition) {
    return null;
  }

  return (
    <ExchangeInfoRow
      className="SwapBox-info-row"
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
