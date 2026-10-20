import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useEffect, useMemo } from "react";
import { useHistory, useLocation } from "react-router-dom";

import { ARBITRUM_SEPOLIA } from "config/chains";
import { useChainId } from "lib/chains";
import { sendRewardsPageViewEvent } from "lib/userAnalytics/rewardsEvents";

import { AppCard } from "components/AppCard/AppCard";
import Button from "components/Button/Button";
import { RedirectWithQuery } from "components/RedirectWithQuery/RedirectWithQuery";
import Tabs from "components/Tabs/Tabs";
import type { Option } from "components/Tabs/types";

import { RewardsHistoryTab } from "./components/RewardsHistoryTab";
import { RewardsLeaderboardTab } from "./components/RewardsLeaderboardTab";
import { RewardsOnboardingModal } from "./components/RewardsOnboardingModal";
import { RewardsSummaryRow } from "./components/RewardsSummaryRow";
import type { AccountDataState } from "./components/rewardsTiersShared";
import { RewardsTiersTab } from "./components/RewardsTiersTab";
import { RewardsVestingFaq } from "./components/RewardsVestingFaq";
import { RewardsVestingFlow } from "./components/RewardsVestingFlow";
import { getRewardsDebugConfig, getRewardsDebugMode } from "./rewardsDebug";
import { RewardsPageLayout, RewardsPageLoadingContent } from "./RewardsPageShell";
import { getRewardsPath, getRewardsTabFromPathname, type RewardsTab } from "./rewardsRoutes";
import { RewardsTesterPanel } from "./tester/RewardsTesterPanel";
import { useRewardsTesterPageData, useRewardsTesterWallet } from "./tester/useRewardsTester";

