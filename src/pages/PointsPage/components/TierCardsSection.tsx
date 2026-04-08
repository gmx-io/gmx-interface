import { Trans } from "@lingui/macro";
import cx from "classnames";
import React, { useMemo } from "react";

import {
  BOOST_LABELS,
  BOOST_DESCRIPTIONS,
  STAKING_TIER_BADGES,
  VOLUME_TIER_BADGES,
  formatMultiplier,
  MULTIPLIER_DECIMALS,
  MAX_FEE_DISCOUNT_PERCENT,
} from "domain/synthetics/incentives/constants";
import type {
  BoostId,
  EpochStats,
  IncentivesConfig,
  StakingTierId,
  VolumeTierId,
} from "domain/synthetics/incentives/types";
import { formatAmount, formatAmountHuman, bigintToNumber } from "lib/numbers";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import BoostSvg from "img/ic_boost.svg?react";
import MultiplierSvg from "img/ic_multiplier.svg?react";
import PointsSvg from "img/ic_points.svg?react";
import StakingSvg from "img/ic_staking.svg?react";

type Props = {
  config?: IncentivesConfig;
  currentEpochStats?: EpochStats;
  projectedVolumeTier?: VolumeTierId | null;
  projectedStakingTier?: StakingTierId | null;
};

export function TierCardsSection({ config, currentEpochStats, projectedVolumeTier, projectedStakingTier }: Props) {
  const volumeActive = Boolean(currentEpochStats?.volumeTier);
  const stakingActive = Boolean(currentEpochStats?.stakingTier);
  const boostsActive = Boolean(currentEpochStats?.boostIds?.length);

  const sortedKeys = useMemo(() => {
    const items = [
      { key: "volume" as const, active: volumeActive },
      { key: "staking" as const, active: stakingActive },
      { key: "boosts" as const, active: boostsActive },
    ];
    return items.sort((a, b) => (a.active === b.active ? 0 : a.active ? -1 : 1)).map((i) => i.key);
  }, [volumeActive, stakingActive, boostsActive]);

  const cardComponents: Record<string, React.ReactNode> = {
    volume: (
      <VolumeCard
        config={config}
        currentEpochStats={currentEpochStats}
        active={volumeActive}
        projectedTierId={projectedVolumeTier}
      />
    ),
    staking: (
      <StakingCard
        config={config}
        currentEpochStats={currentEpochStats}
        active={stakingActive}
        projectedTierId={projectedStakingTier}
      />
    ),
    boosts: <BoostsCard config={config} currentEpochStats={currentEpochStats} active={boostsActive} />,
  };

  return (
    <div className="grid grid-cols-3 gap-8 max-lg:grid-cols-1">
      {sortedKeys.map((key) => (
        <React.Fragment key={key}>{cardComponents[key]}</React.Fragment>
      ))}
    </div>
  );
}

const USD_DECIMALS = 30;
const GMX_DECIMALS = 18;
const FEE_RATE = 0.0005;
const BASE_RATE = 0.1;

/**
 * Estimate weekly rewards for a given volume and multiplier based on config values.
 * Returns a rounded USD number suitable for display (e.g. 300).
 */
function estimateWeeklyRewards(volumeUsd: number, rawMultiplier: number, multiplierDecimals: number): number {
  const mult = rawMultiplier / multiplierDecimals;
  const fees = volumeUsd * FEE_RATE;
  const maxDiscount = (MAX_FEE_DISCOUNT_PERCENT / 100) * fees;
  const rewards = fees * BASE_RATE * (1.0 + mult);
  return Math.round(Math.min(rewards, maxDiscount));
}

const tierCardBase = "flex flex-col gap-12 rounded-8 p-16 border-1/2 border-slate-600 relative overflow-hidden";
const tierCardBanner = "bg-gradient-to-br from-slate-950 to-cold-blue-900 hover:border-blue-300";
const tierCardActive = "bg-slate-950";

