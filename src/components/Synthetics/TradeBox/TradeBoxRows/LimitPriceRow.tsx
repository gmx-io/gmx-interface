import { t } from "@lingui/macro";

import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";
import Tooltip from "components/Tooltip/Tooltip";
import {
  selectTradeboxFromToken,
  selectTradeboxToToken,
  selectTradeboxTradeFlags,
  selectTradeboxTradeMode,
  selectTradeboxTradeRatios,
  selectTradeboxTriggerPrice,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatTokensRatio } from "domain/synthetics/tokens";
import { formatUsdPrice } from "lib/numbers";
import { useMemo } from "react";
import { TradeMode } from "sdk/types/trade";

export function LimitPriceRow() {
  const { isLimit, isSwap, isIncrease } = useSelector(selectTradeboxTradeFlags);
  const tradeMode = useSelector(selectTradeboxTradeMode);
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

  const priceLabel = tradeMode === TradeMode.StopMarket ? t`Stop Price` : t`Limit Price`;

  return <SyntheticsInfoRow label={priceLabel} value={value} />;
}
