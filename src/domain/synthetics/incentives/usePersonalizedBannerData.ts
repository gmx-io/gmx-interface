import { useEffect, useMemo, useState } from "react";

import { ARBITRUM } from "config/chains";
import { useGmxPrice } from "domain/legacy";
import { useChainId } from "lib/chains";
import { bigintToNumber, USD_DECIMALS } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";
import { convertToUsd } from "sdk/utils/tokens";

import { GMX_DECIMALS, isIncentivesEnabled, MAX_FEE_DISCOUNT_PERCENT } from "./constants";
import { useAccountFirstTradeTimestamp } from "./useAccountFirstTradeTimestamp";
import { useAccountNetPositionFeesLast4Months } from "./useAccountNetPositionFeesLast4Months";
import { useAccountManualRewardsAllocation } from "./useAccountRewardsHistory";
import { useIncentivesConfig } from "./useIncentivesConfig";

const RECENT_FEES_THRESHOLD_USD = 20;
const NEW_USER_WINDOW_SECONDS = 14 * 24 * 60 * 60;
const INITIAL_WALLET_RECONNECT_SETTLE_MS = 500;
const WAGMI_RECENT_CONNECTOR_KEY = "wagmi.recentConnectorId";

export type BannerVariant = "manual-reward" | "recent-activity" | "new-or-low-fees";

export type PersonalizedBannerData = {
  bannerVariant: BannerVariant | undefined;
  isManuallyRewarded: boolean;
  manualAllocatedPoints: bigint | undefined;
  manualBonusUsd: bigint | undefined;
  estimatedRewardsUsd: number | undefined;
  isLoading: boolean;
};

type ResolvedSessionData = {
  sessionKey: string;
  data: PersonalizedBannerData;
};

function getLoadingBannerData(overrides: Partial<Pick<PersonalizedBannerData, "isManuallyRewarded">> = {}) {
  return {
    bannerVariant: undefined,
    isManuallyRewarded: overrides.isManuallyRewarded ?? false,
    manualAllocatedPoints: undefined,
    manualBonusUsd: undefined,
    estimatedRewardsUsd: undefined,
    isLoading: true,
  };
}

function getHasRecentWagmiConnector(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return Boolean(window.localStorage.getItem(WAGMI_RECENT_CONNECTOR_KEY));
  } catch {
    return false;
  }
}

export function usePersonalizedBannerData(): PersonalizedBannerData {
  const { chainId } = useChainId();
  const { active, signer, account, status } = useWallet();

  const incentivesEnabled = isIncentivesEnabled(chainId);
  const enabled = incentivesEnabled && Boolean(account);
  const [isInitialWalletReconnectSettling, setIsInitialWalletReconnectSettling] = useState(
    () => incentivesEnabled && !account && status === "disconnected" && getHasRecentWagmiConnector()
  );
  const isWalletAccountSettling =
    incentivesEnabled &&
    (status === "connecting" || status === "reconnecting" || (!account && isInitialWalletReconnectSettling));

  useEffect(() => {
    if (!incentivesEnabled) {
      setIsInitialWalletReconnectSettling(false);
      return;
    }

    if (account || status === "connecting" || status === "reconnecting") {
      setIsInitialWalletReconnectSettling(false);
      return;
    }

    if (status !== "disconnected" || !getHasRecentWagmiConnector()) {
      return;
    }

    setIsInitialWalletReconnectSettling(true);
    const timeout = window.setTimeout(() => {
      setIsInitialWalletReconnectSettling(false);
    }, INITIAL_WALLET_RECONNECT_SETTLE_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [account, incentivesEnabled, status]);

  const { data: config, loading: configLoading } = useIncentivesConfig(chainId);
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
  const manualAllocatedPoints = hasProgramStartTimestamp ? fetchedManualAllocatedPoints : undefined;

  const { gmxPrice } = useGmxPrice(chainId, { arbitrum: chainId === ARBITRUM ? signer : undefined }, active);

  const underlyingLoading =
    configLoading ||
    netPositionFeesLoading ||
    firstTradeLoading ||
    (hasProgramStartTimestamp && manualAllocatedPointsLoading) ||
    (enabled && hasProgramStartTimestamp && fetchedManualAllocatedPoints === undefined) ||
    (enabled && !hasProgramStartTimestamp);

  // SWR's `isLoading` flips back to `true` on every revalidation when the fetched value is
  // undefined, which would make the banner recompute from partial data every refresh. Keep the
  // latest complete account snapshot for the current account only, and hide the banner for new
  // account/chain sessions until their own data has resolved.
  const sessionKey = enabled ? `${chainId}:${account?.toLowerCase()}` : "disabled";
  const [resolvedSessionData, setResolvedSessionData] = useState<ResolvedSessionData | null>(null);
  const hasResolvedSession = resolvedSessionData?.sessionKey === sessionKey;

  const resolvedBannerData = useMemo((): PersonalizedBannerData | undefined => {
    if (isWalletAccountSettling) {
      return undefined;
    }

    if (!enabled) {
      return {
        bannerVariant: "new-or-low-fees",
        isManuallyRewarded: false,
        manualAllocatedPoints: undefined,
        manualBonusUsd: undefined,
        estimatedRewardsUsd: undefined,
        isLoading: false,
      };
    }

    if (underlyingLoading) {
      return undefined;
    }

    const allocatedPoints = manualAllocatedPoints ?? 0n;
    const isManuallyRewarded = allocatedPoints > 0n;

    if (isManuallyRewarded) {
      if (gmxPrice === undefined || gmxPrice === 0n) {
        return undefined;
      }

      return {
        bannerVariant: "manual-reward",
        isManuallyRewarded: true,
        manualAllocatedPoints: allocatedPoints,
        manualBonusUsd: convertToUsd(allocatedPoints, GMX_DECIMALS, gmxPrice),
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
        manualAllocatedPoints: undefined,
        manualBonusUsd: undefined,
        estimatedRewardsUsd: Math.round(estimatedRewardsUsd * 100) / 100,
        isLoading: false,
      };
    }

    return {
      bannerVariant: "new-or-low-fees",
      isManuallyRewarded: false,
      manualAllocatedPoints: undefined,
      manualBonusUsd: undefined,
      estimatedRewardsUsd: undefined,
      isLoading: false,
    };
  }, [
    enabled,
    isWalletAccountSettling,
    underlyingLoading,
    netPositionFees,
    firstTradeTimestamp,
    manualAllocatedPoints,
    gmxPrice,
  ]);

  useEffect(() => {
    if (enabled && resolvedBannerData && !resolvedBannerData.isLoading) {
      setResolvedSessionData({ sessionKey, data: resolvedBannerData });
    }
  }, [enabled, resolvedBannerData, sessionKey]);

  useEffect(() => {
    if (!enabled) {
      setResolvedSessionData(null);
    }
  }, [enabled]);

  const personalizedBannerData = useMemo(() => {
    if (!enabled) {
      return resolvedBannerData ?? getLoadingBannerData();
    }

    const allocatedPoints = manualAllocatedPoints ?? 0n;
    const isManuallyRewarded = allocatedPoints > 0n;

    if (resolvedBannerData) {
      return resolvedBannerData;
    }

    if (hasResolvedSession && resolvedSessionData && (underlyingLoading || !resolvedBannerData)) {
      return resolvedSessionData.data;
    }

    return getLoadingBannerData({
      isManuallyRewarded,
    });
  }, [enabled, resolvedBannerData, manualAllocatedPoints, hasResolvedSession, underlyingLoading, resolvedSessionData]);

  return personalizedBannerData;
}