function VolumeCard({
  config,
  currentEpochStats,
  active,
  projectedTierId,
}: {
  config?: IncentivesConfig;
  currentEpochStats?: EpochStats;
  active: boolean;
  projectedTierId?: VolumeTierId | null;
}) {
  const volumeTier = currentEpochStats?.volumeTier;
  const tradedVolume = currentEpochStats?.tradedVolume ?? 0n;
  const tierConfig = config?.volumeTiers;

  const currentTierIndex = tierConfig?.findIndex((t) => t.tier === volumeTier) ?? -1;
  const currentTierConfig = currentTierIndex >= 0 ? tierConfig?.[currentTierIndex] : undefined;
  const nextTierConfig = tierConfig?.[currentTierIndex + 1] ?? tierConfig?.[0];

  const isProjectedDifferent = projectedTierId && projectedTierId !== volumeTier;

  const targetVolume = active ? nextTierConfig?.threshold : tierConfig?.[0]?.threshold;
  const progressPercent =
    targetVolume !== undefined && targetVolume > 0n ? Number((tradedVolume * 100n) / targetVolume) : 0;
  const progressStyle = useMemo(() => ({ width: `${Math.min(progressPercent, 100)}%` }), [progressPercent]);

  return (
    <div className={cx(tierCardBase, active ? tierCardActive : tierCardBanner)}>
      <div className="text-caption flex items-center gap-8 text-typography-secondary">
        <div className="flex size-32 shrink-0 items-center justify-center rounded-8 bg-blue-500/15 text-blue-500">
          <StakingSvg className="size-16" />
        </div>
        <span>
          <Trans>Volume Tier</Trans>
        </span>
        {active && currentTierConfig && (
          <span className="inline-flex items-center gap-4 rounded-4 bg-blue-300/15 px-6 py-2 text-[1.1rem] font-semibold text-blue-300">
            +{formatMultiplier(currentTierConfig.multiplier)}
          </span>
        )}
        {isProjectedDifferent && (
          <span className="inline-flex items-center gap-4 rounded-4 bg-green-500/15 px-6 py-2 text-[1.1rem] font-medium text-green-500">
            <Trans>Applies next epoch</Trans>
          </span>
        )}
      </div>

      {active ? (
        <>
          <h3 className="text-h2 font-bold text-typography-primary">
            {isProjectedDifferent
              ? VOLUME_TIER_BADGES[projectedTierId]()
              : volumeTier
                ? VOLUME_TIER_BADGES[volumeTier]()
                : "—"}
            {isProjectedDifferent && volumeTier && (
              <span className="text-body-small ml-8 font-normal text-typography-secondary">
                (current: {VOLUME_TIER_BADGES[volumeTier]()})
              </span>
            )}
          </h3>
          <div className="text-body-small flex flex-col gap-4 text-typography-secondary">
            <span>
              <Trans>Volume this epoch:</Trans> ${formatAmount(tradedVolume, 30, 0, true)}
            </span>
            <div className="relative h-4 overflow-hidden rounded-2 bg-slate-700">
              <div
                className="absolute left-0 top-0 h-full rounded-2 bg-blue-300 transition-[width] duration-300"
                style={progressStyle}
              />
            </div>
            {nextTierConfig && (
              <span>
                <Trans>
                  Trade ${formatAmount(nextTierConfig.threshold, 30, 0, true)} to unlock{" "}
                  {VOLUME_TIER_BADGES[nextTierConfig.tier]()} status +{formatMultiplier(nextTierConfig.multiplier)}
                </Trans>
              </span>
            )}
          </div>
        </>
      ) : (
        <VolumeBanner config={config} />
      )}
    </div>
  );
}

function VolumeBanner({ config }: { config?: IncentivesConfig }) {
  const firstTier = config?.volumeTiers?.[0];
  const multiplierDecimals = config?.multiplierDecimals ?? MULTIPLIER_DECIMALS;

  const volumeLabel = firstTier ? formatAmountHuman(firstTier.threshold, USD_DECIMALS, true, 0) : "...";
  const tierName = firstTier ? VOLUME_TIER_BADGES[firstTier.tier]() : "...";
  const multiplierLabel = firstTier ? formatMultiplier(firstTier.multiplier) : "...";
  const rewardsEstimate = firstTier
    ? estimateWeeklyRewards(bigintToNumber(firstTier.threshold, USD_DECIMALS), firstTier.multiplier, multiplierDecimals)
    : 0;

  return (
    <div className="flex flex-1 flex-col justify-between gap-8">
      <h3 className="text-body-large font-semibold text-typography-primary">
        <Trans>Reach {volumeLabel} in trading volume</Trans>
      </h3>
      <p className="text-body-small text-typography-secondary">
        <Trans>
          Unlock {tierName} status (+{multiplierLabel}) and earn up to ${rewardsEstimate} in additional trading rewards.
        </Trans>
      </p>
      <a href="#/trade" className="text-body-small font-medium text-blue-300 hover:text-blue-400">
        <Trans>Start trading →</Trans>
      </a>
    </div>
  );
}

