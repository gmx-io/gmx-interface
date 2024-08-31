import { getMintableMarketTokens, MarketInfo } from "domain/synthetics/markets";
import { getMintableInfoGlv, isGlv } from "domain/synthetics/markets/glv";
import { TokenData, TokensData } from "domain/synthetics/tokens";

export const useMarketMintableTokens = (
  marketInfo?: MarketInfo,
  marketToken?: TokenData,
  marketTokensData?: TokensData
) => {
  if (!marketInfo) {
    return undefined;
  }
  if (isGlv(marketInfo)) {
    return getMintableInfoGlv(marketInfo, marketTokensData);
  }

  return marketToken ? getMintableMarketTokens(marketInfo, marketToken) : undefined;
};
