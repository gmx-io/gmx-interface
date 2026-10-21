export const INCENTIVES_CONFIG_QUERY = `
  query CurrentIncentivesConfig {
    currentIncentivesConfig {
      epochTimestamp
      epochStartTimestamp
      programStartTimestamp
      epochDuration
      maxMultiplier
      multiplierDecimals
      volumeTierPersistenceEpochs
      feeShareFactor
      esGmxShareFactor
      gtShareFactor
      referralRewardShareFactor
      volumeTiers { tier threshold multiplier }
      stakingTiers { tier threshold multiplier }
      boosts { boost multiplier }
      featuredMarketTokens
      downgradingFactors { market factor }
      balancingTradesThreshold
      lifetimeVolumeThreshold
      manualAllocationTiers { minVolume maxVolume rewardCapUsd }
    }
  }
`;

export const LATEST_GT_PRICE_QUERY = `
  query LatestGtPrice {
    gtPrices(limit: 1, orderBy: timestamp_DESC) {
      priceUsd
      timestamp
    }
  }
`;

export const RETURN_BONUS_QUERY = `
  query ReturnBonus($account: String!) {
    accountIncentiveStatus(account: $account) {
      boostIds
      manualRewardCapUsd
      manualRewardConsumedUsd
      manualRewardRemainingUsd
    }
  }
`;

export const RETURN_BONUS_HISTORY_QUERY = `
  query ReturnBonusHistory($account: String!, $programStartTimestamp: Int!) {
    incentiveManualAllocations(
      where: { account_eq: $account, programStartTimestamp_eq: $programStartTimestamp }
      limit: 1
    ) {
      lifetimeVolume
    }
    tradeActions(limit: 1, where: { account_eq: $account }) {
      timestamp
    }
  }
`;

export const INCENTIVES_EPOCH_REWARDS_QUERY = `
  query IncentivesEpochRewards($epoch: Int!, $after: String!, $limit: Int!) {
    incentiveRewards(
      where: { epochTimestamp_eq: $epoch, id_gt: $after, rewardsUsd_gt: "0" }
      orderBy: id_ASC
      limit: $limit
    ) {
      id
      account
      rewardsUsd
    }
  }
`;

export const GT_MINTING_STATS_QUERY = `
  query GtMintingStats {
    gtPriceSyncById(id: "solana-mainnet") {
      totalMinted
      remainingToNextStep
    }
  }
`;
