import { BigNumber } from "ethers";

export type AffiliateReward = {
  marketAddress: string;
  longTokenAmount: BigNumber;
  shortTokenAmount: BigNumber;
};

export type AffiliateRewardsData = {
  [marketAddress: string]: AffiliateReward;
};
