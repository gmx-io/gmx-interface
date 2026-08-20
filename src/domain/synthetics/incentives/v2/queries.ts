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
      featuredMarketIndexTokens
      downgradingCoefficients { market coefficient }
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

export const ACCOUNT_INCENTIVE_STATUS_QUERY = `
  query AccountIncentiveStatus($account: String!) {
    accountIncentiveStatus(account: $account) {
      account
      multiplier
      volumeTier
      stakingTier
      projectedVolumeTier
      projectedStakingTier
      epochTimestamp
      tradingVolume
      tierVolume
      referralVolume
      currentStakedBalance
      boostIds
      esGmxRewards
      gtRewards
      rewardsUsd
      manualRewardCapUsd
      manualRewardConsumedUsd
      manualRewardRemainingUsd
    }
  }
`;

export const REWARDS_PROMO_ACTIVITY_QUERY = `
  query RewardsPromoActivity($account: String!) {
    accountNetPositionFeesLast4Months(account: $account) {
      netPositionFeeUsd
    }
    tradeActions(limit: 1, where: { account_eq: $account }, orderBy: timestamp_ASC) {
      timestamp
    }
  }
`;

export const ACCOUNT_REWARDS_HISTORY_QUERY = `
  query AccountRewardsHistory($account: String!, $limit: Int, $offset: Int) {
    accountRewardsHistory(account: $account, limit: $limit, offset: $offset) {
      totalCount
      items {
        epoch
        tradingVolume
        tierVolume
        referralVolume
        esGmxRewards
        gtRewards
        rewardsUsd
        tradingEsGmxRewards
        tradingGtRewards
        tradingRewardsUsd
        referralEsGmxRewards
        referralGtRewards
        referralRewardsUsd
        manualRewardsUsd
      }
    }
  }
`;

export const INCENTIVES_LEADERBOARD_QUERY = `
  query IncentivesLeaderboard(
    $epoch: Int
    $where: IncentivesLeaderboardWhereInput
    $orderBy: IncentivesLeaderboardOrderByInput
    $limit: Int
    $offset: Int
  ) {
    incentivesLeaderboard(
      epoch: $epoch
      where: $where
      orderBy: $orderBy
      limit: $limit
      offset: $offset
    ) {
      totalCount
      items {
        rank
        address
        tradingVolume
        referralVolume
        esGmxRewards
        gtRewards
        rewardsUsd
        multiplier
      }
    }
  }
`;

export const INCENTIVE_ACCOUNT_EPOCH_AUDIT_QUERY = `
  query IncentiveAccountEpochAudit(
    $where: IncentiveAccountEpochAuditWhereInput
    $orderBy: IncentiveAccountEpochAuditOrderByInput
    $limit: Int
    $offset: Int
  ) {
    incentiveAccountEpochAudit(
      where: $where
      orderBy: $orderBy
      limit: $limit
      offset: $offset
    ) {
      totalCount
      items {
        id
        account
        epochTimestamp
        fees
        tradingVolume
        tierVolume
        referralVolume
        esGmxRewards
        referralEsGmxRewards
        gtRewards
        referralGtRewards
        rewardsUsd
        manualRewardsUsd
        avgMultiplier
        maxMultiplier
        volumeTier
        stakingTier
        boostIds
        effectiveRewardsRatio
      }
    }
  }
`;
