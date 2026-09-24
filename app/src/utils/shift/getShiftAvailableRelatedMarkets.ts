import { EMPTY_ARRAY } from '../lib/object';
import { GlvAndGmMarketsInfo, GlvOrMarketInfo } from '@/selectors/glv/types';
import { isGlvInfo } from '@/utils/glv/isGlvInfo';
import { translateAddress } from '@coral-xyz/anchor';

export function getShiftAvailableRelatedMarkets({
  glvAndMarketsInfoData,
  sortedMarketsInfoByIndexToken,
  marketTokenAddress,
}: {
  glvAndMarketsInfoData: GlvAndGmMarketsInfo | undefined;
  sortedMarketsInfoByIndexToken: GlvOrMarketInfo[];
  marketTokenAddress?: string;
}) {
  if (!glvAndMarketsInfoData) {
    return EMPTY_ARRAY;
  }

  if (!marketTokenAddress) {
    return sortedMarketsInfoByIndexToken;
  }

  const currentMarketInfo = glvAndMarketsInfoData[marketTokenAddress];

  if (!currentMarketInfo) {
    return EMPTY_ARRAY;
  }

  const longTokenAddress = currentMarketInfo.longTokenAddress;
  const shortTokenAddress = currentMarketInfo.shortTokenAddress;

  const gmToGmShiftRelatedMarkets = sortedMarketsInfoByIndexToken.filter(
    (marketInfo) => {
      if (isGlvInfo(marketInfo)) {
        return false;
      }

      const isSame = marketInfo.marketTokenAddress.equals(
        translateAddress(marketTokenAddress)
      );
      const isRelated =
        marketInfo.longTokenAddress.equals(longTokenAddress) &&
        marketInfo.shortTokenAddress.equals(shortTokenAddress);

      return !isSame && isRelated;
    }
  );

  const relatedGlvs = sortedMarketsInfoByIndexToken.filter((marketInfo) => {
    if (isGlvInfo(marketInfo)) {
      return marketInfo.markets.some((market) =>
        market.marketTokenAddress.equals(translateAddress(marketTokenAddress))
      );
    }

    return false;
  });

  return [...gmToGmShiftRelatedMarkets, ...relatedGlvs];
}
