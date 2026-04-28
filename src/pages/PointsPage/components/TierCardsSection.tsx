import { Trans } from "@lingui/macro";
import cx from "classnames";
import React, { useMemo } from "react";
import { Link } from "react-router-dom";

import { useStakingProcessedData } from "domain/stake/useStakingProcessedData";
import {
  BOOST_LABELS,
  STAKING_TIER_BADGES,
  VOLUME_TIER_BADGES,
  formatMultiplier,
  INCENTIVES_BASE_RATE,
  INCENTIVES_FEE_RATE,
  MULTIPLIER_DECIMALS,
  MAX_FEE_DISCOUNT_PERCENT,
} from "domain/synthetics/incentives/constants";
import type { EpochStats, IncentivesConfig, StakingTierId, VolumeTierId } from "domain/synthetics/incentives/types";
import { formatAmount, formatAmountHuman, bigintToNumber } from "lib/numbers";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import bannerGlowImg from "img/bg_banner_glow.png";
import DatabaseIcon from "img/database.svg?react";
import ArrowRight from "img/ic_arrow_right.svg?react";
import BatterySvg from "img/ic_battery.svg?react";
import BoostSvg from "img/ic_boost.svg?react";
import StatsSvg from "img/ic_stats.svg?react";

import { getBoostDescription } from "./incentivesText";
import { VolumeTierIcon, StakingTierIcon, BoostTierIcon } from "./tierIcons";

type Props = {
  config?: IncentivesConfig;
  currentEpochStats?: EpochStats;
  effectiveVolumeTier?: VolumeTierId | null;
  effectiveStakingTier?: StakingTierId | null;
  projectedVolumeTier?: VolumeTierId | null;
  projectedStakingTier?: StakingTierId | null;
  hideInactive?: boolean;
};

