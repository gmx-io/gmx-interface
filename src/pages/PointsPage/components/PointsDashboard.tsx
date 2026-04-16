import { useMemo } from "react";

import { useAccountIncentiveDashboard } from "domain/synthetics/incentives/useAccountIncentiveDashboard";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/useAccountIncentiveStatus";
import { useIncentivesConfig } from "domain/synthetics/incentives/useIncentivesConfig";

import { HowItWorksSection } from "./HowItWorksSection";
import { MainDataSection } from "./MainDataSection";
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

  return (
    <>
      <MainDataSection
        multiplier={status?.multiplier}
        pointsBalance={dashboard?.pointsBalance ?? status?.pointsBalance}
        config={config}
        currentEpochStats={currentEpochStats}
        effectiveVolumeTier={status?.volumeTier}
        effectiveStakingTier={status?.stakingTier}
        projectedVolumeTier={status?.projectedVolumeTier}
        projectedStakingTier={status?.projectedStakingTier}
      />

      <TierLevelsSection
        chainId={chainId}
        config={config}
        currentEpochStats={currentEpochStats}
        effectiveVolumeTier={status?.volumeTier}
        effectiveStakingTier={status?.stakingTier}
      />

      <HowItWorksSection />
    </>
  );
}