function StakingCard({
  config,
  currentEpochStats,
  active,
  projectedTierId,
}: {
  config?: IncentivesConfig;
  currentEpochStats?: EpochStats;
  active: boolean;
  projectedTierId?: StakingTierId | null;
}) {
  const stakingTier = currentEpochStats?.stakingTier;
  const tierConfig = config?.stakingTiers;

  const currentTierIndex = tierConfig?.findIndex((t) => t.tier === stakingTier) ?? -1;
  const currentTierConfig = currentTierIndex >= 0 ? tierConfig?.[currentTierIndex] : undefined;
  const nextTierConfig = tierConfig?.[currentTierIndex + 1];

  const isProjectedDifferent = projectedTierId && projectedTierId !== stakingTier;

  return (
    <div className={cx(tierCardBase, active ? tierCardActive : tierCardBanner)}>
      <div className="text-caption flex items-center gap-8 text-typography-secondary">
        <div className="bg-purple-500/15 text-purple-500 flex size-32 shrink-0 items-center justify-center rounded-8">
          <PointsSvg className="size-16" />
        </div>
        <span>
          <Trans>Staking Tier</Trans>
        </span>
        {active && currentTierConfig && (
          <span className="inline-flex items-center gap-4 rounded-4 bg-blue-300/15 px-6 py-2 text-[1.1rem] font-semibold text-blue-300">
            +{formatMultiplier(currentTierConfig.multiplier)}
          </span>
        )}
        {isProjectedDifferent && (
          <span className="inline-flex items-center gap-4 rounded-4 bg-green-500/15 px-6 py-2 text-[1.1rem] font-medium text-green-500">
            <Trans>Applies next epoch</Trans>
          </span>
        )}
      </div>

      {active ? (
        <>
          <h3 className="text-h2 font-bold text-typography-primary">
            {isProjectedDifferent
              ? STAKING_TIER_BADGES[projectedTierId]()
              : stakingTier
                ? STAKING_TIER_BADGES[stakingTier]()
                : "—"}
            {isProjectedDifferent && stakingTier && (
              <span className="text-body-small ml-8 font-normal text-typography-secondary">
                (current: {STAKING_TIER_BADGES[stakingTier]()})
              </span>
            )}
          </h3>
          <div className="text-body-small flex flex-col gap-4 text-typography-secondary">
            {tierConfig && <StakingProgressBar tiers={tierConfig} currentTier={stakingTier} />}
            {nextTierConfig && (
              <span>
                <Trans>
                  Stake more GMX to get {STAKING_TIER_BADGES[nextTierConfig.tier]()} +
                  {formatMultiplier(nextTierConfig.multiplier)}
                </Trans>
              </span>
            )}
            <a href="#/earn" className="text-body-small font-medium text-blue-300 hover:text-blue-400">
              <Trans>Stake GMX</Trans>
            </a>
          </div>
        </>
      ) : (
        <StakingBanner config={config} />
      )}
    </div>
  );
}

function StakingBanner({ config }: { config?: IncentivesConfig }) {
  const firstTier = config?.stakingTiers?.[0];
  const multiplierDecimals = config?.multiplierDecimals ?? MULTIPLIER_DECIMALS;

  const stakeLabel = firstTier ? formatAmount(firstTier.threshold, GMX_DECIMALS, 0, true) : "...";
  const tierName = firstTier ? STAKING_TIER_BADGES[firstTier.tier]() : "...";
  const multiplierLabel = firstTier ? formatMultiplier(firstTier.multiplier) : "...";

  // Use the first volume tier threshold for the rewards estimate context (staking alone doesn't generate volume)
  const firstVolumeTier = config?.volumeTiers?.[0];
  const estimateVolume = firstVolumeTier ? bigintToNumber(firstVolumeTier.threshold, USD_DECIMALS) : 0;
  const stakingMultiplier = firstTier?.multiplier ?? 0;
  const rewardsEstimate =
    estimateVolume > 0 ? estimateWeeklyRewards(estimateVolume, stakingMultiplier, multiplierDecimals) : 0;

  return (
    <div className="flex flex-1 flex-col justify-between gap-8">
      <h3 className="text-body-large font-semibold text-typography-primary">
        <Trans>Stake {stakeLabel} GMX</Trans>
      </h3>
      <p className="text-body-small text-typography-secondary">
        <Trans>
          Unlock {tierName} status (+{multiplierLabel}) and earn up to ${rewardsEstimate} in additional trading rewards.
        </Trans>
      </p>
      <a href="#/earn" className="text-body-small font-medium text-blue-300 hover:text-blue-400">
        <Trans>Buy GMX +</Trans>
      </a>
    </div>
  );
}

