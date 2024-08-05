import { EMPTY_ARRAY } from "lib/objects";
import type { MarketInfo, MarketsInfoData } from "domain/synthetics/markets/types";

export function getShiftAvailableRelatedMarkets({
  marketsInfoData,
  sortedMarketsInfoByIndexToken,
  marketTokenAddress,
}: {
  marketsInfoData: MarketsInfoData | undefined;
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

  return sortedMarketsInfoByIndexToken.filter((marketInfo) => {
    const isSame = marketInfo.marketTokenAddress === marketTokenAddress;
    const isRelated =
      marketInfo.longTokenAddress === longTokenAddress && marketInfo.shortTokenAddress === shortTokenAddress;

    return !isSame && isRelated;
  });
}
