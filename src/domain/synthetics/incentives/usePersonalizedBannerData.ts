import { useMemo, useState } from "react";

import { ARBITRUM } from "config/chains";
import { useGmxPrice } from "domain/legacy";
import { useChainId } from "lib/chains";
import { bigintToNumber } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";

import { isIncentivesEnabled, MAX_FEE_DISCOUNT_PERCENT } from "./constants";
import type { AccountIncentiveDashboard, IncentivesConfig } from "./types";
import { useAccountFirstTradeTimestamp } from "./useAccountFirstTradeTimestamp";
import { useAccountIncentiveDashboard } from "./useAccountIncentiveDashboard";
import { useAccountNetPositionFeesLast4Months } from "./useAccountNetPositionFeesLast4Months";
import { useAccountManualRewardsAllocation } from "./useAccountRewardsHistory";
import { useIncentivesConfig } from "./useIncentivesConfig";

const USD_DECIMALS = 30;
const GMX_DECIMALS_FACTOR = 10n ** 18n;

const RECENT_FEES_THRESHOLD_USD = 20;
const NEW_USER_WINDOW_SECONDS = 14 * 24 * 60 * 60;

export type BannerVariant = "manual-reward" | "recent-activity" | "new-or-low-fees";

export type PersonalizedBannerData = {
  bannerVariant: BannerVariant | undefined;
  isManuallyRewarded: boolean;
  hasVolumeAfterFirstProgramEpoch: boolean;
  manualAllocatedPoints: bigint | undefined;
  manualBonusUsd: bigint | undefined;
  estimatedRewardsUsd: number | undefined;
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
  const { data: firstTradeTimestamp, loading: firstTradeLoading } = useAccountFirstTradeTimestamp(chainId, {
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

  const underlyingLoading =
    dashboardLoading ||
    netPositionFeesLoading ||
    firstTradeLoading ||
    (hasProgramStartTimestamp && manualAllocatedPointsLoading);

  // SWR's `isLoading` flips back to `true` on every revalidation when the fetched value is
  // undefined, which would make the banner blink in/out every refresh. Latch on first resolve.
  const [hasResolvedOnce, setHasResolvedOnce] = useState(false);
  if (!hasResolvedOnce && (!enabled || !underlyingLoading)) {
    setHasResolvedOnce(true);
  }

  return useMemo(() => {
    const hasVolumeAfterFirstProgramEpoch = getHasVolumeAfterFirstProgramEpoch(dashboard, config);

    if (enabled && underlyingLoading && !hasResolvedOnce) {
      return {
        bannerVariant: undefined,
        isManuallyRewarded: false,
        hasVolumeAfterFirstProgramEpoch,
        manualAllocatedPoints: undefined,
        manualBonusUsd: undefined,
        estimatedRewardsUsd: undefined,
        isLoading: true,
      };
    }

    if (!enabled) {
      return {
        bannerVariant: "new-or-low-fees",
        isManuallyRewarded: false,
        hasVolumeAfterFirstProgramEpoch: false,
        manualAllocatedPoints: undefined,
        manualBonusUsd: undefined,
        estimatedRewardsUsd: undefined,
        isLoading: false,
      };
    }

    const allocatedPoints = manualAllocatedPoints ?? 0n;
    const isManuallyRewarded = allocatedPoints > 0n;

    if (isManuallyRewarded) {
      if (gmxPrice === undefined || gmxPrice === 0n) {
        return {
          bannerVariant: undefined,
          isManuallyRewarded: true,
          hasVolumeAfterFirstProgramEpoch,
          manualAllocatedPoints: allocatedPoints,
          manualBonusUsd: undefined,
          estimatedRewardsUsd: undefined,
          isLoading: true,
        };
      }

      return {
        bannerVariant: "manual-reward",
        isManuallyRewarded: true,
        hasVolumeAfterFirstProgramEpoch,
        manualAllocatedPoints: allocatedPoints,
        manualBonusUsd: (allocatedPoints * gmxPrice) / GMX_DECIMALS_FACTOR,
        estimatedRewardsUsd: undefined,
        isLoading: false,
      };
    }

    const recentFeesUsd = netPositionFees !== undefined ? bigintToNumber(netPositionFees, USD_DECIMALS) : undefined;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const isFirstTradeWithinNewUserWindow =
      firstTradeTimestamp === undefined || nowSeconds - firstTradeTimestamp < NEW_USER_WINDOW_SECONDS;
    const hasEnoughFees = recentFeesUsd !== undefined && recentFeesUsd >= RECENT_FEES_THRESHOLD_USD;

    if (!isFirstTradeWithinNewUserWindow && hasEnoughFees) {
      const estimatedRewardsUsd = recentFeesUsd * (MAX_FEE_DISCOUNT_PERCENT / 100);
      return {
        bannerVariant: "recent-activity",
        isManuallyRewarded: false,
        hasVolumeAfterFirstProgramEpoch,
        manualAllocatedPoints: undefined,
        manualBonusUsd: undefined,
        estimatedRewardsUsd: Math.round(estimatedRewardsUsd * 100) / 100,
        isLoading: false,
      };
    }

    return {
      bannerVariant: "new-or-low-fees",
      isManuallyRewarded: false,
      hasVolumeAfterFirstProgramEpoch,
      manualAllocatedPoints: undefined,
      manualBonusUsd: undefined,
      estimatedRewardsUsd: undefined,
      isLoading: false,
    };
  }, [
    enabled,
    underlyingLoading,
    hasResolvedOnce,
    dashboard,
    netPositionFees,
    firstTradeTimestamp,
    manualAllocatedPoints,
    gmxPrice,
    config,
  ]);
}
