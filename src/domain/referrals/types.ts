import { BigNumber } from "ethers";

export type UserReferralInfo = {
  userReferralCode: string;
  userReferralCodeString: string;
  attachedOnChain: boolean;
  affiliate: string;
  tierId: BigNumber;
  totalRebate: BigNumber;
  totalRebateFactor: BigNumber;
  discountShare: BigNumber;
  discountFactor: BigNumber;
};

export enum RewardDistributionType {
  // V1 Airdrop for Affiliates
  Rebate = "1",
  // V2 Claim for Affiliates
  Claim = "1000",
  // V1 Airdrop for Traders
  Discount = "2",
}

export type RewardDistribution = {
  typeId: RewardDistributionType;
  receiver: string;
  markets: string[];
  tokens: string[];
  amounts: BigNumber[];
  amountsInUsd: BigNumber[];
  timestamp: number;
  transactionHash: string;
};

export type OwnerOnOtherChain = {
  code: string;
  codeString: string;
  owner?: string;
  isTaken: boolean;
  isTakenByCurrentUser: boolean;
};

export type ReferralCodeStats = {
  referralCode: string;
  trades: number;
  tradedReferralsCount: number;
  registeredReferralsCount: number;
  ownerOnOtherChain?: OwnerOnOtherChain;
  volume: BigNumber;
  totalRebateUsd: BigNumber;
  affiliateRebateUsd: BigNumber;
  discountUsd: BigNumber;
  v1Data: {
    volume: BigNumber;
    totalRebateUsd: BigNumber;
    affiliateRebateUsd: BigNumber;
    discountUsd: BigNumber;
  };
  v2Data: {
    volume: BigNumber;
    totalRebateUsd: BigNumber;
    affiliateRebateUsd: BigNumber;
    discountUsd: BigNumber;
  };
};

export type AffiliateTotalStats = {
  trades: number;
  tradedReferralsCount: number;
  registeredReferralsCount: number;
  volume: BigNumber;
  totalRebateUsd: BigNumber;
  affiliateRebateUsd: BigNumber;
  discountUsd: BigNumber;
  v1Data: {
    volume: BigNumber;
    totalRebateUsd: BigNumber;
    affiliateRebateUsd: BigNumber;
    discountUsd: BigNumber;
  };
  v2Data: {
    volume: BigNumber;
    totalRebateUsd: BigNumber;
    affiliateRebateUsd: BigNumber;
    discountUsd: BigNumber;
  };
};

export type TraderReferralTotalStats = {
  volume: BigNumber;
  discountUsd: BigNumber;
  v1Data: {
    volume: BigNumber;
    discountUsd: BigNumber;
  };
  v2Data: {
    volume: BigNumber;
    discountUsd: BigNumber;
  };
};

export type TierInfo = {
  id: string;
  tierId: BigNumber;
  discountShare: BigNumber;
};

export type ReferralsStatsData = {
  affiliateDistributions: RewardDistribution[];
  traderDistributions: RewardDistribution[];
  affiliateReferralCodesStats: ReferralCodeStats[];
  affiliateTotalStats: AffiliateTotalStats;
  traderReferralTotalStats: TraderReferralTotalStats;
  codes: string[];
  affiliateTierInfo: TierInfo;
};
