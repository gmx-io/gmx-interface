import {
  selectChainId,
  selectMarketsInfoData,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { marketsInfoData2IndexTokenStatsMap } from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { calculateDisplayDecimals } from "lib/numbers";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import { getTokenBySymbolSafe } from "sdk/configs/tokens";

import { createSelector, createSelectorFactory } from "../utils";
import { selectChartToken } from "./chartSelectors";
import { selectTradeboxTradeFlags } from "./tradeboxSelectors";

export const selectIndexTokenStats = createSelector((q) => {
  const marketsInfoData = q(selectMarketsInfoData);

  if (!marketsInfoData) {
    return EMPTY_ARRAY;
  }

  const stats = q(selectIndexTokenStatsMap);

  return stats.sortedByTotalPoolValue.map((address) => stats.indexMap[address]!);
});

const FALLBACK: ReturnType<typeof marketsInfoData2IndexTokenStatsMap> = {
  indexMap: {},
  sortedByTotalPoolValue: [],
};

export const selectIndexTokenStatsMap = createSelector((q) => {
  const marketsInfoData = q(selectMarketsInfoData);

  if (!marketsInfoData) {
    return FALLBACK;
  }

  return marketsInfoData2IndexTokenStatsMap(marketsInfoData);
});

export const selectSelectedMarketPriceDecimals = createSelector((q) => {
  const { chartToken } = q(selectChartToken);

  if (!chartToken) {
    return 2;
  }

  return calculateDisplayDecimals(chartToken.prices.minPrice);
});

export const makeSelectMarketPriceDecimals = createSelectorFactory((tokenAddress?: string) =>
  createSelector(function selectSelectedMarketPriceDecimals(q) {
    const tokensData = q(selectTokensData);
    const token = getByKey(tokensData, tokenAddress);
    const { isSwap } = q(selectTradeboxTradeFlags);

    if (!token) {
      return;
    }

    const visualMultiplier = isSwap ? 1 : token.visualMultiplier;

    return calculateDisplayDecimals(token.prices.minPrice, undefined, visualMultiplier);
  })
);

/**
 * Returns 1 if swap or no visual multiplier
 */
export const selectSelectedMarketVisualMultiplier = createSelector((q) => {
  const { symbol } = q(selectChartToken);

  if (!symbol) {
    return 1;
  }

  const chainId = q(selectChainId);
  const token = getTokenBySymbolSafe(chainId, symbol);

  if (!token) {
    return 1;
  }

  const { isSwap } = q(selectTradeboxTradeFlags);

  if (!token.visualMultiplier || isSwap) {
    return 1;
  }

  return token.visualMultiplier;
});
