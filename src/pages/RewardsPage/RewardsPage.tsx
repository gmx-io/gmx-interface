import { Trans } from "@lingui/macro";
import { useCallback, useMemo } from "react";
import { useHistory, useLocation } from "react-router-dom";

import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";

import { AppCard } from "components/AppCard/AppCard";
import Button from "components/Button/Button";
import { RedirectWithQuery } from "components/RedirectWithQuery/RedirectWithQuery";
import Tabs from "components/Tabs/Tabs";

import RewardsIcon from "img/ic_rewards.svg?react";

import { RewardsHistoryTab } from "./components/RewardsHistoryTab";
import { RewardsLeaderboardTab } from "./components/RewardsLeaderboardTab";
import { RewardsTiersTab } from "./components/RewardsTiersTab";
import { RewardsVestingFlow } from "./components/RewardsVestingFlow";
import { RewardsPageLayout, RewardsPageLoadingShell } from "./RewardsPageShell";
import { getRewardsPath, getRewardsTabFromPathname, type RewardsTab } from "./rewardsRoutes";
import { useRewardsPageData } from "./useRewardsPageData";

export function RewardsPage() {
  const { pathname } = useLocation();
  const history = useHistory();
  const { chainId } = useChainId();
  const { account } = useWallet();
  const pageData = useRewardsPageData({ chainId, account });
  const activeTab = getRewardsTabFromPathname(pathname);
  const tabOptions = useMemo(
    () => [
      { value: "tiers" as const, label: <Trans>Tiers</Trans> },
      { value: "history" as const, label: <Trans>Rewards</Trans>, icon: <RewardsIcon className="size-16" /> },
      { value: "leaderboard" as const, label: <Trans>Leaderboard</Trans> },
    ],
    []
  );
  const handleTabChange = useCallback((tab: RewardsTab) => history.push(getRewardsPath(tab)), [history]);

  if (!activeTab) {
    return <RedirectWithQuery to="/rewards" />;
  }

  if (pageData.availability.status === "loading") {
    return <RewardsPageLoadingShell />;
  }

  if (pageData.availability.status === "unsupported-chain") {
    return (
      <RewardsPageLayout>
        <AppCard>
          <div className="mt-12 flex min-h-[220px] flex-col items-center justify-center gap-12 px-20 py-24 text-center">
            <div className="text-h2">
              <Trans>Rewards are available on Arbitrum</Trans>
            </div>
            <div className="text-body-medium max-w-[520px] text-typography-secondary">
              <Trans>Switch to Arbitrum to view incentive tiers, rewards, and the leaderboard.</Trans>
            </div>
          </div>
        </AppCard>
      </RewardsPageLayout>
    );
  }

  if (pageData.availability.status === "inactive") {
    return (
      <RewardsPageLayout>
        <AppCard>
          <div className="mt-12 flex min-h-[220px] flex-col items-center justify-center gap-12 px-20 py-24 text-center">
            <div className="text-h2">
              <Trans>The Rewards program is not currently active</Trans>
            </div>
            <div className="text-body-medium max-w-[520px] text-typography-secondary">
              <Trans>There is no active incentives configuration for Arbitrum.</Trans>
            </div>
            <Button variant="primary" onClick={() => void pageData.retry()}>
              <Trans>Check again</Trans>
            </Button>
          </div>
        </AppCard>
      </RewardsPageLayout>
    );
  }

  if (pageData.availability.status === "error") {
    return (
      <RewardsPageLayout>
        <AppCard>
          <div className="mt-12 flex min-h-[220px] flex-col items-center justify-center gap-12 px-20 py-24 text-center">
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
      </RewardsPageLayout>
    );
  }

  const config = pageData.availability.config;

  return (
    <RewardsPageLayout>
      <div className="mt-12 flex grow flex-col gap-8">
        <div className="overflow-x-auto scrollbar-hide">
          <Tabs options={tabOptions} selectedValue={activeTab} onChange={handleTabChange} type="inline-primary" />
        </div>

        {pageData.availability.isStale ? (
          <div className="text-body-small rounded-8 border-l-2 border-yellow-300 bg-yellow-300/10 p-12">
            <Trans>Rewards configuration could not be refreshed. Showing the latest loaded data.</Trans>
          </div>
        ) : null}
        {pageData.isMixedEpoch ? (
          <div className="text-body-small rounded-8 border-l-2 border-yellow-300 bg-yellow-300/10 p-12">
            <Trans>The new epoch is being indexed. Account totals will update shortly.</Trans>
          </div>
        ) : null}
        {pageData.accountStatusError || pageData.allTimeSummaryError ? (
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
            allTimeSummary={pageData.allTimeSummary}
            statusLoading={pageData.accountStatusLoading}
            summaryLoading={pageData.allTimeSummaryLoading}
            statusUnavailable={Boolean(
              pageData.isMixedEpoch || (pageData.accountStatusError && !pageData.accountStatus)
            )}
            summaryUnavailable={Boolean(pageData.allTimeSummaryError && !pageData.allTimeSummaryLoaded)}
          />
        ) : activeTab === "history" ? (
          <div className="flex flex-col gap-8">
            <RewardsVestingFlow />
            <RewardsHistoryTab chainId={chainId} account={account} config={config} />
          </div>
        ) : (
          <RewardsLeaderboardTab chainId={chainId} account={account} config={config} />
        )}
      </div>
    </RewardsPageLayout>
  );
}
