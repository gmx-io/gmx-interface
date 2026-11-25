import groupBy from "lodash/groupBy";

import { getIsMarketClosed } from "domain/synthetics/markets/utils";
import { TradeMode } from "domain/synthetics/trade";
import { EMPTY_OBJECT } from "lib/objects";

import { selectClosedMarkets } from "./globalSelectors";
import {
  selectTradeboxAvailableTokensOptions,
  selectTradeboxMarketInfo,
  selectTradeboxTradeFlags,
  selectTradeboxTradeMode,
} from "./tradeboxSelectors";
import { createSelector } from "../utils";

export type ClosedMarketOrderState = "blocked" | "limitWaits" | "stopWaits";

export const selectTradeboxIsMarketClosed = createSelector((q) => {
  if (!q(selectTradeboxTradeFlags).isPosition) {
    return false;
  }

  return getIsMarketClosed(q(selectClosedMarkets), q(selectTradeboxMarketInfo)?.marketTokenAddress);
});

export const selectTradeboxClosedMarketOrderState = createSelector((q): ClosedMarketOrderState | undefined => {
  if (!q(selectTradeboxIsMarketClosed)) {
    return undefined;
  }

  const { isMarket, isTwap, isTrigger } = q(selectTradeboxTradeFlags);

  if (isMarket || isTwap) {
    return "blocked";
  }

  if (isTrigger || q(selectTradeboxTradeMode) === TradeMode.StopMarket) {
    return "stopWaits";
  }

  return "limitWaits";
});

export const selectClosedIndexTokens = createSelector((q): Partial<Record<string, true>> => {
  const closedMarkets = q(selectClosedMarkets);

  if (!closedMarkets || Object.keys(closedMarkets).length === 0) {
    return EMPTY_OBJECT;
  }

  const marketsByIndexToken = groupBy(
    q(selectTradeboxAvailableTokensOptions).sortedAllMarkets,
    (marketInfo) => marketInfo.indexTokenAddress
  );
  const closedIndexTokens: Partial<Record<string, true>> = {};

  for (const [indexTokenAddress, markets] of Object.entries(marketsByIndexToken)) {
    if (markets.every((marketInfo) => getIsMarketClosed(closedMarkets, marketInfo.marketTokenAddress))) {
      closedIndexTokens[indexTokenAddress] = true;
    }
  }

  return closedIndexTokens;
});
