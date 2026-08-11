import { t } from "@lingui/macro";

import {
  selectTradeboxMarkPrice,
  selectTradeboxNextPositionValues,
  selectTradeboxExistingPositionForPreview,
  selectTradeboxToToken,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatUsdPrice } from "lib/numbers";

import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

export function EntryPriceRow() {
  const existingPosition = useSelector(selectTradeboxExistingPositionForPreview);
  const nextPositionValues = useSelector(selectTradeboxNextPositionValues);
  const markPrice = useSelector(selectTradeboxMarkPrice);
  const toToken = useSelector(selectTradeboxToToken);

  if (!existingPosition) {
    return null;
  }

  return (
    <SyntheticsInfoRow
      label={t`Entry price`}
      value={
        nextPositionValues?.nextEntryPrice || existingPosition?.entryPrice ? (
          <ValueTransition
            from={formatUsdPrice(existingPosition?.entryPrice, {
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
      valueClassName="numbers"
    />
  );
}
