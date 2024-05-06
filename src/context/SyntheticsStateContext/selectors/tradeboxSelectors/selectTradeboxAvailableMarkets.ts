import { selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectTradeboxToTokenAddress } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import { isMarketIndexToken } from "domain/synthetics/markets";
import { EMPTY_ARRAY } from "lib/objects";
import { values } from "lodash";

export const selectTradeboxAvailableMarkets = createSelector((q) => {
  const marketsInfoData = q(selectMarketsInfoData);
  const indexTokenAddress = q(selectTradeboxToTokenAddress);

  if (!marketsInfoData || !indexTokenAddress) {
    return EMPTY_ARRAY;
  }

  const allMarkets = values(marketsInfoData).filter((market) => !market.isSpotOnly && !market.isDisabled);

  const availableMarkets = allMarkets.filter((market) => isMarketIndexToken(market, indexTokenAddress));

  return availableMarkets;
});
