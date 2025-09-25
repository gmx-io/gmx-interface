import { useMemo } from "react";

import { getMintableMarketTokens, GlvOrMarketInfo } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { TokenData } from "domain/synthetics/tokens";

export const useMarketMintableTokens = (marketInfo?: GlvOrMarketInfo, marketToken?: TokenData) => {
  return useMemo(() => {
    if (!marketInfo || isGlvInfo(marketInfo)) {
      return undefined;
    }

    return marketToken ? getMintableMarketTokens(marketInfo, marketToken) : undefined;
  }, [marketInfo, marketToken]);
};
