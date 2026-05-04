import { useMemo } from "react";

import { ARBITRUM } from "config/chains";
import { useGmxPrice } from "domain/legacy";
import { useChainId } from "lib/chains";
import { bigintToNumber } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";

import { isIncentivesEnabled, MAX_FEE_DISCOUNT_PERCENT } from "./constants";
import type { AccountIncentiveDashboard, IncentivesConfig } from "./types";
import { useAccountIncentiveDashboard } from "./useAccountIncentiveDashboard";
import { useAccountNetPositionFeesLast4Months } from "./useAccountNetPositionFeesLast4Months";
import { useAccountManualRewardsAllocation } from "./useAccountRewardsHistory";
import { useIncentivesConfig } from "./useIncentivesConfig";

const USD_DECIMALS = 30;
const GMX_DECIMALS = 18;
const GMX_DECIMALS_FACTOR = 10n ** 18n;

const FALLBACK_FIRST_STAKING_TIER_GMX = 10;
const RECENT_FEES_THRESHOLD_USD = 20;

export type PersonalizedBannerData = {
  /** Whether the user has a manual allocation derived from pre-program history entries. */
  isManuallyRewarded: boolean;
  /** Whether the user has traded volume in the second or later program epoch. */
  hasVolumeAfterFirstProgramEpoch: boolean;
  /** The manually allocated points amount (18-decimal bigint) for manually rewarded users. */
  manualAllocatedPoints: bigint | undefined;
  /** The bonus amount in USD (30-decimal bigint) for manually rewarded users. */
  manualBonusUsd: bigint | undefined;
  /** Recommended GMX amount to stake (human-readable number, e.g. 100). */
  recommendedStakeGmx: number | undefined;
  /** Estimated recent fee savings in USD (human-readable number, e.g. 12.50). */
  estimatedRewardsUsd: number | undefined;
  /** Whether we have enough data to show a personalized banner. */
  hasPersonalizedData: boolean;
  /** True while underlying data is still loading. */
  isLoading: boolean;
};

function getHasVolumeAfterFirstProgramEpoch(
  dashboard: AccountIncentiveDashboard | undefined,
  config: IncentivesConfig | undefined
): boolean {
  if (!dashboard || !config) {
    return false;
  }

  const secondEpochTimestamp = config.programStartTimestamp + config.epochDuration;

  return dashboard.recentStats.some((stat) => stat.epochTimestamp >= secondEpochTimestamp && stat.tradedVolume > 0n);
}

function getFirstStakingTierThreshold(config: IncentivesConfig | undefined): number {
  const firstTier = config?.stakingTiers?.[0];
  if (!firstTier) {
    return FALLBACK_FIRST_STAKING_TIER_GMX;
  }

  return bigintToNumber(firstTier.threshold, GMX_DECIMALS);
}

export function usePersonalizedBannerData(): PersonalizedBannerData {
  const { chainId } = useChainId();
  const { active, signer, account } = useWallet();

  const enabled = isIncentivesEnabled(chainId) && Boolean(account);

  const { data: config } = useIncentivesConfig(chainId);
  const { data: dashboard, loading: dashboardLoading } = useAccountIncentiveDashboard(chainId, {
    account,
    enabled,
  });
  const { data: netPositionFees, loading: netPositionFeesLoading } = useAccountNetPositionFeesLast4Months(chainId, {
    account,
    enabled,
  });
  const hasProgramStartTimestamp = config?.programStartTimestamp !== undefined;
  const { data: fetchedManualAllocatedPoints, loading: manualAllocatedPointsLoading } =
    useAccountManualRewardsAllocation(chainId, {
      account,
      programStartTimestamp: config?.programStartTimestamp,
      enabled: enabled && hasProgramStartTimestamp,
    });
  const manualAllocatedPoints = hasProgramStartTimestamp ? fetchedManualAllocatedPoints : 0n;

  const { gmxPrice } = useGmxPrice(chainId, { arbitrum: chainId === ARBITRUM ? signer : undefined }, active);

  return useMemo(() => {
    const isLoading =
      dashboardLoading || netPositionFeesLoading || (hasProgramStartTimestamp && manualAllocatedPointsLoading);
    const hasVolumeAfterFirstProgramEpoch = getHasVolumeAfterFirstProgramEpoch(dashboard, config);

    const noData: PersonalizedBannerData = {
      isManuallyRewarded: false,
      hasVolumeAfterFirstProgramEpoch,
      manualAllocatedPoints: undefined,
      manualBonusUsd: undefined,
      recommendedStakeGmx: undefined,
      estimatedRewardsUsd: undefined,
      hasPersonalizedData: false,
      isLoading,
    };

    if (!enabled || !dashboard || manualAllocatedPoints === undefined) {
      return noData;
    }

    const isManuallyRewarded = manualAllocatedPoints > 0n;

    if (isManuallyRewarded) {
      if (gmxPrice === undefined || gmxPrice === 0n) {
        return noData;
      }

      return {
        isManuallyRewarded: true,
        hasVolumeAfterFirstProgramEpoch,
        manualAllocatedPoints,
        manualBonusUsd: (manualAllocatedPoints * gmxPrice) / GMX_DECIMALS_FACTOR,
        recommendedStakeGmx: undefined,
        estimatedRewardsUsd: undefined,
        hasPersonalizedData: true,
        isLoading: false,
      };
    }

    if (netPositionFees === undefined) {
      return noData;
    }

    const recentFeesUsd = bigintToNumber(netPositionFees, USD_DECIMALS);

    if (recentFeesUsd < RECENT_FEES_THRESHOLD_USD) {
      return noData;
    }

    const estimatedRewardsUsd = recentFeesUsd * (MAX_FEE_DISCOUNT_PERCENT / 100);

    return {
      isManuallyRewarded: false,
      hasVolumeAfterFirstProgramEpoch,
      manualAllocatedPoints: undefined,
      manualBonusUsd: undefined,
      recommendedStakeGmx: getFirstStakingTierThreshold(config),
      estimatedRewardsUsd: Math.round(estimatedRewardsUsd * 100) / 100,
      hasPersonalizedData: true,
      isLoading: false,
    };
  }, [
    enabled,
    dashboard,
    dashboardLoading,
    netPositionFees,
    netPositionFeesLoading,
    hasProgramStartTimestamp,
    manualAllocatedPoints,
    manualAllocatedPointsLoading,
    gmxPrice,
    config,
  ]);
}
