import { HIGH_SPREAD_THRESHOLD } from "config/constants";
import {
  selectTradeboxCollateralToken,
  selectTradeboxMarketInfo,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import { getSpread } from "domain/tokens";
import { getIsEquivalentTokens } from "sdk/utils/tokens";

export const selectTradeboxCollateralSpreadInfo = createSelector((q) => {
  const marketInfo = q(selectTradeboxMarketInfo);
  const collateralToken = q(selectTradeboxCollateralToken);

  const { indexToken } = marketInfo ?? {};

  if (!indexToken || !collateralToken) {
    return undefined;
  }

  let totalSpread = getSpread(indexToken.prices);

  if (getIsEquivalentTokens(collateralToken, indexToken)) {
    return {
      spread: totalSpread,
      isHigh: totalSpread > HIGH_SPREAD_THRESHOLD,
    };
  }

  totalSpread = totalSpread + getSpread(collateralToken!.prices!);

  return {
    spread: totalSpread,
    isHigh: totalSpread > HIGH_SPREAD_THRESHOLD,
  };
});
