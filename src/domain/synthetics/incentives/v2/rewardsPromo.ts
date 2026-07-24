import { useEffect, useMemo, useState } from "react";

import type { AccountIncentiveStatus, IncentivesConfig } from "./types";
import type { RewardsPromoActivity } from "./useRewardsPromoActivity";
import { getMaxRewardRateFactor, getRecentActivityRewardEstimateUsd } from "./utils";

export type RewardsPromoVariant = "manual-reward" | "recent-activity" | "new-or-low-fees";

export type RewardsPromoSelection = {
  variant: RewardsPromoVariant;
  isActiveUser: boolean;
  manualRewardRemainingUsd?: bigint;
  estimatedRewardsUsd?: bigint;
  maxRewardRateFactor: bigint;
};

export type StableRewardsPromoSelection = {
  selection?: RewardsPromoSelection;
  isLoading: boolean;
};

type ResolvedSessionSelection = {
  sessionKey: string;
  selection: RewardsPromoSelection;
};

export function getIsActiveRewardsUser(status?: AccountIncentiveStatus) {
  if (!status) return false;

  return (
    status.tradingVolume > 0n ||
    status.tierVolume > 0n ||
    status.referralVolume > 0n ||
    status.currentStakedBalance > 0n ||
    status.esGmxRewards > 0n ||
    status.gtRewards > 0n ||
    status.rewardsUsd > 0n ||
    status.manualRewardConsumedUsd > 0n ||
    status.boostIds.some((boostId) => boostId !== "ManualAllocation")
  );
}

export function getRewardsPromoSelection({
  config,
  status,
  activity,
  nowSeconds,
}: {
  config: IncentivesConfig;
  status?: AccountIncentiveStatus;
  activity?: RewardsPromoActivity;
  nowSeconds?: number;
}): RewardsPromoSelection {
  const currentStatus = status?.epochTimestamp === config.epochTimestamp ? status : undefined;
  const maxRewardRateFactor = getMaxRewardRateFactor(config);
  const manualRewardRemainingUsd = currentStatus?.manualRewardRemainingUsd ?? 0n;
  const isActiveUser = getIsActiveRewardsUser(currentStatus);

  if (manualRewardRemainingUsd > 0n) {
    return {
      variant: "manual-reward",
      isActiveUser,
      manualRewardRemainingUsd,
      maxRewardRateFactor,
    };
  }

  const estimatedRewardsUsd = activity
    ? getRecentActivityRewardEstimateUsd({
        ...activity,
        maxRewardRateFactor,
        nowSeconds,
      })
    : undefined;

  if (estimatedRewardsUsd !== undefined) {
    return {
      variant: "recent-activity",
      isActiveUser,
      estimatedRewardsUsd,
      maxRewardRateFactor,
    };
  }

  return {
    variant: "new-or-low-fees",
    isActiveUser,
    maxRewardRateFactor,
  };
}

export function getStakingRewardsPromoSelection(selection: RewardsPromoSelection): RewardsPromoSelection {
  if (selection.variant !== "manual-reward") return selection;

  return {
    variant: "new-or-low-fees",
    isActiveUser: selection.isActiveUser,
    maxRewardRateFactor: selection.maxRewardRateFactor,
  };
}

export function useStableRewardsPromoSelection({
  chainId,
  account,
  walletStatus,
  isWalletInitializing,
  enabled,
  config,
  status,
  statusLoading,
  activity,
  activityLoading,
}: {
  chainId: number;
  account?: string;
  walletStatus?: string;
  isWalletInitializing: boolean;
  enabled: boolean;
  config?: IncentivesConfig;
  status?: AccountIncentiveStatus;
  statusLoading: boolean;
  activity?: RewardsPromoActivity;
  activityLoading: boolean;
}): StableRewardsPromoSelection {
  const isWalletAccountSettling =
    enabled && (isWalletInitializing || walletStatus === "connecting" || walletStatus === "reconnecting");
  const sessionKey = enabled && account && config ? `${chainId}:${account}:${config.epochTimestamp}` : undefined;
  const sessionStatus = !account || status?.account === account ? status : undefined;
  const hasStatusFromAnotherAccount = Boolean(account && status && status.account !== account);
  const hasStatusFromAnotherEpoch = Boolean(
    account && sessionStatus && config && sessionStatus.epochTimestamp !== config.epochTimestamp
  );
  const currentStatus = sessionStatus?.epochTimestamp === config?.epochTimestamp ? sessionStatus : undefined;
  const canResolveWithoutActivity = (currentStatus?.manualRewardRemainingUsd ?? 0n) > 0n;
  const underlyingLoading = Boolean(
    account &&
      (statusLoading ||
        hasStatusFromAnotherAccount ||
        hasStatusFromAnotherEpoch ||
        (!canResolveWithoutActivity && activityLoading))
  );
  const [resolvedSessionSelection, setResolvedSessionSelection] = useState<ResolvedSessionSelection>();

  const selection = useMemo(() => {
    if (!enabled || !config || isWalletAccountSettling || underlyingLoading) return undefined;

    return getRewardsPromoSelection({ config, status: sessionStatus, activity });
  }, [activity, config, enabled, isWalletAccountSettling, sessionStatus, underlyingLoading]);

  useEffect(() => {
    if (sessionKey && selection) {
      setResolvedSessionSelection({ sessionKey, selection });
    }
  }, [selection, sessionKey]);

  useEffect(() => {
    if (!enabled || (!account && !isWalletAccountSettling)) {
      setResolvedSessionSelection(undefined);
    }
  }, [account, enabled, isWalletAccountSettling]);

  if (!enabled) return { selection: undefined, isLoading: false };
  if (!account) return { selection, isLoading: selection === undefined };
  if (selection) return { selection, isLoading: false };
  if (resolvedSessionSelection && resolvedSessionSelection.sessionKey === sessionKey) {
    return { selection: resolvedSessionSelection.selection, isLoading: false };
  }

  return { selection: undefined, isLoading: true };
}
