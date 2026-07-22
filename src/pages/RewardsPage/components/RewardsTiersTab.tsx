import type { ContractsChainId } from "config/chains";
import { useStakingProcessedData } from "domain/stake/useStakingProcessedData";
import type { AccountIncentiveStatus, IncentivesConfig, LeaderboardEntry } from "domain/synthetics/incentives/v2/types";
import { useRewardsPromoActivity } from "domain/synthetics/incentives/v2/useRewardsPromoActivity";
import { getMaxRewardRateFactor, getRecentActivityRewardEstimateUsd } from "domain/synthetics/incentives/v2/utils";

import { RewardsPromotionalBanners } from "./RewardsPromotionalBanners";
import { RewardsTierCards } from "./RewardsTierCards";
import { RewardsTiersFaq } from "./RewardsTiersFaq";
import type { AccountDataState } from "./rewardsTiersShared";
import { RewardsTiersSummary } from "./RewardsTiersSummary";
import { RewardsTierTables } from "./RewardsTierTables";

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
  const { data: stakingData } = useStakingProcessedData(chainId);
  const hasActiveStakingTier = Boolean(status?.stakingTier ?? status?.projectedStakingTier);
  const hasManualAllocation = (status?.manualRewardRemainingUsd ?? 0n) > 0n;
  const { data: promoActivity, loading: promoActivityLoading } = useRewardsPromoActivity(chainId, {
    account,
    enabled: Boolean(account && status && !hasActiveStakingTier && !hasManualAllocation),
  });
  const recentActivityRewardEstimateUsd = promoActivity
    ? getRecentActivityRewardEstimateUsd({
        ...promoActivity,
        maxRewardRateFactor: getMaxRewardRateFactor(config),
      })
    : undefined;
  const statusState: AccountDataState = !account
    ? "disconnected"
    : statusLoading
      ? "loading"
      : statusUnavailable || !status
        ? "unavailable"
        : "ready";
  const summaryState: AccountDataState = !account
    ? "disconnected"
    : summaryLoading
      ? "loading"
      : summaryUnavailable
        ? "unavailable"
        : "ready";
  const vestingState: AccountDataState = !account ? "disconnected" : "unavailable";

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <RewardsPromotionalBanners account={account} config={config} status={status} stakingData={stakingData} />
      <div className="flex flex-col gap-12 rounded-8 bg-slate-900 p-12" data-testid="rewards-tiers-overview">
        <RewardsTiersSummary allTimeSummary={allTimeSummary} summaryState={summaryState} vestingState={vestingState} />
        <RewardsTierCards
          config={config}
          status={status}
          statusState={statusState}
          account={account}
          walletGmx={stakingData?.gmxBalance}
          recentActivityRewardEstimateUsd={recentActivityRewardEstimateUsd}
          promoActivityLoading={promoActivityLoading}
        />
      </div>

      <RewardsTierTables chainId={chainId} config={config} status={status} statusState={statusState} />
      <RewardsTiersFaq config={config} />
    </div>
  );
}