const PROGRESS_FULL: React.CSSProperties = { width: "100%" };
const PROGRESS_EMPTY: React.CSSProperties = { width: "0%" };

function StakingProgressBar({
  tiers,
  currentTier,
}: {
  tiers: IncentivesConfig["stakingTiers"];
  currentTier: StakingTierId | null | undefined;
}) {
  const currentIdx = tiers.findIndex((t) => t.tier === currentTier);

  return (
    <div className="flex h-4 gap-[2px] overflow-hidden rounded-2">
      {tiers.map((tier, i) => (
        <div key={tier.tier} className="relative flex-1 bg-slate-700 first:rounded-l-2 last:rounded-r-2">
          <div
            className="absolute left-0 top-0 h-full bg-blue-300 transition-[width] duration-300"
            style={i <= currentIdx ? PROGRESS_FULL : PROGRESS_EMPTY}
          />
        </div>
      ))}
    </div>
  );
}

function BoostsCard({
  config,
  currentEpochStats,
  active,
}: {
  config?: IncentivesConfig;
  currentEpochStats?: EpochStats;
  active: boolean;
}) {
  const activeBoostIds = currentEpochStats?.boostIds ?? [];
  const allBoosts = config?.boosts ?? [];

  return (
    <div className={cx(tierCardBase, active ? tierCardActive : tierCardBanner)}>
      <div className="text-caption flex items-center gap-8 text-typography-secondary">
        <div className="flex size-32 shrink-0 items-center justify-center rounded-8 bg-yellow-500/15 text-yellow-500">
          <BoostSvg className="size-16" />
        </div>
        <span>
          <Trans>Activity Boost</Trans>
        </span>
        {active && (
          <span className="inline-flex items-center gap-4 rounded-4 bg-blue-300/15 px-6 py-2 text-[1.1rem] font-semibold text-blue-300">
            +
            {formatMultiplier(
              allBoosts.reduce((sum, b) => (activeBoostIds.includes(b.boost) ? sum + b.multiplier : sum), 0)
            )}
          </span>
        )}
      </div>

      {active ? (
        <>
          <h3 className="text-h2 font-bold text-typography-primary">
            {activeBoostIds.length} <Trans>active boosts</Trans>
          </h3>
          <div className="flex flex-wrap gap-8">
            {allBoosts.map((boost) => {
              const isActive = activeBoostIds.includes(boost.boost);
              return (
                <TooltipWithPortal
                  key={boost.boost}
                  handle={
                    <div
                      className={cx(
                        "flex size-36 items-center justify-center rounded-8 border text-16",
                        isActive ? "border-blue-300 bg-blue-500/15" : "border-slate-600 bg-slate-900 opacity-40"
                      )}
                    >
                      <BoostIcon boostId={boost.boost} />
                    </div>
                  }
                  content={
                    <div>
                      <div className="font-semibold">{BOOST_LABELS[boost.boost]()}</div>
                      <div className="text-body-small mt-4">+{formatMultiplier(boost.multiplier)}</div>
                      <div className="text-body-small mt-4 text-typography-secondary">
                        {BOOST_DESCRIPTIONS[boost.boost]()}
                      </div>
                    </div>
                  }
                />
              );
            })}
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col justify-between gap-8">
          <h3 className="text-body-large font-semibold text-typography-primary">
            <Trans>Complete trading activities</Trans>
          </h3>
          <p className="text-body-small text-typography-secondary">
            <Trans>Unlock activity boosts and increase your rewards.</Trans>
          </p>
          <div className="flex flex-wrap gap-4">
            {allBoosts.map((boost) => (
              <span
                key={boost.boost}
                className="text-caption rounded-4 border-1/2 border-slate-600 px-8 py-4 text-typography-secondary"
              >
                {BOOST_LABELS[boost.boost]()}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BoostIcon({ boostId }: { boostId: BoostId }) {
  switch (boostId) {
    case "FeaturedMarkets":
      return <MultiplierSvg className="size-16" />;
    case "BalancingTrades":
      return <StakingSvg className="size-16" />;
    case "LifetimeTrading":
      return <BoostSvg className="size-16" />;
    default:
      return <BoostSvg className="size-16" />;
  }
}
