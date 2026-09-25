import { t } from "@lingui/macro";

import {
  selectTradeboxMarkPrice,
  selectTradeboxNextPositionValues,
  selectTradeboxExistingPositionForPreview,
  selectTradeboxToToken,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatUsdPriceParts } from "lib/numbers";

import { UsdPriceValue } from "components/NumericValue/UsdPriceValue";
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
            from={formatUsdPriceParts(existingPosition?.entryPrice, {
              visualMultiplier: toToken?.visualMultiplier,
            })}
            to={formatUsdPriceParts(nextPositionValues?.nextEntryPrice, {
              visualMultiplier: toToken?.visualMultiplier,
            })}
          />
        ) : (
          <UsdPriceValue price={markPrice} visualMultiplier={toToken?.visualMultiplier} />
        )
      }
      valueClassName="numbers"
    />
  );
}
