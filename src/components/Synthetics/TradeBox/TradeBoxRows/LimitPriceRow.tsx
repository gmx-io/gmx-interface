import { t } from "@lingui/macro";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import Tooltip from "components/Tooltip/Tooltip";
import {
  selectTradeboxFromToken,
  selectTradeboxToToken,
  selectTradeboxTradeFlags,
  selectTradeboxTradeRatios,
  selectTradeboxTriggerPrice,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatTokensRatio } from "domain/synthetics/tokens";
import { formatUsdPrice } from "lib/numbers";
import { useMemo } from "react";

export function LimitPriceRow() {
  const { isLimit, isSwap, isIncrease } = useSelector(selectTradeboxTradeFlags);
  const triggerPrice = useSelector(selectTradeboxTriggerPrice);
  const toToken = useSelector(selectTradeboxToToken);
  const fromToken = useSelector(selectTradeboxFromToken);
  const { triggerRatio } = useSelector(selectTradeboxTradeRatios);

  const value = useMemo(() => {
    if (isSwap) {
      return (
        <Tooltip
          position="bottom-end"
          handle={formatTokensRatio(fromToken, toToken, triggerRatio) || "-"}
          renderContent={() =>
            t`The execution price for the limit order updates in real-time on the orders tab after order creation to guarantee that you receive the minimum receive amount.`
          }
        />
      );
    }

    if (isIncrease) {
      return (
        formatUsdPrice(triggerPrice, {
          visualMultiplier: toToken?.visualMultiplier,
        }) || "-"
      );
    }

    return null;
  }, [isSwap, toToken, triggerPrice, fromToken, triggerRatio, isIncrease]);

  if (!isLimit || !value) {
    return null;
  }

  return <ExchangeInfoRow label={t`Limit Price`} value={value} />;
}
