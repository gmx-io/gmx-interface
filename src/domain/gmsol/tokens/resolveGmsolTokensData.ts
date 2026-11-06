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

// Within PRICES_CACHE_TTL a missing ticker keeps its last price. Past that the partial map is returned and
// compose drops only the markets that still lack a price.
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

  return { tokensData, pricesUpdatedAt: receivedAt, lastComplete };
}
