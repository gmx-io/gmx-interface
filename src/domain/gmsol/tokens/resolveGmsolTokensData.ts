import { PRICES_CACHE_TTL } from "lib/timeConstants";
import type { RawMarketsInfoData } from "sdk/utils/markets/types";
import type { TokensData } from "sdk/utils/tokens/types";

import { hasGmsolListedMarketPrices } from "../markets/composeGmsolMarkets";

export type GmsolTokensSnapshot = { tokensData: TokensData; receivedAt: number };

type ResolvedGmsolTokensData = {
  tokensData: TokensData | undefined;
  pricesUpdatedAt: number | undefined;
  lastComplete: GmsolTokensSnapshot | undefined;
};

// A keeper poll that misses one ticker would drop a listed market and its positions. Within PRICES_CACHE_TTL of
// the last complete poll the missing tokens keep their last price; past it the data is incomplete (undefined).
export function resolveGmsolTokensData({
  tokensData,
  receivedAt,
  rawMarketsInfoData,
  lastComplete,
}: {
  tokensData: TokensData;
  receivedAt: number;
  rawMarketsInfoData: RawMarketsInfoData | undefined;
  lastComplete: GmsolTokensSnapshot | undefined;
}): ResolvedGmsolTokensData {
  if (!rawMarketsInfoData) {
    return { tokensData, pricesUpdatedAt: receivedAt, lastComplete };
  }

  if (hasGmsolListedMarketPrices(rawMarketsInfoData, tokensData)) {
    return { tokensData, pricesUpdatedAt: receivedAt, lastComplete: { tokensData, receivedAt } };
  }

  if (lastComplete && receivedAt - lastComplete.receivedAt < PRICES_CACHE_TTL) {
    const filled = { ...lastComplete.tokensData, ...tokensData };

    if (hasGmsolListedMarketPrices(rawMarketsInfoData, filled)) {
      // The reused prices are the oldest in the set.
      return { tokensData: filled, pricesUpdatedAt: lastComplete.receivedAt, lastComplete };
    }
  }

  return { tokensData: undefined, pricesUpdatedAt: undefined, lastComplete };
}
