import { Trans, t } from "@lingui/macro";

import { formatMultiplier } from "domain/synthetics/incentives/constants";
import type { EpochStats, IncentivesConfig, StakingTierId, VolumeTierId } from "domain/synthetics/incentives/types";
import { formatAmount } from "lib/numbers";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { getMaxMultiplierLabel, getPointsExpirationEpochs } from "./incentivesText";
import { TierCardsSection } from "./TierCardsSection";

type Props = {
  multiplier?: number;
  pointsBalance?: bigint;
  config?: IncentivesConfig;
  currentEpochStats?: EpochStats;
  effectiveVolumeTier?: VolumeTierId | null;
  effectiveStakingTier?: StakingTierId | null;
  projectedVolumeTier?: VolumeTierId | null;
  projectedStakingTier?: StakingTierId | null;
};

export function MainDataSection({
  multiplier,
  pointsBalance,
  config,
  currentEpochStats,
  effectiveVolumeTier,
  effectiveStakingTier,
  projectedVolumeTier,
  projectedStakingTier,
}: Props) {
  const displayMultiplier = multiplier !== undefined ? formatMultiplier(multiplier) : "0.0x";
  const displayPoints = pointsBalance ? formatAmount(pointsBalance, 18, 4, true) : "0.0000";
  const maxMultiplierLabel = getMaxMultiplierLabel(config);
  const pointsExpirationEpochs = getPointsExpirationEpochs(config);

  return (
    <div className="flex flex-col gap-8 rounded-8 bg-slate-900 p-12">
      <div className="flex gap-20 p-8">
        <div className="flex flex-col gap-2">
          <span className="text-24 font-medium numbers">{displayMultiplier}</span>
          <div className="flex items-center gap-8">
            <TooltipWithPortal
              variant="iconStroke"
              handleClassName="font-medium text-typography-secondary"
              handle={<Trans>Your Multiplier</Trans>}
              content={t`Your total multiplier is the sum of your Volume Tier, Staking Tier, and Activity Boosts, capped at ${maxMultiplierLabel}. A higher multiplier means more points per dollar of trading fees.`}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-24 font-medium numbers">{displayPoints}</span>
          <div className="flex items-center gap-8">
            <TooltipWithPortal
              variant="iconStroke"
              handleClassName="font-medium text-typography-secondary"
              handle={<Trans>Points Balance</Trans>}
              content={t`Points are earned each epoch based on trading fees and your multiplier. Points are pegged 1:1 to GMX price and expire after ${pointsExpirationEpochs} epochs. Points automatically discount up to 50% of your open/close trading fees.`}
            />
          </div>
        </div>
      </div>

      <TierCardsSection
        config={config}
        currentEpochStats={currentEpochStats}
        effectiveVolumeTier={effectiveVolumeTier}
        effectiveStakingTier={effectiveStakingTier}
        projectedVolumeTier={projectedVolumeTier}
        projectedStakingTier={projectedStakingTier}
      />
    </div>
  );
}
