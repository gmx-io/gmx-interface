import { isAddressEqual, type Address } from "viem";

import type { ContractsChainId } from "config/chains";
import {
  getStakingRewardsPromoSelection,
  useStableRewardsPromoSelection,
} from "domain/synthetics/incentives/v2/rewardsPromo";
import type { AccountIncentiveStatus, IncentivesConfig, LeaderboardEntry } from "domain/synthetics/incentives/v2/types";
import { useRewardsPromoActivity } from "domain/synthetics/incentives/v2/useRewardsPromoActivity";
import { formatMultiplier } from "domain/synthetics/incentives/v2/utils";
import { useRewardsVestingData } from "domain/vesting/useRewardsVestingData";
import { useIsWalletInitializing } from "lib/wallets/useIsWalletInitializing";
import useWallet from "lib/wallets/useWallet";

import { RewardsPromotionalBanners } from "./RewardsPromotionalBanners";
import { RewardsTierCards } from "./RewardsTierCards";
import { RewardsTiersFaq } from "./RewardsTiersFaq";
import type { AccountDataState } from "./rewardsTiersShared";
import { RewardsTiersSummary } from "./RewardsTiersSummary";
import { RewardsTierTables } from "./RewardsTierTables";

function getTierMultiplier(tiers: { tier: string; multiplier: bigint }[], tier: string | null) {
  return tiers.find((item) => item.tier === tier)?.multiplier ?? 0n;
}

function getPersistentBoostMultiplier(config: IncentivesConfig, status: AccountIncentiveStatus) {
  return status.boostIds.reduce((total, boostId) => {
    const isTransient = boostId === "FeaturedMarkets" || boostId === "BalancingTrades";
    const isExhaustedManualAllocation = boostId === "ManualAllocation" && status.manualRewardRemainingUsd <= 0n;

    if (isTransient || isExhaustedManualAllocation) {
      return total;
    }

    return total + (config.boosts.find((item) => item.boost === boostId)?.multiplier ?? 0n);
  }, 0n);
}

function getProjectedMultiplier(config: IncentivesConfig, status?: AccountIncentiveStatus) {
  if (!status) {
    return undefined;
  }

  const currentVolumeMultiplier = getTierMultiplier(config.volumeTiers, status.volumeTier);
  const projectedVolumeMultiplier = getTierMultiplier(config.volumeTiers, status.projectedVolumeTier);
  const currentStakingMultiplier = getTierMultiplier(config.stakingTiers, status.stakingTier);
  const projectedStakingMultiplier = getTierMultiplier(config.stakingTiers, status.projectedStakingTier);
  const persistentBoostMultiplier = getPersistentBoostMultiplier(config, status);
  const currentComponentMultiplier = currentVolumeMultiplier + currentStakingMultiplier + persistentBoostMultiplier;
  const projectedComponentMultiplier =
    projectedVolumeMultiplier + projectedStakingMultiplier + persistentBoostMultiplier;
  const cappedCurrentComponentMultiplier =
    currentComponentMultiplier > config.maxMultiplier ? config.maxMultiplier : currentComponentMultiplier;
  const projectedMultiplier =
    cappedCurrentComponentMultiplier === status.multiplier
      ? projectedComponentMultiplier
      : status.multiplier + projectedComponentMultiplier - currentComponentMultiplier;
  const cappedProjectedMultiplier =
    projectedMultiplier > config.maxMultiplier
      ? config.maxMultiplier
      : projectedMultiplier < 0n
        ? 0n
        : projectedMultiplier;

  return formatMultiplier(cappedProjectedMultiplier, config.multiplierDecimals) ===
    formatMultiplier(status.multiplier, config.multiplierDecimals)
    ? undefined
    : cappedProjectedMultiplier;
}

