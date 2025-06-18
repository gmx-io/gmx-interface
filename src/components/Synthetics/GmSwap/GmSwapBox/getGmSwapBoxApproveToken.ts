import { isGlvInfo } from "domain/synthetics/markets/glv";
import { GlvOrMarketInfo } from "domain/synthetics/markets/types";
import { TokensData, getTokenData } from "domain/synthetics/tokens";
import { getByKey } from "lib/objects";

export const getGmSwapBoxApproveTokenSymbol = (
  address: string,
  tokensData: TokensData | undefined,
  glvOrMarketInfoData: { [key: string]: GlvOrMarketInfo } | undefined
) => {
  const token = getTokenData(tokensData, address)!;
  const marketTokenData = getByKey(glvOrMarketInfoData, address);

  if (marketTokenData) {
    return isGlvInfo(marketTokenData) ? "GLV" : "GM: " + marketTokenData.name;
  }

  return token.assetSymbol ?? token.symbol;
};