export function RewardsPage() {
  const { pathname, search } = useLocation();
  const history = useHistory();
  const { chainId } = useChainId();
  const { account } = useRewardsTesterWallet();
  const activeTab = getRewardsTabFromPathname(pathname);
  const pageData = useRewardsTesterPageData({
    chainId,
    account,
    loadTierAccountData: activeTab === "tiers",
    loadAllTimeSummary: true,
  });
  const tabOptions = useMemo<Option<RewardsTab>[]>(
    () =>
      account
        ? [
            { value: "tiers", label: <Trans>Multiplier</Trans> },
            { value: "history", label: <Trans>Vesting</Trans> },
            { value: "leaderboard", label: <Trans>Leaderboard</Trans> },
          ]
        : [
            { value: "tiers", label: <Trans>Multiplier</Trans> },
            { value: "leaderboard", label: <Trans>Leaderboard</Trans> },
          ],
    [account]
  );
  const debugMode = getRewardsDebugMode(search);
  const debugConfig =
    pageData.availability.status === "unsupported-chain" ? undefined : getRewardsDebugConfig(debugMode);
  const config = debugConfig ?? (pageData.availability.status === "active" ? pageData.availability.config : undefined);
  const handleTabChange = useCallback(
    (tab: RewardsTab) => history.push({ pathname: getRewardsPath(tab), search }),
    [history, search]
  );

  useEffect(() => {
    if (!activeTab) return;

    sendRewardsPageViewEvent(activeTab === "history" ? "rewards" : activeTab);
  }, [activeTab]);

  if (!activeTab) {
    return <RedirectWithQuery to="/rewards" />;
  }

  const allTimeSummaryState: AccountDataState = !account
    ? "disconnected"
    : pageData.availability.status === "loading" || pageData.allTimeSummaryLoading
      ? "loading"
      : pageData.availability.status !== "active" || (pageData.allTimeSummaryError && !pageData.allTimeSummaryLoaded)
        ? "unavailable"
        : "ready";
  // Hidden while Rewards is paused or failing: its numbers and links would point at the error card.
  const showSummaryRow =
    Boolean(account) &&
    (debugConfig !== undefined ||
      pageData.availability.status === "active" ||
      pageData.availability.status === "loading");

  const pageContent = (content: React.ReactNode) => (
    <RewardsPageLayout>
      <RewardsTesterPanel />
      {showSummaryRow ? (
        <RewardsSummaryRow
          chainId={chainId}
          account={account}
          allTimeSummary={pageData.allTimeSummary}
          summaryState={allTimeSummaryState}
        />
      ) : null}
      <div className={cx("flex grow flex-col gap-8", !showSummaryRow && "mt-12")}>
        <div className="min-w-0">
          <Tabs
            options={tabOptions}
            selectedValue={activeTab}
            onChange={handleTabChange}
            type="inline-primary"
            className="min-w-0 gap-12 max-md:flex-col max-md:items-start max-md:gap-4"
            tabsWrapperClassName="min-w-0 overflow-x-auto scrollbar-hide"
            rightContent={<RewardsOnboardingModal shouldAutoOpen={Boolean(config)} />}
          />
        </div>
        {content}
      </div>
    </RewardsPageLayout>
  );

  if (debugMode === "loading") {
    return pageContent(<RewardsPageLoadingContent />);
  }

  if (debugMode === "error") {
    return pageContent(
      <AppCard>
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-12 px-20 py-24 text-center">
          <div className="text-h2">
            <Trans>Rewards are temporarily unavailable</Trans>
          </div>
          <div className="text-body-medium max-w-[520px] text-typography-secondary">
            <Trans>The incentives service could not be loaded. Your trading activity is not affected.</Trans>
          </div>
          <Button variant="primary" onClick={() => undefined}>
            <Trans>Retry</Trans>
          </Button>
        </div>
      </AppCard>
    );
  }

  if (debugMode === "empty") {
    return pageContent(
      <AppCard>
        <div className="text-body-medium flex min-h-[220px] items-center justify-center px-20 py-24 text-center text-typography-secondary">
          <Trans>No rewards</Trans>
        </div>
      </AppCard>
    );
  }

  if (
    !config &&
    activeTab === "leaderboard" &&
    pageData.canLoadAllTimeLeaderboard &&
    pageData.availability.status !== "active"
  ) {
    return pageContent(<RewardsLeaderboardTab chainId={chainId} account={account} />);
  }

  if (!config && pageData.availability.status === "loading") {
    return pageContent(<RewardsPageLoadingContent />);
  }

  if (!config && pageData.availability.status === "unsupported-chain") {
    return pageContent(
      <AppCard>
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-12 px-20 py-24 text-center">
          <div className="text-h2">
            <Trans>Rewards are available on Arbitrum</Trans>
          </div>
          <div className="text-body-medium max-w-[520px] text-typography-secondary">
            <Trans>Switch to Arbitrum to view incentive tiers, rewards, and the leaderboard.</Trans>
          </div>
        </div>
      </AppCard>
    );
  }

  if (!config && pageData.availability.status === "inactive") {
    return pageContent(
      <AppCard>
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-12 px-20 py-24 text-center">
          <div className="text-h2">
            <Trans>The Rewards program is not currently active</Trans>
          </div>
          <div className="text-body-medium max-w-[520px] text-typography-secondary">
            <Trans>No V2 incentives configuration is available for this chain.</Trans>
          </div>
          <Button variant="primary" onClick={() => void pageData.retry()}>
            <Trans>Check again</Trans>
          </Button>
        </div>
      </AppCard>
    );
  }

  if (!config && pageData.availability.status === "error") {
    return pageContent(
      <AppCard>
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-12 px-20 py-24 text-center">
          <div className="text-h2">
            <Trans>Rewards are temporarily unavailable</Trans>
          </div>
          <div className="text-body-medium max-w-[520px] text-typography-secondary">
            <Trans>The incentives service could not be loaded. Your trading activity is not affected.</Trans>
          </div>
          <Button variant="primary" onClick={() => void pageData.retry()}>
            <Trans>Retry</Trans>
          </Button>
        </div>
      </AppCard>
    );
  }

  if (!config) {
    return pageContent(<RewardsPageLoadingContent />);
  }

  const liveAvailability = pageData.availability.status === "active" ? pageData.availability : undefined;
  const showLiveWarnings = debugConfig === undefined;
  const showTierAccountWarnings = showLiveWarnings && activeTab === "tiers";

  return pageContent(
    <>
      {showLiveWarnings && liveAvailability?.isStale ? (
        <div className="text-body-small rounded-8 border-l-2 border-yellow-300 bg-yellow-300/10 p-12">
          <Trans>Rewards configuration could not be refreshed. Showing the latest loaded data.</Trans>
        </div>
      ) : null}
      {showTierAccountWarnings && pageData.isMixedEpochPersistent ? (
        <div className="text-body-small rounded-8 border-l-2 border-yellow-300 bg-yellow-300/10 p-12">
          <Trans>The new epoch is being indexed. Account totals will update shortly.</Trans>
        </div>
      ) : null}
      {showLiveWarnings && (pageData.allTimeSummaryError || (activeTab === "tiers" && pageData.accountStatusError)) ? (
        <div className="text-body-small rounded-8 border-l-2 border-yellow-300 bg-yellow-300/10 p-12">
          <Trans>Some account rewards could not be refreshed. Public incentive data remains available.</Trans>
        </div>
      ) : null}

      {activeTab === "tiers" ? (
        <RewardsTiersTab
          chainId={chainId}
          config={config}
          account={account}
          status={pageData.accountStatus}
          statusLoading={pageData.accountStatusLoading || (pageData.isMixedEpoch && !pageData.isMixedEpochPersistent)}
          statusUnavailable={Boolean(
            pageData.isMixedEpochPersistent || (pageData.accountStatusError && !pageData.accountStatus)
          )}
        />
      ) : activeTab === "history" ? (
        <div className="grid grid-cols-[minmax(0,1fr)_40rem] items-start gap-8 max-[1620px]:grid-cols-[minmax(0,1fr)_30rem] max-xl:grid-cols-1">
          <div className="flex min-w-0 flex-col gap-8">
            <RewardsVestingFlow />
            <RewardsHistoryTab chainId={chainId} account={account} config={config} />
          </div>
          <div className="sticky top-8 min-w-0 max-xl:static">
            <RewardsVestingFaq isTestnet={chainId === ARBITRUM_SEPOLIA} />
          </div>
        </div>
      ) : (
        <div className="min-w-0">
          <RewardsLeaderboardTab chainId={chainId} account={account} config={config} />
        </div>
      )}
    </>
  );
}
