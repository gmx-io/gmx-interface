import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/v2/useAccountIncentiveStatus";
import { useEpochRolloverRevalidation } from "domain/synthetics/incentives/v2/useEpochRolloverRevalidation";
import { useIncentivesLeaderboard } from "domain/synthetics/incentives/v2/useIncentivesLeaderboard";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";

const MIXED_EPOCH_WARNING_DELAY = 30_000;

type RewardsPageDataParams = {
  chainId: number;
  account?: string;
  loadTierAccountData: boolean;
};

export function useRewardsPageData({ chainId, account, loadTierAccountData }: RewardsPageDataParams) {
  const incentivesV2State = useIncentivesV2State();
  const availability = incentivesV2State.availability;
  const mutateConfig = incentivesV2State.refreshConfig;
  const isActive = incentivesV2State.isActive;
  const canLoadAllTimeLeaderboard = availability.status !== "unsupported-chain";
  const shouldLoadAccountData = loadTierAccountData && isActive && Boolean(account);

  const {
    data: accountStatusData,
    error: accountStatusError,
    loading: accountStatusLoading,
    isValidating: accountStatusValidating,
    mutate: mutateAccountStatus,
    endpoint: accountStatusEndpoint,
  } = useAccountIncentiveStatus(chainId, {
    account,
    enabled: shouldLoadAccountData,
  });
  const {
    data: allTimeSummaryData,
    error: allTimeSummaryError,
    loading: allTimeSummaryLoading,
    isValidating: allTimeSummaryValidating,
    mutate: mutateAllTimeSummary,
    endpoint: allTimeSummaryEndpoint,
  } = useIncentivesLeaderboard(chainId, {
    where: account ? { account } : undefined,
    isMutable: true,
    limit: 1,
    offset: 0,
    enabled: shouldLoadAccountData,
  });

  const config = availability.status === "active" ? availability.config : undefined;
  const isMixedEpoch = Boolean(
    shouldLoadAccountData &&
      availability.status === "active" &&
      accountStatusData &&
      accountStatusData.epochTimestamp !== availability.config.epochTimestamp
  );
  const accountStatus = shouldLoadAccountData && !isMixedEpoch ? accountStatusData : undefined;
  const allTimeSummary = shouldLoadAccountData ? allTimeSummaryData?.[0] : undefined;
  const allTimeSummaryLoaded = shouldLoadAccountData && allTimeSummaryData !== undefined;
  // Surface the mixed-epoch warning only when the mismatch outlives the normal rollover races,
  // counting from when the mismatch is first observed even if the page mounts mid-mismatch.
  const [hasMixedEpochPersisted, setHasMixedEpochPersisted] = useState(false);
  const isMixedEpochPersistent = isMixedEpoch && hasMixedEpochPersisted;

  useEffect(() => {
    if (!isMixedEpoch) {
      setHasMixedEpochPersisted(false);
      return;
    }

    const timeoutId = window.setTimeout(() => setHasMixedEpochPersisted(true), MIXED_EPOCH_WARNING_DELAY);

    return () => window.clearTimeout(timeoutId);
  }, [isMixedEpoch]);

  // The indexer serves the config from a shared response cache, so it can keep returning the
  // previous epoch right after a boundary; refresh it until it matches the account status again.
  useEffect(() => {
    if (!isMixedEpoch) return;

    const intervalId = window.setInterval(() => void mutateConfig(), FREQUENT_UPDATE_INTERVAL);

    return () => window.clearInterval(intervalId);
  }, [isMixedEpoch, mutateConfig]);

  const revalidateAccountData = useCallback(
    () => Promise.allSettled([mutateAccountStatus(), mutateAllTimeSummary()]),
    [mutateAccountStatus, mutateAllTimeSummary]
  );

  const rolloverRef = useRef<{ scope: string; epochTimestamp: number }>();

  useEffect(() => {
    if (availability.status !== "active") {
      rolloverRef.current = undefined;
      return;
    }

    const scope = `${chainId}:${account ?? ""}:${accountStatusEndpoint ?? allTimeSummaryEndpoint ?? ""}`;
    const current = { scope, epochTimestamp: availability.config.epochTimestamp };
    const previous = rolloverRef.current;
    rolloverRef.current = current;

    if (!previous || previous.scope !== scope || previous.epochTimestamp === current.epochTimestamp || !account) {
      return;
    }

    void revalidateAccountData();
  }, [account, accountStatusEndpoint, allTimeSummaryEndpoint, availability, chainId, revalidateAccountData]);

  useEpochRolloverRevalidation({
    epochTimestamp: availability.status === "active" ? availability.config.epochTimestamp : undefined,
    enabled: shouldLoadAccountData,
    scopeKey: `${chainId}:${account ?? ""}:${accountStatusEndpoint ?? allTimeSummaryEndpoint ?? ""}`,
    revalidate: revalidateAccountData,
  });

  const retry = useCallback(async () => {
    const requests: Promise<unknown>[] = [mutateConfig()];

    if (shouldLoadAccountData) {
      requests.push(mutateAccountStatus(), mutateAllTimeSummary());
    }

    await Promise.allSettled(requests);
  }, [mutateAccountStatus, mutateAllTimeSummary, mutateConfig, shouldLoadAccountData]);

  return useMemo(
    () => ({
      availability,
      config,
      canLoadAllTimeLeaderboard,
      accountStatus,
      allTimeSummary,
      allTimeSummaryLoaded,
      isMixedEpoch,
      isMixedEpochPersistent,
      accountStatusError: shouldLoadAccountData ? accountStatusError : undefined,
      allTimeSummaryError: shouldLoadAccountData ? allTimeSummaryError : undefined,
      accountStatusLoading: shouldLoadAccountData && accountStatusLoading,
      allTimeSummaryLoading: shouldLoadAccountData && allTimeSummaryLoading,
      accountStatusValidating: shouldLoadAccountData && accountStatusValidating,
      allTimeSummaryValidating: shouldLoadAccountData && allTimeSummaryValidating,
      retry,
      mutateConfig,
      mutateAccountStatus,
      mutateAllTimeSummary,
    }),
    [
      accountStatus,
      accountStatusError,
      accountStatusLoading,
      accountStatusValidating,
      allTimeSummary,
      allTimeSummaryLoaded,
      allTimeSummaryError,
      allTimeSummaryLoading,
      allTimeSummaryValidating,
      availability,
      canLoadAllTimeLeaderboard,
      config,
      isMixedEpoch,
      isMixedEpochPersistent,
      mutateAccountStatus,
      mutateAllTimeSummary,
      mutateConfig,
      retry,
      shouldLoadAccountData,
    ]
  );
}
