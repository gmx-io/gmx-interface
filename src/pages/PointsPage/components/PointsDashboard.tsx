import { Trans } from "@lingui/macro";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { useAccountIncentiveStatus } from "domain/synthetics/incentives/useAccountIncentiveStatus";
import { useIncentivesConfig } from "domain/synthetics/incentives/useIncentivesConfig";

import { getCurrentEpochStats } from "./currentEpochStats";
import { HowItWorksSection } from "./HowItWorksSection";
import { MainDataSection } from "./MainDataSection";
import { TierLevelsSection } from "./TierLevelsSection";

type Props = {
  chainId: number;
  account?: string;
};

export function PointsDashboard({ chainId, account }: Props) {
  const { data: config, error: configError, loading: configLoading } = useIncentivesConfig(chainId);
  const { data: status, error: statusError, loading: statusLoading } = useAccountIncentiveStatus(chainId, { account });

  const currentEpochStats = useMemo(() => getCurrentEpochStats({ status, config, account }), [account, config, status]);

  const isLoading = (configLoading && !config) || Boolean(account && statusLoading && !status);
  const hasConfigFailure = Boolean(configError && !config);
  const hasAccountDataFailure = Boolean(account && statusError && !status);

  if (hasConfigFailure) {
    return (
      <>
        <PointsDashboardUnavailableState>
          <Trans>Points dashboard data is temporarily unavailable. Please try again later.</Trans>
        </PointsDashboardUnavailableState>
        <HowItWorksSection />
      </>
    );
  }

  if (hasAccountDataFailure) {
    return (
      <>
        <PointsDashboardUnavailableState>
          <Trans>Your points dashboard data is temporarily unavailable. Please try again later.</Trans>
        </PointsDashboardUnavailableState>

        <TierLevelsSection chainId={chainId} config={config} />

        <HowItWorksSection />
      </>
    );
  }

  return (
    <>
      <MainDataSection
        isLoading={isLoading}
        multiplier={status?.multiplier}
        pointsBalance={status?.pointsBalance}
        config={config}
        currentEpochStats={currentEpochStats}
        effectiveVolumeTier={status?.volumeTier}
        effectiveStakingTier={status?.stakingTier}
        projectedVolumeTier={status?.projectedVolumeTier}
        projectedStakingTier={status?.projectedStakingTier}
      />

      <TierLevelsSection
        chainId={chainId}
        isLoading={isLoading}
        config={config}
        currentEpochStats={currentEpochStats}
        effectiveVolumeTier={status?.volumeTier}
        effectiveStakingTier={status?.stakingTier}
        projectedVolumeTier={status?.projectedVolumeTier}
      />

      <HowItWorksSection />
    </>
  );
}

function PointsDashboardUnavailableState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[156px] items-center justify-center rounded-8 bg-slate-900 p-24 text-center text-typography-secondary">
      {children}
    </div>
  );
}
