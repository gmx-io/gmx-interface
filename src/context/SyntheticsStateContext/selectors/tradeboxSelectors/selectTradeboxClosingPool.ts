import { t } from "@lingui/macro";

import { selectChainId, selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxMarketInfo,
  selectTradeboxTradeFlags,
  selectTradeboxTradeMode,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import { getClosingPool } from "domain/synthetics/markets/closingMarkets";
import type { ValidationResult } from "domain/synthetics/trade/utils/validation";
import { TradeMode } from "sdk/utils/trade";

export const selectTradeboxClosingPool = createSelector((q) => {
  const marketInfo = q(selectTradeboxMarketInfo);

  if (!marketInfo) {
    return undefined;
  }

  return getClosingPool(q(selectChainId), q(selectMarketsInfoData), marketInfo, Date.now());
});

export const selectTradeboxIsClosedToNewPendingOrders = createSelector((q) => {
  const { isIncrease, isLimit, isTwap } = q(selectTradeboxTradeFlags);

  return isIncrease && (isLimit || isTwap) && q(selectTradeboxClosingPool) !== undefined;
});

export const selectTradeboxClosingPoolTradeError = createSelector((q): ValidationResult | undefined => {
  if (!q(selectTradeboxIsClosedToNewPendingOrders)) {
    return undefined;
  }

  const tradeMode = q(selectTradeboxTradeMode);

  if (tradeMode === TradeMode.StopMarket) {
    return { buttonErrorMessage: t`Closed to new stop market orders` };
  }

  if (tradeMode === TradeMode.Twap) {
    return { buttonErrorMessage: t`Closed to new TWAP orders` };
  }

  return { buttonErrorMessage: t`Closed to new limit orders` };
});
