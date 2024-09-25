import { useMemo } from "react";

import { getSellableMarketToken, GlvOrMarketInfo } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { TokenData } from "domain/synthetics/tokens";

export const useMarketSellableToken = (marketInfo?: GlvOrMarketInfo, marketToken?: TokenData) => {
  return useMemo(() => {
    if (!marketInfo || isGlvInfo(marketInfo)) {
      return undefined;
    }

    return marketToken ? getSellableMarketToken(marketInfo, marketToken) : undefined;
  }, [marketInfo, marketToken]);
};
