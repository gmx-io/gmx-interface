import { useCallback, useEffect, useState } from "react";

import { HISTORICAL_REWARDS_ALLOCATION_MODAL_DISMISSED_KEY } from "config/localStorage";
import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import type { AccountIncentiveStatus } from "domain/synthetics/incentives/v2/types";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/v2/useAccountIncentiveStatus";
import { useLocalStorageSerializeKeySafe } from "lib/localStorage";

export function getShouldShowHistoricalRewardsAllocationModal({
  dismissed,
  account,
  status,
  activeEpochTimestamp,
}: {
  dismissed: boolean;
  account?: string;
  status?: AccountIncentiveStatus;
  activeEpochTimestamp?: number;
}) {
  return Boolean(
    !dismissed &&
      account &&
      status &&
      status.epochTimestamp === activeEpochTimestamp &&
      status.manualRewardCapUsd > 0n &&
      status.manualRewardConsumedUsd === 0n &&
      status.manualRewardRemainingUsd > 0n
  );
}

export function useHistoricalRewardsAllocationModal({ chainId, account }: { chainId: number; account?: string }) {
  const { availability, isActive } = useIncentivesV2State();
  const { data: status } = useAccountIncentiveStatus(chainId, {
    account,
    enabled: isActive && Boolean(account),
  });
  const [dismissed, setDismissed] = useLocalStorageSerializeKeySafe<boolean>(
    [HISTORICAL_REWARDS_ALLOCATION_MODAL_DISMISSED_KEY, chainId, account],
    false
  );
  const [isVisible, setIsVisible] = useState(false);
  const activeEpochTimestamp = availability.status === "active" ? availability.config.epochTimestamp : undefined;
  const shouldShow = getShouldShowHistoricalRewardsAllocationModal({
    dismissed: dismissed ?? false,
    account,
    status,
    activeEpochTimestamp,
  });

  useEffect(() => {
    setIsVisible(shouldShow);
  }, [shouldShow]);

  const close = useCallback(() => {
    setIsVisible(false);
    setDismissed(true);
  }, [setDismissed]);

  return {
    isVisible,
    close,
    rewardCapUsd: status?.manualRewardCapUsd,
    rewardConsumedUsd: status?.manualRewardConsumedUsd,
    rewardRemainingUsd: status?.manualRewardRemainingUsd,
  };
}
