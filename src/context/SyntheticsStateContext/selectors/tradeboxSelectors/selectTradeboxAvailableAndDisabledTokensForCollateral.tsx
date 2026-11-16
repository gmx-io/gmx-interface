import filter from "lodash/filter";
import flatMap from "lodash/flatMap";
import pickBy from "lodash/pickBy";
import uniqBy from "lodash/uniqBy";
import values from "lodash/values";

import { selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectTradeboxMarketInfo } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import { EMPTY_ARRAY } from "lib/objects";

const EMPTY_AVAILABLE_AND_DISABLED_TOKENS = {
  availableTokens: EMPTY_ARRAY,
  disabledTokens: EMPTY_ARRAY,
};

export const selectTradeboxAvailableAndDisabledTokensForCollateral = createSelector((q) => {
  const marketsInfo = q(selectMarketsInfoData);

  if (!marketsInfo) {
    return EMPTY_AVAILABLE_AND_DISABLED_TOKENS;
  }

  const currentMarket = q(selectTradeboxMarketInfo);

  if (!currentMarket) {
    return EMPTY_AVAILABLE_AND_DISABLED_TOKENS;
  }

  const availableTokens = currentMarket.isSameCollaterals
    ? [currentMarket.longToken]
    : [currentMarket.longToken, currentMarket.shortToken];

  const disabledTokens = filter(
    uniqBy(
      flatMap(
        values(pickBy(marketsInfo, (market) => market.indexTokenAddress === currentMarket.indexTokenAddress)),
        (market) => [market.longToken, market.shortToken]
      ),
      (token) => token.address
    ),
    (token) => token.address !== currentMarket.longToken.address && token.address !== currentMarket.shortToken.address
  ).sort((a, b) => {
    if (a.isStable && !b.isStable) {
      return -1;
    }

    if (!a.isStable && b.isStable) {
      return 1;
    }

    return 0;
  });

  return {
    availableTokens: availableTokens,
    disabledTokens: disabledTokens,
  };
});
