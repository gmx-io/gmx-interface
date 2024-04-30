import { getByKey } from "lib/objects";
import { MarketsInfoData } from "../markets";
import { AffiliateRewardsData } from "./types";
import { convertToUsd } from "../tokens";
import { BigNumber } from "ethers";

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

    acc = acc.add(convertToUsd(rewardItem.longTokenAmount, longToken.decimals, longToken.prices.minPrice)!);
    acc = acc.add(convertToUsd(rewardItem.shortTokenAmount, shortToken.decimals, shortToken.prices.minPrice)!);

    return acc;
  }, BigInt(0));
}
