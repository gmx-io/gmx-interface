import { isShiftIntoDisabledMarket } from "config/static/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import type { GlvAndGmMarketsInfoData, GlvOrMarketInfo } from "domain/synthetics/markets/types";
import { EMPTY_ARRAY } from "lib/objects";

export function getShiftAvailableRelatedMarkets({
  chainId,
  marketsInfoData,
  sortedMarketsInfoByIndexToken,
  marketTokenAddress,
}: {
  chainId: number;
  marketsInfoData: GlvAndGmMarketsInfoData | undefined;
  sortedMarketsInfoByIndexToken: GlvOrMarketInfo[];
  marketTokenAddress?: string;
}) {
  if (!marketsInfoData) {
    return EMPTY_ARRAY;
  }

  if (!marketTokenAddress) {
    return sortedMarketsInfoByIndexToken.filter(
      (marketInfo) => isGlvInfo(marketInfo) || !isShiftIntoDisabledMarket(chainId, marketInfo.marketTokenAddress)
    );
  }

  const currentMarketInfo = marketsInfoData[marketTokenAddress];

  if (!currentMarketInfo) {
    return EMPTY_ARRAY;
  }

  const longTokenAddress = currentMarketInfo.longTokenAddress;
  const shortTokenAddress = currentMarketInfo.shortTokenAddress;

  const gmToGmShiftRelatedMarkets = sortedMarketsInfoByIndexToken.filter((marketInfo) => {
    if (isGlvInfo(marketInfo)) {
      return false;
    }

    const isSame = marketInfo.marketTokenAddress === marketTokenAddress;
    const isRelated =
      marketInfo.longTokenAddress === longTokenAddress && marketInfo.shortTokenAddress === shortTokenAddress;
    const isShiftIntoDisabled = isShiftIntoDisabledMarket(chainId, marketInfo.marketTokenAddress);

    return !isSame && isRelated && !isShiftIntoDisabled;
  });

  const relatedGlvs = sortedMarketsInfoByIndexToken.filter((marketInfo) => {
    if (isGlvInfo(marketInfo)) {
      return marketInfo.markets.some((market) => market.address === marketTokenAddress);
    }

    return false;
  });

  return [...gmToGmShiftRelatedMarkets, ...relatedGlvs];
}
