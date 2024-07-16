export type UserReferralInfo = {
  userReferralCode: string;
  userReferralCodeString: string;
  referralCodeForTxn: string;
  attachedOnChain: boolean;
  affiliate: string;
  tierId: number;
  totalRebate: bigint;
  totalRebateFactor: bigint;
  discountShare: bigint;
  discountFactor: bigint;
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
  amounts: bigint[];
  amountsInUsd: bigint[];
  timestamp: number;
  transactionHash: string;
  id: string;
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
  /**
   * This includes available testnets
   */
  allOwnersOnOtherChains?: {
    [chainId: number]: CodeOwnershipInfo;
  };
  volume: bigint;
  totalRebateUsd: bigint;
  affiliateRebateUsd: bigint;
  discountUsd: bigint;
  v1Data: {
    volume: bigint;
    totalRebateUsd: bigint;
    affiliateRebateUsd: bigint;
    discountUsd: bigint;
  };
  v2Data: {
    volume: bigint;
    totalRebateUsd: bigint;
    affiliateRebateUsd: bigint;
    discountUsd: bigint;
  };
};

export type AffiliateTotalStats = {
  trades: number;
  tradedReferralsCount: number;
  registeredReferralsCount: number;
  volume: bigint;
  totalRebateUsd: bigint;
  affiliateRebateUsd: bigint;
  discountUsd: bigint;
  v1Data: {
    volume: bigint;
    totalRebateUsd: bigint;
    affiliateRebateUsd: bigint;
    discountUsd: bigint;
  };
  v2Data: {
    volume: bigint;
    totalRebateUsd: bigint;
    affiliateRebateUsd: bigint;
    discountUsd: bigint;
  };
};

export type TraderReferralTotalStats = {
  volume: bigint;
  discountUsd: bigint;
  v1Data: {
    volume: bigint;
    discountUsd: bigint;
  };
  v2Data: {
    volume: bigint;
    discountUsd: bigint;
  };
};

export type TierInfo = {
  id: string;
  tierId: number;
  discountShare: bigint;
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
    affiliateVolume: bigint;
    affiliateRebateUsd: bigint;
    discountUsd: bigint;
    traderVolume: bigint;
  };
  chains: {
    [chainId: number]: ReferralsStats;
  };
};
