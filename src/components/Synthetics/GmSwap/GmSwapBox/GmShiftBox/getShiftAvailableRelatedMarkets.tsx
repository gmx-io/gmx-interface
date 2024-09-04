import { isGlv } from "domain/synthetics/markets/glv";
import type { GlvAndGmMarketsInfoData, MarketInfo } from "domain/synthetics/markets/types";

import { EMPTY_ARRAY } from "lib/objects";

export function getShiftAvailableRelatedMarkets({
  marketsInfoData,
  sortedMarketsInfoByIndexToken,
  marketTokenAddress,
}: {
  marketsInfoData: GlvAndGmMarketsInfoData | undefined;
  sortedMarketsInfoByIndexToken: MarketInfo[];
  marketTokenAddress?: string;
}) {
  if (!marketsInfoData) {
    return EMPTY_ARRAY;
  }

  if (!marketTokenAddress) {
    return sortedMarketsInfoByIndexToken;
  }

  const currentMarketInfo = marketsInfoData[marketTokenAddress];

  if (!currentMarketInfo) {
    return EMPTY_ARRAY;
  }

  const longTokenAddress = currentMarketInfo.longTokenAddress;
  const shortTokenAddress = currentMarketInfo.shortTokenAddress;

  const gmToGmShiftRelatedMarkets = sortedMarketsInfoByIndexToken.filter((marketInfo) => {
    if (isGlv(marketInfo)) {
      return false;
    }

    const isSame = marketInfo.marketTokenAddress === marketTokenAddress;
    const isRelated =
      marketInfo.longTokenAddress === longTokenAddress && marketInfo.shortTokenAddress === shortTokenAddress;

    return !isSame && isRelated;
  });

  const relatedGlvs = sortedMarketsInfoByIndexToken.filter((marketInfo) => {
    if (isGlv(marketInfo)) {
      return marketInfo.markets.some((market) => market.address === marketTokenAddress);
    }

    return false;
  });

  return [...gmToGmShiftRelatedMarkets, ...relatedGlvs];
}
