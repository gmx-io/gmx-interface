import { getByKey } from "lib/objects";
import { MarketsInfoData } from "../markets";
import { AffiliateRewardsData } from "./types";
import { convertToUsd } from "../tokens";

export function getTotalClaimableAffiliateRewardsUsd(
  marketsInfoData: MarketsInfoData,
  affiliateRewardsData: AffiliateRewardsData
) {
  return Object.values(affiliateRewardsData).reduce((acc, rewardItem) => {
    const marketInfo = getByKey(marketsInfoData, rewardItem.marketAddress);
    if (!marketInfo) {
      return acc;
    }
    const { longToken, shortToken } = marketInfo;

    acc = acc + convertToUsd(rewardItem.longTokenAmount, longToken.decimals, longToken.prices.minPrice)!;
    acc = acc + convertToUsd(rewardItem.shortTokenAmount, shortToken.decimals, shortToken.prices.minPrice)!;

    return acc;
  }, 0n);
}
