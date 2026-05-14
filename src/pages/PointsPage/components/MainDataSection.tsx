import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useMemo } from "react";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";

import { MAX_MULTIPLIER, formatMultiplier } from "domain/synthetics/incentives/constants";
import type { EpochStats, IncentivesConfig, StakingTierId, VolumeTierId } from "domain/synthetics/incentives/types";
import { formatAmount } from "lib/numbers";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";

import { getMaxMultiplierLabel, getPointsExpirationEpochs } from "./incentivesText";
import { TierCardsSection } from "./TierCardsSection";

type Props = {
  isLoading?: boolean;
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
  isLoading = false,
  multiplier,
  pointsBalance,
  config,
  currentEpochStats,
  effectiveVolumeTier,
  effectiveStakingTier,
  projectedVolumeTier,
  projectedStakingTier,
}: Props) {
  const hasMultiplier = multiplier !== undefined && multiplier > 0;
  const displayMultiplier = formatMultiplier(multiplier);
  const displayPoints = pointsBalance ? formatAmount(pointsBalance, 18, 2, true) : "0.00";
  const maxMultiplierLabel = getMaxMultiplierLabel(config);
  const pointsExpirationEpochs = getPointsExpirationEpochs(config);

  const projectedMultiplierInfo = useMemo(() => {
    if (multiplier === undefined || !config) return undefined;
    if (projectedVolumeTier === undefined && projectedStakingTier === undefined) return undefined;

    const findVolumeMult = (tier?: VolumeTierId | null) =>
      Number(config.volumeTiers.find((t) => t.tier === tier)?.multiplier ?? 0);
    const findStakingMult = (tier?: StakingTierId | null) =>
      Number(config.stakingTiers.find((t) => t.tier === tier)?.multiplier ?? 0);

    const currentVolumeMult = findVolumeMult(effectiveVolumeTier);
    const currentStakingMult = findStakingMult(effectiveStakingTier);
    const projectedVolumeMult =
      projectedVolumeTier !== undefined ? findVolumeMult(projectedVolumeTier) : currentVolumeMult;
    const projectedStakingMult =
      projectedStakingTier !== undefined ? findStakingMult(projectedStakingTier) : currentStakingMult;

    const rawProjected =
      Number(multiplier) + (projectedVolumeMult - currentVolumeMult) + (projectedStakingMult - currentStakingMult);
    const cap = config.maxMultiplier ?? MAX_MULTIPLIER;
    const projected = Math.min(rawProjected, cap);

    if (formatMultiplier(projected) === formatMultiplier(multiplier)) return undefined;

    return { value: projected, isIncrease: projected > multiplier };
  }, [multiplier, config, effectiveVolumeTier, effectiveStakingTier, projectedVolumeTier, projectedStakingTier]);

  return (
    <div className="flex flex-col gap-8 rounded-8 bg-slate-900 p-12">
      <SkeletonTheme baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A">
        <div className="flex gap-20 p-8">
          <div className="flex flex-col gap-2">
            {isLoading ? (
              <Skeleton width={88} height={26} inline />
            ) : projectedMultiplierInfo ? (
              <TooltipWithPortal
                handle={
                  <span className="flex items-center gap-8 text-24 font-medium numbers">
                    <span className="flex items-center text-typography-disabled">{displayMultiplier}</span>
                    <ArrowRightIcon
                      className={cx(
                        "size-16 shrink-0",
                        "rounded-full p-2",
                        projectedMultiplierInfo.isIncrease ? "bg-green-900 text-green-300" : "bg-blue-900 text-blue-100"
                      )}
                    />
                    <span className={projectedMultiplierInfo.isIncrease ? "text-green-300" : "text-blue-100"}>
                      {formatMultiplier(projectedMultiplierInfo.value)}
                    </span>
                  </span>
                }
                content={
                  <div className="text-12">
                    <Trans>
                      Your multiplier will {projectedMultiplierInfo.isIncrease ? "increase" : "decrease"} next epoch
                    </Trans>{" "}
                    <span className="text-typography-secondary">
                      <Trans>due to changes in your volume and staking tiers.</Trans>
                    </span>
                  </div>
                }
                variant="none"
              />
            ) : (
              <span className={cx("text-24 font-medium leading-[1.1] numbers", { "text-green-300": hasMultiplier })}>
                {displayMultiplier}
              </span>
            )}
            <div className="flex items-center gap-8">
              <TooltipWithPortal
                variant="iconStroke"
                handleClassName="text-12 font-medium text-typography-secondary"
                handle={<Trans>Your multiplier</Trans>}
                content={t`Your total multiplier is the sum of your Volume Tier, Staking Tier, and Activity Boosts, capped at ${maxMultiplierLabel}. A higher multiplier means more points per dollar of trading fees.`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {isLoading ? (
              <Skeleton width={104} height={26} inline />
            ) : (
              <span className="text-24 font-medium leading-[1.1] numbers">{displayPoints}</span>
            )}
            <div className="flex items-center gap-8">
              <TooltipWithPortal
                variant="iconStroke"
                handleClassName="text-12 font-medium text-typography-secondary"
                handle={<Trans>Points balance</Trans>}
                content={t`Points are earned each epoch based on trading fees and your multiplier. Points are pegged 1:1 to GMX price and expire after ${pointsExpirationEpochs} epochs. Points automatically discount up to 50% of your open/close trading fees.`}
              />
            </div>
          </div>
        </div>
      </SkeletonTheme>

      <TierCardsSection
        isLoading={isLoading}
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
