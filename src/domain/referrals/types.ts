import { BigNumber } from "ethers";

export type UserReferralInfo = {
  userReferralCode: string;
  userReferralCodeString: string;
  referralCodeForTxn: string;
  attachedOnChain: boolean;
  affiliate: string;
  tierId: BigNumber;
  totalRebate: BigNumber;
  totalRebateFactor: BigNumber;
  discountShare: BigNumber;
  discountFactor: BigNumber;
};

export enum RebateDistributionType {
  // V1 Airdrop for Affiliates
  Rebate = "1",
  // V2 Claim for Affiliates
  Claim = "1000",
  // V1 Airdrop for Traders
  Discount = "2",
}

export type RebateDistribution = {
  typeId: RebateDistributionType;
  receiver: string;
  markets: string[];
  tokens: string[];
  amounts: BigNumber[];
  amountsInUsd: BigNumber[];
  timestamp: number;
  transactionHash: string;
};

export type CodeOwnershipInfo = {
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
  ownerOnOtherChain?: CodeOwnershipInfo;
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

export type ReferralsStats = {
  chainId: number;
  affiliateDistributions: RebateDistribution[];
  traderDistributions: RebateDistribution[];
  affiliateReferralCodesStats: ReferralCodeStats[];
  affiliateTotalStats: AffiliateTotalStats;
  traderReferralTotalStats: TraderReferralTotalStats;
  codes: string[];
  affiliateTierInfo: TierInfo;
};

export type TotalReferralsStats = {
  total: {
    registeredReferralsCount: number;
    affiliateVolume: BigNumber;
    affiliateRebateUsd: BigNumber;
    discountUsd: BigNumber;
    traderVolume: BigNumber;
  };
  chains: {
    [chainId: number]: ReferralsStats;
  };
};
