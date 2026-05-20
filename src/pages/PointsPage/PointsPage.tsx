import { t, Trans } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Redirect, useHistory, useLocation } from "react-router-dom";

import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { isIncentivesEnabled } from "domain/synthetics/incentives/constants";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/useAccountIncentiveStatus";
import { useIncentivesConfig } from "domain/synthetics/incentives/useIncentivesConfig";
import { useChainId } from "lib/chains";
import { sendPointsPageViewEvent } from "lib/userAnalytics/pointsEvents";
import useWallet from "lib/wallets/useWallet";
import { BuyGmxModal } from "pages/BuyGMX/BuyGmxModal";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { ChainContentHeader } from "components/ChainContentHeader/ChainContentHeader";
import { GmxStakeModal } from "components/Earn/Portfolio/AssetsList/GmxAssetCard/GmxStakeModal";
import PageTitle from "components/PageTitle/PageTitle";
import Tabs from "components/Tabs/Tabs";

import { getCurrentEpochStats } from "./components/currentEpochStats";
import { FaqSection } from "./components/FaqSection";
import { PointsBanner } from "./components/PointsBanner";
import { PointsDashboard } from "./components/PointsDashboard";
import { PointsLeaderboardTab } from "./components/PointsLeaderboardTab";
import { isPointsRewardsMockEnabled } from "./components/pointsRewardsMock";
import { PointsSidebarRewards } from "./components/PointsSidebarRewards";
import { RewardsHistoryTab } from "./components/RewardsHistoryTab";

export enum PointsTab {
  Dashboard = "dashboard",
  History = "history",
  Leaderboard = "leaderboard",
}

export function PointsPage() {
  const { pathname } = useLocation();
  const history = useHistory();
  const { chainId } = useChainId();
  const { account } = useWallet();
  const isRewardsMockEnabled = isPointsRewardsMockEnabled();
  const [isGmxStakeModalVisible, setIsGmxStakeModalVisible] = useState(false);
  const [isBuyGmxModalVisible, setIsBuyGmxModalVisible] = useState(false);

  const { data: config } = useIncentivesConfig(chainId);
  const { data: status } = useAccountIncentiveStatus(chainId, { account });

  const currentEpochStats = useMemo(() => getCurrentEpochStats({ status, config, account }), [account, config, status]);

  const isActiveUser = Boolean(
    status &&
      (status.volumeTier ||
        currentEpochStats?.volumeTier ||
        status.stakingTier ||
        currentEpochStats?.stakingTier ||
        currentEpochStats?.boostIds?.length)
  );

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

  useEffect(() => {
    sendPointsPageViewEvent(activeTab);
  }, [activeTab]);

  const handleTabChange = useCallback(
    (value: PointsTab) => {
      history.push(value === PointsTab.Dashboard ? "/points" : `/points/${value}`);
    },
    [history]
  );

  const handleOpenGmxStakeModal = useCallback(() => {
    setIsGmxStakeModalVisible(true);
  }, []);

  const handleOpenBuyGmxModal = useCallback(() => {
    setIsBuyGmxModalVisible(true);
  }, []);

  if (!isIncentivesEnabled(chainId) && !isRewardsMockEnabled) {
    return <Redirect to="/trade" />;
  }

  return (
    <AppPageLayout title={t`Points`} header={<ChainContentHeader />}>
      {isGmxStakeModalVisible && (
        <GmxStakeModal isVisible={isGmxStakeModalVisible} setIsVisible={setIsGmxStakeModalVisible} chainId={chainId} />
      )}
      {isBuyGmxModalVisible && (
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="buy">
          <BuyGmxModal isVisible={isBuyGmxModalVisible} setIsVisible={setIsBuyGmxModalVisible} />
        </SyntheticsStateContextProvider>
      )}

      <PageTitle title={t`Points`} subtitle={t`Earn points and save on fees when trading on GMX`} isTop />

      <div className="mt-12 flex grow flex-col gap-8">
        <div className="overflow-x-auto scrollbar-hide">
          <Tabs<PointsTab>
            type="inline-primary"
            options={tabOptions}
            selectedValue={activeTab}
            onChange={handleTabChange}
          />
        </div>

        {activeTab === PointsTab.Dashboard && (
          <div className="hidden flex-col gap-8 max-xl:flex">
            <PointsBanner
              isActiveUser={isActiveUser}
              account={account}
              config={config}
              currentEpochStats={currentEpochStats}
              pointsExpiringThisEpoch={status?.pointsExpiringThisEpoch}
              onStakeGmxClick={handleOpenGmxStakeModal}
            />
            <PointsSidebarRewards chainId={chainId} account={account} isMockMode={isRewardsMockEnabled} />
          </div>
        )}

        <div className="grid grid-cols-[1fr_40rem] items-start gap-8 max-[1480px]:grid-cols-[1fr_30rem] max-xl:grid-cols-1">
          <div className="flex h-full min-w-0 flex-col gap-8">
            {activeTab === PointsTab.Dashboard && (
              <PointsDashboard
                chainId={chainId}
                account={account}
                onStakeGmxClick={handleOpenGmxStakeModal}
                onBuyGmxClick={handleOpenBuyGmxModal}
              />
            )}
            {activeTab === PointsTab.History && (
              <RewardsHistoryTab chainId={chainId} account={account} currentPointsBalance={status?.pointsBalance} />
            )}
            {activeTab === PointsTab.Leaderboard && <PointsLeaderboardTab chainId={chainId} account={account} />}
          </div>

          <div className="sticky top-8 flex flex-col gap-8 max-xl:static">
            <div className="max-xl:hidden">
              <PointsSidebarRewards chainId={chainId} account={account} isMockMode={isRewardsMockEnabled} />
            </div>
            <FaqSection config={config} />
            <div className="max-xl:hidden">
              <PointsBanner
                isActiveUser={isActiveUser}
                account={account}
                config={config}
                currentEpochStats={currentEpochStats}
                pointsExpiringThisEpoch={status?.pointsExpiringThisEpoch}
                onStakeGmxClick={handleOpenGmxStakeModal}
              />
            </div>
          </div>
        </div>
      </div>
    </AppPageLayout>
  );
}
