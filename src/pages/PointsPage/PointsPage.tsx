import { t, Trans } from "@lingui/macro";
import { useMemo } from "react";
import { Redirect, useLocation } from "react-router-dom";

import { isIncentivesEnabled } from "domain/synthetics/incentives/constants";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import Button from "components/Button/Button";
import { ChainContentHeader } from "components/ChainContentHeader/ChainContentHeader";
import PageTitle from "components/PageTitle/PageTitle";

import { FaqSection } from "./components/FaqSection";
import { PointsDashboard } from "./components/PointsDashboard";
import { PointsLeaderboardTab } from "./components/PointsLeaderboardTab";
import { RewardsHistoryTab } from "./components/RewardsHistoryTab";
import { SidebarRewards } from "./components/SidebarRewards";

export enum PointsTab {
  Dashboard = "dashboard",
  History = "history",
  Leaderboard = "leaderboard",
}

export function PointsPage() {
  const { pathname } = useLocation();
  const { chainId } = useChainId();
  const { account } = useWallet();

  const tabOptions = useMemo(
    () => [
      { value: PointsTab.Dashboard, label: <Trans>Dashboard</Trans> },
      { value: PointsTab.History, label: <Trans>Rewards History</Trans> },
      { value: PointsTab.Leaderboard, label: <Trans>Leaderboard</Trans> },
    ],
    []
  );

  const activeTab = useMemo(() => {
    if (pathname.startsWith("/points/history")) return PointsTab.History;
    if (pathname.startsWith("/points/leaderboard")) return PointsTab.Leaderboard;
    return PointsTab.Dashboard;
  }, [pathname]);

  if (!isIncentivesEnabled(chainId)) {
    return <Redirect to="/trade" />;
  }

  return (
    <AppPageLayout title={t`Points`} header={<ChainContentHeader />}>
      <PageTitle title={t`Points`} subtitle={t`Earn points and save on fees when trading on GMX`} isTop />

      <div className="mt-12 flex grow flex-col gap-8">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-8">
            {tabOptions.map((tab) => (
              <Button
                key={tab.value}
                variant={activeTab === tab.value ? "primary" : "secondary"}
                to={tab.value === PointsTab.Dashboard ? "/points" : `/points/${tab.value}`}
                className="shrink-0"
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_30rem] items-start gap-8 max-lg:grid-cols-1">
          <div className="flex min-w-0 flex-col gap-8">
            {activeTab === PointsTab.Dashboard && <PointsDashboard chainId={chainId} account={account} />}
            {activeTab === PointsTab.History && <RewardsHistoryTab chainId={chainId} account={account} />}
            {activeTab === PointsTab.Leaderboard && <PointsLeaderboardTab chainId={chainId} account={account} />}
          </div>

          <div className="sticky top-8 flex flex-col gap-8 max-lg:static">
            <SidebarRewards chainId={chainId} account={account} />
            <FaqSection />
          </div>
        </div>
      </div>
    </AppPageLayout>
  );
}
