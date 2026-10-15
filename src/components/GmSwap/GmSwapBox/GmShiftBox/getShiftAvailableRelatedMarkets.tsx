import { isShiftIntoDisabledMarket } from "config/static/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import type { GlvAndGmMarketsInfoData, GlvOrMarketInfo, MarketInfo } from "domain/synthetics/markets/types";
import type { AccountWhitelistsResult } from "domain/synthetics/whitelists/useAccountWhitelistsRequest";
import { getDirectDepositAccess, getIsDirectDepositBlocked } from "domain/synthetics/whitelists/utils";
import { EMPTY_ARRAY } from "lib/objects";

export function getShiftAvailableRelatedMarkets({
  chainId,
  marketsInfoData,
  sortedMarketsInfoByIndexToken,
  marketTokenAddress,
  whitelistsResult,
}: {
  chainId: number;
  marketsInfoData: GlvAndGmMarketsInfoData | undefined;
  sortedMarketsInfoByIndexToken: GlvOrMarketInfo[];
  marketTokenAddress?: string;
  whitelistsResult: AccountWhitelistsResult;
}) {
  if (!marketsInfoData) {
    return EMPTY_ARRAY;
  }

  const getIsShiftIntoAvailable = (marketInfo: MarketInfo) => {
    if (isShiftIntoDisabledMarket(chainId, marketInfo.marketTokenAddress)) {
      return false;
    }

    const directDepositAccess = getDirectDepositAccess({ chainId, glvOrMarket: marketInfo, whitelistsResult });

    return !getIsDirectDepositBlocked(directDepositAccess);
  };

  if (!marketTokenAddress) {
    return sortedMarketsInfoByIndexToken.filter(
      (marketInfo) => isGlvInfo(marketInfo) || getIsShiftIntoAvailable(marketInfo)
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
    const isShiftIntoAvailable = getIsShiftIntoAvailable(marketInfo);

    return !isSame && isRelated && isShiftIntoAvailable;
  });

  const relatedGlvs = sortedMarketsInfoByIndexToken.filter((marketInfo) => {
    if (isGlvInfo(marketInfo)) {
      return marketInfo.markets.some((market) => market.address === marketTokenAddress);
    }

    return false;
  });

  return [...gmToGmShiftRelatedMarkets, ...relatedGlvs];
}
