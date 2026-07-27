import type { ContractsChainId } from "config/chains";
import {
  getStakingRewardsPromoSelection,
  useStableRewardsPromoSelection,
} from "domain/synthetics/incentives/v2/rewardsPromo";
import type { AccountIncentiveStatus, IncentivesConfig, LeaderboardEntry } from "domain/synthetics/incentives/v2/types";
import { useRewardsPromoActivity } from "domain/synthetics/incentives/v2/useRewardsPromoActivity";
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

function getProjectedMultiplier(config: IncentivesConfig, status?: AccountIncentiveStatus) {
  if (!status) {
    return undefined;
  }

  const currentVolumeMultiplier = getTierMultiplier(config.volumeTiers, status.volumeTier);
  const projectedVolumeMultiplier = getTierMultiplier(config.volumeTiers, status.projectedVolumeTier);
  const currentStakingMultiplier = getTierMultiplier(config.stakingTiers, status.stakingTier);
  const projectedStakingMultiplier = getTierMultiplier(config.stakingTiers, status.projectedStakingTier);
  const projectedMultiplier =
    status.multiplier +
    projectedVolumeMultiplier -
    currentVolumeMultiplier +
    projectedStakingMultiplier -
    currentStakingMultiplier;

  return projectedMultiplier === status.multiplier
    ? undefined
    : projectedMultiplier > config.maxMultiplier
      ? config.maxMultiplier
      : projectedMultiplier;
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
    status && status.account === account && status.epochTimestamp === config.epochTimestamp ? status : undefined;
  const hasActiveStakingTier = Boolean(currentStatus?.stakingTier ?? currentStatus?.projectedStakingTier);
  const hasManualAllocation = (currentStatus?.manualRewardRemainingUsd ?? 0n) > 0n;
  const { data: promoActivity, loading: promoActivityLoading } = useRewardsPromoActivity(chainId, {
    account,
    enabled: Boolean(account && currentStatus && !hasActiveStakingTier && !hasManualAllocation),
  });
  const { selection: promoSelection } = useStableRewardsPromoSelection({
    chainId,
    account,
    walletStatus,
    isWalletInitializing,
    enabled: true,
    config,
    status,
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
        <RewardsPromotionalBanners
          account={account}
          config={config}
          status={currentStatus}
          promoSelection={promoSelection}
          walletGmx={vestingData?.walletGmxBalance}
          walletEsGmx={vestingData?.walletEsGmxBalance}
          className="max-xl:order-1"
        />
      </div>
    </div>
  );
}
