import { useMemo } from "react";

import { getSellableMarketToken, MarketInfo } from "domain/synthetics/markets";
import { isGlv } from "domain/synthetics/markets/glv";
import { TokenData } from "domain/synthetics/tokens";

export const useMarketSellableToken = (marketInfo?: MarketInfo, marketToken?: TokenData) => {
  return useMemo(() => {
    if (!marketInfo || isGlv(marketInfo)) {
      return undefined;
    }

    return marketToken ? getSellableMarketToken(marketInfo, marketToken) : undefined;
  }, [marketInfo, marketToken]);
};
