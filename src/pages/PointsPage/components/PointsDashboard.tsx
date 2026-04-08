import { useMemo } from "react";

import { useAccountIncentiveDashboard } from "domain/synthetics/incentives/useAccountIncentiveDashboard";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/useAccountIncentiveStatus";
import { useIncentivesConfig } from "domain/synthetics/incentives/useIncentivesConfig";

import { HowItWorksSection } from "./HowItWorksSection";
import { MainDataSection } from "./MainDataSection";
import { PointsBanner } from "./PointsBanner";
import { TierCardsSection } from "./TierCardsSection";
import { TierLevelsSection } from "./TierLevelsSection";

type Props = {
  chainId: number;
  account?: string;
};

export function PointsDashboard({ chainId, account }: Props) {
  const { data: config } = useIncentivesConfig(chainId);
  const { data: dashboard } = useAccountIncentiveDashboard(chainId, { account });
  const { data: status } = useAccountIncentiveStatus(chainId, { account });

  const currentEpochStats = useMemo(() => {
    if (!dashboard?.recentStats?.length) return undefined;
    return dashboard.recentStats.reduce((latest, s) => (s.epochTimestamp > latest.epochTimestamp ? s : latest));
  }, [dashboard?.recentStats]);

  const isActiveUser = Boolean(
    dashboard &&
      (currentEpochStats?.volumeTier || currentEpochStats?.stakingTier || currentEpochStats?.boostIds?.length)
  );

  return (
    <>
      <PointsBanner
        isActiveUser={isActiveUser}
        account={account}
        config={config}
        dashboard={dashboard}
        currentEpochStats={currentEpochStats}
      />

      <MainDataSection
        multiplier={status?.multiplier}
        pointsBalance={dashboard?.pointsBalance ?? status?.pointsBalance}
        account={account}
      />

      <TierCardsSection
        config={config}
        currentEpochStats={currentEpochStats}
        projectedVolumeTier={status?.projectedVolumeTier}
        projectedStakingTier={status?.projectedStakingTier}
      />

      <TierLevelsSection config={config} currentEpochStats={currentEpochStats} />

      <HowItWorksSection />
    </>
  );
}
