import { getMintableMarketTokens, MarketInfo } from "domain/synthetics/markets";
import { getMintableInfoGlv, isGlv } from "domain/synthetics/markets/glv";
import { TokenData } from "domain/synthetics/tokens";

export const useMarketMintableTokens = (marketInfo?: MarketInfo, marketToken?: TokenData) => {
  if (!marketInfo) {
    return undefined;
  }
  if (isGlv(marketInfo)) {
    return getMintableInfoGlv(marketInfo);
  }

  return marketToken ? getMintableMarketTokens(marketInfo, marketToken) : undefined;
};