export function RewardsTiersTab({
  chainId,
  config,
  account,
  status,
  allTimeSummary,
  statusLoading,
  summaryLoading,
  statusUnavailable,
  summaryUnavailable,
}: {
  chainId: ContractsChainId;
  config: IncentivesConfig;
  account?: string;
  status?: AccountIncentiveStatus;
  allTimeSummary?: LeaderboardEntry;
  statusLoading: boolean;
  summaryLoading: boolean;
  statusUnavailable: boolean;
  summaryUnavailable: boolean;
}) {
  const { status: walletStatus } = useWallet();
  const isWalletInitializing = useIsWalletInitializing();
  const {
    data: vestingData,
    isLoading: vestingLoading,
    vestableEsGmx,
    vestableEsGmxUsd,
  } = useRewardsVestingData(account, chainId);
  const currentStatus =
    status &&
    account &&
    isAddressEqual(status.account as Address, account as Address) &&
    status.epochTimestamp === config.epochTimestamp
      ? status
      : undefined;
  const hasActiveStakingTier = Boolean(currentStatus?.stakingTier ?? currentStatus?.projectedStakingTier);
  const hasManualAllocation = (currentStatus?.manualRewardRemainingUsd ?? 0n) > 0n;
  const { data: promoActivity, loading: promoActivityLoading } = useRewardsPromoActivity(chainId, {
    account,
    enabled: Boolean(account && currentStatus && !hasActiveStakingTier && !hasManualAllocation),
  });
  const { selection: promoSelection, isLoading: promoSelectionLoading } = useStableRewardsPromoSelection({
    chainId,
    account,
    walletStatus,
    isWalletInitializing,
    enabled: true,
    config,
    status: currentStatus,
    statusLoading,
    activity: promoActivity,
    activityLoading: promoActivityLoading,
  });
  const stakingPromoSelection = promoSelection ? getStakingRewardsPromoSelection(promoSelection) : undefined;
  const statusState: AccountDataState = !account
    ? "disconnected"
    : statusLoading
      ? "loading"
      : statusUnavailable || !currentStatus
        ? "unavailable"
        : "ready";
  const summaryState: AccountDataState = !account
    ? "disconnected"
    : summaryLoading
      ? "loading"
      : summaryUnavailable
        ? "unavailable"
        : "ready";
  const vestingState: AccountDataState = !account
    ? "disconnected"
    : vestingData
      ? "ready"
      : vestingLoading
        ? "loading"
        : "unavailable";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_40rem] items-start gap-8 max-[1620px]:grid-cols-[minmax(0,1fr)_30rem] max-xl:grid-cols-1">
      <div className="flex min-w-0 flex-col gap-8 max-xl:order-2">
        <div className="flex flex-col gap-12 rounded-8 bg-slate-900 p-12">
          <RewardsTiersSummary
            allTimeSummary={allTimeSummary}
            currentMultiplier={currentStatus?.multiplier}
            projectedMultiplier={getProjectedMultiplier(config, currentStatus)}
            maxMultiplier={config.maxMultiplier}
            multiplierDecimals={config.multiplierDecimals}
            statusState={statusState}
            summaryState={summaryState}
            vestingState={vestingState}
            vestableEsGmx={vestableEsGmx}
            vestableEsGmxUsd={vestableEsGmxUsd}
            hasVestingPosition={(vestingData?.vestingInfo.vestedAmount ?? 0n) > 0n}
          />
          <RewardsTierCards
            config={config}
            status={currentStatus}
            statusState={statusState}
            account={account}
            walletGmx={vestingData?.walletGmxBalance}
            walletGmxState={vestingState}
            promoSelection={stakingPromoSelection}
          />
        </div>

        <RewardsTierTables chainId={chainId} config={config} status={currentStatus} statusState={statusState} />
      </div>

      <div className="sticky top-8 flex min-w-0 flex-col gap-8 max-xl:contents">
        <div className="min-w-0 max-xl:order-3">
          <RewardsTiersFaq config={config} />
        </div>
        {!isWalletInitializing ? (
          <RewardsPromotionalBanners
            account={account}
            config={config}
            status={currentStatus}
            promoSelection={promoSelection}
            walletGmx={vestingData?.walletGmxBalance}
            walletEsGmx={vestingData?.walletEsGmxBalance}
            isLoading={promoSelectionLoading}
            className="max-xl:order-1"
          />
        ) : null}
      </div>
    </div>
  );
}
