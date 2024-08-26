import { selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getSellableMarketToken, MarketInfo } from "domain/synthetics/markets";
import { getSellableInfoGlv, isGlv } from "domain/synthetics/markets/glv";
import { TokenData, TokensData } from "domain/synthetics/tokens";

export const useMarketSellableToken = (marketInfo?: MarketInfo, marketToken?: TokenData, tokensData?: TokensData) => {
  const marketsInfoData = useSelector(selectMarketsInfoData);

  if (!marketInfo) {
    return undefined;
  }

  if (isGlv(marketInfo)) {
    return getSellableInfoGlv(marketInfo, marketsInfoData, tokensData);
  }

  return marketToken ? getSellableMarketToken(marketInfo, marketToken) : undefined;
};
