export type AffiliateReward = {
  marketAddress: string;
  longTokenAmount: bigint;
  shortTokenAmount: bigint;
};

export type AffiliateRewardsData = {
  [marketAddress: string]: AffiliateReward;
};