export function TierCardsSection({
  config,
  currentEpochStats,
  effectiveVolumeTier,
  effectiveStakingTier,
  projectedVolumeTier,
  projectedStakingTier,
  hideInactive = false,
}: Props) {
  const volumeActive = Boolean(effectiveVolumeTier ?? currentEpochStats?.volumeTier);
  const stakingActive = Boolean(effectiveStakingTier ?? currentEpochStats?.stakingTier ?? projectedStakingTier);
  const boostsActive = Boolean(currentEpochStats?.boostIds?.length);

  const sortedKeys = useMemo(() => {
    const items = [
      { key: "volume" as const, active: volumeActive },
      { key: "staking" as const, active: stakingActive },
      { key: "boosts" as const, active: boostsActive },
    ];
    return items
      .filter((item) => !hideInactive || item.active)
      .sort((a, b) => (a.active === b.active ? 0 : a.active ? -1 : 1))
      .map((i) => i.key);
  }, [volumeActive, stakingActive, boostsActive, hideInactive]);

  if (sortedKeys.length === 0) {
    return null;
  }

  const cardComponents: Record<string, React.ReactNode> = {
    volume: (
      <VolumeCard
        config={config}
        currentEpochStats={currentEpochStats}
        active={volumeActive}
        effectiveTierId={effectiveVolumeTier}
        projectedTierId={projectedVolumeTier}
      />
    ),
    staking: (
      <StakingCard
        config={config}
        currentEpochStats={currentEpochStats}
        active={stakingActive}
        effectiveTierId={effectiveStakingTier}
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

/**
 * Estimate weekly rewards for a given volume and multiplier based on config values.
 * Returns a rounded USD number suitable for display (e.g. 300).
 */
function estimateWeeklyRewards(volumeUsd: number, rawMultiplier: number, multiplierDecimals: number): number {
  const mult = rawMultiplier / multiplierDecimals;
  const fees = volumeUsd * INCENTIVES_FEE_RATE;
  const maxDiscount = (MAX_FEE_DISCOUNT_PERCENT / 100) * fees;
  const rewards = fees * INCENTIVES_BASE_RATE * (1.0 + mult);
  return Math.round(Math.min(rewards, maxDiscount));
}

function MultiplierBadge({
  currentMultiplier,
  projectedMultiplier,
  tooltipContent,
}: {
  currentMultiplier: number;
  projectedMultiplier?: number;
  tooltipContent?: React.ReactNode;
}) {
  if (projectedMultiplier !== undefined && projectedMultiplier !== currentMultiplier) {
    const isDowngrade = Number(projectedMultiplier) < Number(currentMultiplier);
    const badge = (
      <span className="inline-flex items-center">
        <span className="inline-flex items-center rounded-full border-1/2 border-slate-600 py-2 pl-8 pr-18 text-12 font-medium text-typography-disabled">
          {formatMultiplier(currentMultiplier)} →
        </span>
        <span
          className={cx(
            "-ml-18 rounded-full border-1/2 px-6 py-2 text-12 font-medium",
            isDowngrade ? "border-slate-700 bg-slate-700 text-blue-100" : "border-green-900 bg-green-900 text-green-500"
          )}
        >
          {formatMultiplier(projectedMultiplier)}
        </span>
      </span>
    );

    if (tooltipContent) {
      return <TooltipWithPortal handle={badge} content={tooltipContent} variant="none" />;
    }

    return badge;
  }

  return (
    <span className="inline-flex items-center rounded-full bg-green-900 px-6 py-2 text-12 font-medium text-green-500 numbers">
      {formatMultiplier(currentMultiplier)}
    </span>
  );
}

function MultiplierChangeTooltip({ isDecrease, children }: { isDecrease: boolean; children: React.ReactNode }) {
  return (
    <div className="text-12">
      <span>{children}</span>{" "}
      <span className="text-typography-secondary">
        <Trans>Your multiplier will {isDecrease ? "decrease" : "increase"} next epoch.</Trans>
      </span>
    </div>
  );
}

const BANNER_GLOW_STYLES = { backgroundImage: `url(${bannerGlowImg})`, backgroundSize: "300% 300%" };
function BannerGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-30 transition-[background-position] duration-[2000ms] ease-in-out [background-position:65%_80%] group-hover:[background-position:90%_80%]"
      style={BANNER_GLOW_STYLES}
    />
  );
}

const tierCardBase = "group flex flex-col gap-12 rounded-12 border-1/2 border-slate-600 relative overflow-hidden";
const tierCardBanner = "bg-slate-950 p-16 max-lg:p-12 min-h-[172px]";
const tierCardActive = "bg-slate-950 pt-16 px-16 pb-12";
const tierIconLarge =
  "size-52 shrink-0 rounded-12 border-[0.8px] border-blue-300/60 drop-shadow-[0_4px_8px_rgba(120,133,255,0.9)]";

function VolumeCard({
  config,
  currentEpochStats,
  active,
  effectiveTierId,
  projectedTierId,
}: {
  config?: IncentivesConfig;
  currentEpochStats?: EpochStats;
  active: boolean;
  effectiveTierId?: VolumeTierId | null;
  projectedTierId?: VolumeTierId | null;
}) {
  const volumeTier = effectiveTierId ?? currentEpochStats?.volumeTier;
  const tradedVolume = currentEpochStats?.tradedVolume ?? 0n;
  const tierConfig = config?.volumeTiers;

  const currentTierIndex = tierConfig?.findIndex((t) => t.tier === volumeTier) ?? -1;
  const currentTierConfig = currentTierIndex >= 0 ? tierConfig?.[currentTierIndex] : undefined;
  const nextTierConfig = tierConfig?.[currentTierIndex + 1];
  const isMaxTier = active && currentTierIndex >= 0 && !nextTierConfig;

  const isProjectedDifferent = projectedTierId && projectedTierId !== volumeTier;
  const projectedTierConfig = isProjectedDifferent ? tierConfig?.find((t) => t.tier === projectedTierId) : undefined;

  const isVolumeDowngrade =
    projectedTierConfig && currentTierConfig
      ? Number(projectedTierConfig.multiplier) < Number(currentTierConfig.multiplier)
      : false;

  const volumeTooltip = projectedTierConfig ? (
    <MultiplierChangeTooltip isDecrease={isVolumeDowngrade}>
      {isVolumeDowngrade ? (
        <Trans>Your trading volume this epoch is below the threshold for your current tier.</Trans>
      ) : (
        <Trans>Your trading volume this epoch exceeds the threshold for the next tier.</Trans>
      )}
    </MultiplierChangeTooltip>
  ) : undefined;

  const currentThreshold = active && currentTierConfig ? currentTierConfig.threshold : 0n;
  const nextThreshold = active ? nextTierConfig?.threshold : tierConfig?.[0]?.threshold;
  const range = nextThreshold !== undefined && nextThreshold > currentThreshold ? nextThreshold - currentThreshold : 0n;
  const progressPercent = isMaxTier ? 100 : range > 0n ? Number((tradedVolume * 100n) / range) : 0;
  const progressStyle = useMemo(() => ({ width: `${Math.min(progressPercent, 100)}%` }), [progressPercent]);

  return (
    <div className={cx(tierCardBase, active ? tierCardActive : tierCardBanner)}>
      {!active && <BannerGlow />}
      <div className="flex items-center justify-between font-medium text-typography-secondary">
        {active ? (
          <span>
            <Trans>Volume Tier</Trans>
          </span>
        ) : (
          <div className="flex items-center gap-8">
            <div className="flex size-32 shrink-0 items-center justify-center rounded-8 border-1/2 border-slate-600">
              <StatsSvg className="size-16" />
            </div>
            <span>
              <Trans>Volume Tier</Trans>
            </span>
          </div>
        )}
        {active && currentTierConfig && (
          <span className="inline-flex items-center gap-6">
            {active && projectedTierId === null && (
              <span className="text-12">
                <Trans>Expires next epoch</Trans>
              </span>
            )}
            <MultiplierBadge
              currentMultiplier={currentTierConfig.multiplier}
              projectedMultiplier={projectedTierConfig?.multiplier}
              tooltipContent={volumeTooltip}
            />
          </span>
        )}
      </div>

      {active ? (
        <>
          <h3 className="text-h2 flex items-center gap-12 font-medium text-typography-primary">
            {volumeTier && <VolumeTierIcon tierId={volumeTier} active className={tierIconLarge} />}
            {volumeTier ? VOLUME_TIER_BADGES[volumeTier]() : "—"}
          </h3>
          <div className="flex flex-col gap-2 text-12 text-typography-secondary">
            <div className="flex items-center gap-4 py-2">
              <span>
                <Trans>
                  Volume this epoch:{" "}
                  <span className="text-typography-primary">${formatAmount(tradedVolume, 30, 0, true)}</span>
                </Trans>
              </span>
            </div>
            <div className="relative h-6 overflow-hidden rounded-8 bg-cold-blue-900">
              <div
                className="absolute left-0 top-0 h-full rounded-8 bg-blue-300 transition-[width] duration-300"
                style={progressStyle}
              />
            </div>
            {nextTierConfig && !isMaxTier && (
              <div className="flex items-center gap-4 py-2">
                <span>
                  <Trans>
                    Trade ${formatAmount(nextTierConfig.threshold, 30, 0, true)} to unlock{" "}
                    {VOLUME_TIER_BADGES[nextTierConfig.tier]()} status{" "}
                    <span className="text-typography-primary">+{formatMultiplier(nextTierConfig.multiplier)}</span>
                  </Trans>
                </span>
              </div>
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
    <div className="flex flex-1 flex-col justify-end gap-8">
      <h3 className="text-h3 font-medium text-typography-primary">
        <Trans>Reach {volumeLabel} in trading volume</Trans>
      </h3>
      <div className="flex items-start gap-4 text-12 font-medium text-typography-secondary">
        <Trans>
          Unlock {tierName} status (+{multiplierLabel}) and earn up to ${rewardsEstimate} in additional trading rewards.
        </Trans>
      </div>
      <Link to="/trade" className="flex items-center gap-4 text-12 font-medium text-blue-300">
        <Trans>Start trading</Trans> <ArrowRight />
      </Link>
    </div>
  );
}

function StakingCard({
  config,
  currentEpochStats,
  active,
  effectiveTierId,
  projectedTierId,
}: {
  config?: IncentivesConfig;
  currentEpochStats?: EpochStats;
  active: boolean;
  effectiveTierId?: StakingTierId | null;
  projectedTierId?: StakingTierId | null;
}) {
  const stakingTier = effectiveTierId ?? currentEpochStats?.stakingTier;
  const tierConfig = config?.stakingTiers;
  const { data: stakingData } = useStakingProcessedData();
  const gmxStaked = stakingData?.gmxInStakedGmx;

  const isProjectedOnly = !stakingTier && !!projectedTierId;
  const displayTier = stakingTier ?? projectedTierId;

  const currentTierIndex = tierConfig?.findIndex((t) => t.tier === displayTier) ?? -1;
  const currentTierConfig = currentTierIndex >= 0 ? tierConfig?.[currentTierIndex] : undefined;
  const nextTierConfig = tierConfig?.[currentTierIndex + 1];

  const isProjectedDifferent = !isProjectedOnly && projectedTierId && projectedTierId !== stakingTier;
  const projectedTierConfig = isProjectedDifferent ? tierConfig?.find((t) => t.tier === projectedTierId) : undefined;

  const isStakingDowngrade =
    projectedTierConfig && currentTierConfig
      ? Number(projectedTierConfig.multiplier) < Number(currentTierConfig.multiplier)
      : false;

  const stakingTooltip = projectedTierConfig ? (
    <MultiplierChangeTooltip isDecrease={isStakingDowngrade}>
      {isStakingDowngrade ? (
        <Trans>Your staked GMX is below the threshold for your current tier.</Trans>
      ) : (
        <Trans>You've staked enough GMX to reach a higher tier.</Trans>
      )}
    </MultiplierChangeTooltip>
  ) : undefined;

  return (
    <div className={cx(tierCardBase, active ? tierCardActive : tierCardBanner)}>
      {!active && <BannerGlow />}
      <div className="flex items-center justify-between font-medium text-typography-secondary">
        {active ? (
          <span>
            <Trans>Staking Tier</Trans>
          </span>
        ) : (
          <div className="flex items-center gap-8">
            <div className="flex size-32 shrink-0 items-center justify-center rounded-8 border-1/2 border-slate-600">
              <BatterySvg className="text-purple-500 size-16" />
            </div>
            <span>
              <Trans>Staking Tier</Trans>
            </span>
          </div>
        )}
        {active && currentTierConfig && !isProjectedOnly && (
          <MultiplierBadge
            currentMultiplier={currentTierConfig.multiplier}
            projectedMultiplier={projectedTierConfig?.multiplier}
            tooltipContent={stakingTooltip}
          />
        )}
        {active && currentTierConfig && isProjectedOnly && (
          <span className="inline-flex items-center gap-6">
            <span className="text-12 text-typography-secondary">
              <Trans>Applies next epoch</Trans>
            </span>
            <span className="rounded-full bg-green-900 px-6 py-2 text-12 font-medium text-green-500">
              {formatMultiplier(currentTierConfig.multiplier)}
            </span>
          </span>
        )}
      </div>

      {active ? (
        <>
          <h3 className="text-h2 flex items-center gap-12 font-medium text-typography-primary">
            {displayTier && <StakingTierIcon tierId={displayTier} active className={tierIconLarge} />}
            {displayTier ? STAKING_TIER_BADGES[displayTier]() : "—"}
          </h3>
          <div className="flex flex-col gap-2 text-12 text-typography-secondary">
            <div className="flex items-center justify-between py-2 font-medium">
              <p>
                <Trans>
                  GMX Staked:{" "}
                  <span className="text-typography-primary">
                    {gmxStaked !== undefined ? formatAmount(gmxStaked, 18, 2, true) : "—"}
                  </span>
                </Trans>
              </p>
              <Link to="/earn" className="inline-flex items-center gap-2 text-12 font-medium text-blue-300">
                <Trans>Stake GMX</Trans>
                <DatabaseIcon className="size-12" />
              </Link>
            </div>
            {tierConfig && <StakingProgressBar tiers={tierConfig} currentTier={displayTier} gmxStaked={gmxStaked} />}
            {nextTierConfig && (
              <div className="flex items-center gap-4 py-2">
                <span>
                  <Trans>
                    Stake more GMX to get {STAKING_TIER_BADGES[nextTierConfig.tier]()}{" "}
                    <span className="text-typography-primary">+{formatMultiplier(nextTierConfig.multiplier)}</span>
                  </Trans>
                </span>
              </div>
            )}
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

  const firstVolumeTier = config?.volumeTiers?.[0];
  const estimateVolume = firstVolumeTier ? bigintToNumber(firstVolumeTier.threshold, USD_DECIMALS) : 0;
  const stakingMultiplier = firstTier?.multiplier ?? 0;
  const rewardsEstimate =
    estimateVolume > 0 ? estimateWeeklyRewards(estimateVolume, stakingMultiplier, multiplierDecimals) : 0;

  return (
    <div className="flex flex-1 flex-col justify-end gap-8">
      <h3 className="text-h3 font-medium text-typography-primary">
        <Trans>Stake {stakeLabel} GMX</Trans>
      </h3>
      <div className="flex items-start gap-4 text-12 font-medium text-typography-secondary">
        <Trans>
          Unlock {tierName} status (+{multiplierLabel}) and earn up to ${rewardsEstimate} in additional trading rewards.
        </Trans>
      </div>
      <Link to="/earn" className="flex items-center gap-4 text-12 font-medium text-blue-300">
        <Trans>Stake GMX</Trans>
        <DatabaseIcon className="size-14" />
      </Link>
    </div>
  );
}

function StakingProgressBar({
  tiers,
  currentTier,
  gmxStaked,
}: {
  tiers: IncentivesConfig["stakingTiers"];
  currentTier: StakingTierId | null | undefined;
  gmxStaked: bigint | undefined;
}) {
  const currentIdx = tiers.findIndex((t) => t.tier === currentTier);
  const nextIdx = currentIdx + 1;

  const nextTierProgress = useMemo(() => {
    if (gmxStaked === undefined || nextIdx < 0 || nextIdx >= tiers.length) return 0;
    const prevThreshold = currentIdx >= 0 ? tiers[currentIdx].threshold : 0n;
    const nextThreshold = tiers[nextIdx].threshold;
    const range = nextThreshold - prevThreshold;
    if (range <= 0n) return 0;
    const above = gmxStaked > prevThreshold ? gmxStaked - prevThreshold : 0n;
    return Math.min(Number((above * 100n) / range), 100);
  }, [gmxStaked, tiers, currentIdx, nextIdx]);

  const nextTierProgressStyle = useMemo(() => ({ width: `${nextTierProgress}%` }), [nextTierProgress]);

  return (
    <div className="flex h-6 gap-[3px] rounded-8">
      {tiers.map((tier, i) => {
        const tierTooltipContent = (
          <div>
            <div className="flex items-center justify-between gap-4 font-medium">
              {STAKING_TIER_BADGES[tier.tier]()}{" "}
              <span className="text-green-300">+{formatMultiplier(tier.multiplier)}</span>
            </div>
            <div className="mt-4 text-12 text-typography-secondary">
              <Trans>
                Staked: <span className="text-typography-primary">{formatAmount(gmxStaked, 18, 0, true)}</span>
                <span className="text-11">{" / "}</span>
                <span className="text-typography-primary">{formatAmount(tier.threshold, 18, 0, true)} GMX</span>
              </Trans>
            </div>
          </div>
        );

        if (i === nextIdx && nextTierProgress > 0) {
          return (
            <TooltipWithPortal
              key={tier.tier}
              as="div"
              className="relative flex-1 overflow-hidden rounded-8 bg-cold-blue-900"
              handle={
                <div className="absolute left-0 top-0 h-full rounded-8 bg-blue-300" style={nextTierProgressStyle} />
              }
              content={tierTooltipContent}
              variant="none"
            />
          );
        }

        return (
          <TooltipWithPortal
            key={tier.tier}
            as="div"
            className={cx("flex-1 rounded-8", i <= currentIdx ? "bg-blue-300" : "bg-cold-blue-900")}
            content={tierTooltipContent}
            variant="none"
          />
        );
      })}
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

  const isLifetimeVolumeBoostActive = activeBoostIds.includes("LifetimeTrading");
  const lifetimeVolumeBoost = useMemo(
    () => config?.boosts.find((b) => b.boost === "LifetimeTrading"),
    [config?.boosts]
  );

  return (
    <div
      className={cx(
        tierCardBase,
        "justify-between !p-0 !pb-16 max-lg:!pb-12",
        active ? tierCardActive : tierCardBanner
      )}
    >
      <div className="flex flex-col gap-12 p-16 pb-0">
        {!active && <BannerGlow />}
        <div className="flex items-center justify-between font-medium text-typography-secondary">
          {active ? (
            <div className="flex w-full justify-between">
              <span>
                <Trans>Activity Boost</Trans>
              </span>
              {lifetimeVolumeBoost && isLifetimeVolumeBoostActive && (
                <MultiplierBadge currentMultiplier={lifetimeVolumeBoost.multiplier} />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-8">
              <div className="flex size-32 shrink-0 items-center justify-center rounded-8 border-1/2 border-slate-600">
                <BoostSvg className="size-16" />
              </div>
              <span>
                <Trans>Activity Boost</Trans>
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-20 px-16">
        {active ? (
          <>
            <h3 className="text-h2 flex items-center gap-12 font-medium text-typography-primary">
              <div className="flex size-48 shrink-0 items-center justify-center rounded-12 border-[0.8px] border-blue-300/60 drop-shadow-[0_4px_6px_rgba(120,133,255,0.9)]">
                <BoostSvg className="size-24 text-blue-300" />
              </div>
              {activeBoostIds.length} <Trans>active boosts</Trans>
            </h3>
            <div className="flex flex-wrap gap-12">
              {allBoosts.map((boost) => {
                const isActive = activeBoostIds.includes(boost.boost);
                return (
                  <TooltipWithPortal
                    key={boost.boost}
                    handle={
                      <div
                        className={cx(
                          "flex items-center justify-center rounded-8 border-1/2",
                          isActive ? "border-slate-600 bg-slate-800" : "border-slate-600 bg-slate-900/80 opacity-40"
                        )}
                      >
                        <BoostTierIcon boostId={boost.boost} active={false} className="size-44" />
                      </div>
                    }
                    content={
                      <div>
                        <div className="font-medium">{BOOST_LABELS[boost.boost]()}</div>
                        <div className="mt-4 text-12">+{formatMultiplier(boost.multiplier)}</div>
                        <div className="mt-4 text-12 text-typography-secondary">
                          {getBoostDescription(boost.boost, config)}
                        </div>
                      </div>
                    }
                    variant="none"
                  />
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col justify-between gap-8">
            <h3 className="text-h3 font-medium text-typography-primary">
              <Trans>Complete trading activities</Trans>
            </h3>
            <p className="text-12 font-medium text-typography-secondary">
              <Trans>Unlock boosts and increase your rewards.</Trans>
            </p>
          </div>
        )}
      </div>

      {!active && (
        <div className="overflow-hidden">
          <div className="flex w-max animate-marquee gap-8">
            {[...allBoosts, ...allBoosts].map((boost, i) => (
              <span
                key={`${boost.boost}-${i}`}
                className="flex shrink-0 items-center gap-2 rounded-8 bg-slate-700 py-2 pl-4 pr-12 text-13 font-medium text-typography-secondary"
              >
                <BoostTierIcon boostId={boost.boost} active={false} className="size-26 shrink-0" />
                {BOOST_LABELS[boost.boost]()}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
