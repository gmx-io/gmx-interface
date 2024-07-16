import { filter, flatMap, pickBy, uniqBy, values } from "lodash";
import { selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectTradeboxMarketInfo } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";

export const selectTradeboxAvailableAndDisabledTokensForCollateral = createSelector((q) => {
  const marketsInfo = q(selectMarketsInfoData);

  if (!marketsInfo) {
    return {
      availableTokens: [],
      disabledTokens: [],
    };
  }

  const currentMarket = q(selectTradeboxMarketInfo);

  if (!currentMarket) {
    return {
      availableTokens: [],
      disabledTokens: [],
    };
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
