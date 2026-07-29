import { plural, t, Trans } from "@lingui/macro";
import cx from "classnames";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import { Link } from "react-router-dom";

import { ES_GMX_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { RewardsPromoSelection } from "domain/synthetics/incentives/v2/rewardsPromo";
import type {
  AccountIncentiveStatus,
  BoostConfig,
  BoostId,
  IncentivesConfig,
  StakingTierId,
} from "domain/synthetics/incentives/v2/types";
import { formatMultiplier } from "domain/synthetics/incentives/v2/utils";
import { formatAmount, formatAmountHuman, formatUsd, USD_DECIMALS } from "lib/numbers";
import { StandaloneBuyGmxModal } from "pages/BuyGMX/BuyGmxModal";

import { EARN_PORTFOLIO_STAKE_GMX_LINK } from "components/Earn/Portfolio/AssetsList/GmxAssetCard/constants";
import { getRewardsPromoCopy } from "components/RewardsPromoBanner/rewardsPromoCopy";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import bannerGlowImg from "img/bg_banner_glow.png";
import ArrowRight from "img/ic_arrow_right.svg?react";
import BatterySvg from "img/ic_battery.svg?react";
import BoostSvg from "img/ic_boost.svg?react";
import GmxIcon from "img/ic_gmx_glyph.svg?react";
import PlusIcon from "img/ic_plus.svg?react";
import StatsSvg from "img/ic_stats.svg?react";

import { BoostTierIcon, ReferralBoostIcon, StakingTierIcon, VolumeTierIcon } from "./RewardsTierIcons";
import {
  type AccountDataState,
  boostLabels,
  BoostDescriptionText,
  getBoostsInDisplayOrder,
  stakingTierLabels,
  volumeTierLabels,
} from "./rewardsTiersShared";

type TierCardKey = "volume" | "staking" | "boosts";

export function RewardsTierCards({
  config,
  status,
  statusState,
  account,
  walletGmx,
  walletGmxState,
  promoSelection,
}: {
  config: IncentivesConfig;
  status?: AccountIncentiveStatus;
  statusState: AccountDataState;
  account?: string;
  walletGmx?: bigint;
  walletGmxState: AccountDataState;
  promoSelection?: RewardsPromoSelection;
}) {
  const [isBuyGmxModalVisible, setIsBuyGmxModalVisible] = useState(false);
  const openBuyGmxModal = useCallback(() => setIsBuyGmxModalVisible(true), []);

  useEffect(() => {
    setIsBuyGmxModalVisible(false);
  }, [account, statusState]);

  if (statusState === "loading") return <TierCardsSkeleton />;
  if (statusState === "unavailable") return <TierCardsUnavailable />;

  const volumeActive = Boolean(status?.volumeTier) || (status?.tierVolume ?? 0n) > 0n;
  const stakingActive = Boolean(status?.stakingTier ?? status?.projectedStakingTier);
  const { activePersistentBoostIds, qualifiedTransientBoostIds } = getBoostStatuses(status);
  const hasReferralBoost = (status?.referralVolume ?? 0n) > 0n;
  const boostsHaveStatus =
    activePersistentBoostIds.length > 0 || qualifiedTransientBoostIds.length > 0 || hasReferralBoost;
  const cards: { key: TierCardKey; active: boolean; content: React.ReactNode }[] = [
    {
      key: "volume",
      active: volumeActive,
      content: <VolumeCard config={config} status={status} active={volumeActive} />,
    },
    {
      key: "staking",
      active: stakingActive,
      content: (
        <StakingCard
          config={config}
          status={status}
          active={stakingActive}
          account={account}
          walletGmx={walletGmx}
          walletGmxState={walletGmxState}
          promoSelection={promoSelection}
          onBuyGmx={openBuyGmxModal}
        />
      ),
    },
    {
      key: "boosts",
      active: boostsHaveStatus,
      content: (
        <BoostsCard
          config={config}
          status={status}
          activePersistentBoostIds={activePersistentBoostIds}
          qualifiedTransientBoostIds={qualifiedTransientBoostIds}
          hasReferralBoost={hasReferralBoost}
          hasStatus={boostsHaveStatus}
        />
      ),
    },
  ];
  const orderedCards = [...cards.filter((card) => card.active), ...cards.filter((card) => !card.active)];

  return (
    <>
      <StandaloneBuyGmxModal isVisible={isBuyGmxModalVisible} setIsVisible={setIsBuyGmxModalVisible} />
      <div className="grid grid-cols-3 gap-12 max-lg:grid-cols-1">
        {orderedCards.map((card) => (
          <React.Fragment key={card.key}>{card.content}</React.Fragment>
        ))}
      </div>
    </>
  );
}

function isTransientBoost(boostId: BoostId) {
  return boostId === "FeaturedMarkets" || boostId === "BalancingTrades";
}

function getBoostStatuses(status?: AccountIncentiveStatus) {
  const boostIds = status?.boostIds ?? [];
  const manualRewardRemainingUsd = status?.manualRewardRemainingUsd ?? 0n;

  return {
    activePersistentBoostIds: boostIds.filter(
      (boostId) => !isTransientBoost(boostId) && (boostId !== "ManualAllocation" || manualRewardRemainingUsd > 0n)
    ),
    qualifiedTransientBoostIds: boostIds.filter(isTransientBoost),
  };
}

function formatCompactUsd(amount: bigint) {
  return formatAmountHuman(amount, USD_DECIMALS, true, 0).replace(/[kmb]$/i, (suffix) => suffix.toUpperCase());
}

function formatWholeGmx(amount: bigint | undefined) {
  if (amount === undefined) return "…";

  return formatAmount(amount / 10n ** BigInt(ES_GMX_DECIMALS), 0, 0, true);
}

function MultiplierBadge({
  config,
  currentMultiplier,
  projectedMultiplier,
  tooltipContent,
}: {
  config: IncentivesConfig;
  currentMultiplier: bigint;
  projectedMultiplier?: bigint;
  tooltipContent?: React.ReactNode;
}) {
  if (projectedMultiplier !== undefined && projectedMultiplier !== currentMultiplier) {
    const badge = (
      <span className="inline-flex items-center">
        <span className="inline-flex items-center rounded-full border-1/2 border-slate-600 py-2 pl-8 pr-18 text-12 font-medium text-typography-disabled">
          {formatMultiplier(currentMultiplier, config.multiplierDecimals)} →
        </span>
        <span
          className={cx(
            "-ml-18 rounded-full border-1/2 px-6 py-2 text-12 font-medium",
            projectedMultiplier < currentMultiplier
              ? "border-slate-700 bg-slate-700 text-blue-100"
              : "border-green-900 bg-green-900 text-green-500"
          )}
        >
          {formatMultiplier(projectedMultiplier, config.multiplierDecimals)}
        </span>
      </span>
    );

    return tooltipContent ? <TooltipWithPortal handle={badge} content={tooltipContent} variant="none" /> : badge;
  }

  return (
    <span className="inline-flex items-center rounded-full bg-green-900 px-6 py-2 text-12 font-medium text-green-500 numbers">
      {formatMultiplier(currentMultiplier, config.multiplierDecimals)}
    </span>
  );
}

function MultiplierChangeTooltip({ isDecrease, children }: { isDecrease: boolean; children: React.ReactNode }) {
  return (
    <div className="text-13">
      <span>{children}</span>{" "}
      <span className="text-typography-secondary">
        {isDecrease ? (
          <Trans>Your multiplier will decrease next epoch.</Trans>
        ) : (
          <Trans>Your multiplier will increase next epoch.</Trans>
        )}
      </span>
    </div>
  );
}

const BANNER_GLOW_STYLES = { backgroundImage: `url(${bannerGlowImg})`, backgroundSize: "250% 250%" };

function BannerGlow({ type }: { type: "top-right" | "bottom-right" | "bottom" }) {
  const classNamesByType = {
    "top-right": "[background-position:65%_90%] group-hover:[background-position:85%_95%]",
    "bottom-right": "[background-position:45%_13%] group-hover:[background-position:65%_13%]",
    bottom: "[background-position:40%_10%] group-hover:[background-position:60%_20%]",
  };

  return (
    <div
      aria-hidden
      className={cx(
        "pointer-events-none absolute inset-0 opacity-30 transition-[background-position] duration-[2000ms] ease-in-out",
        classNamesByType[type]
      )}
      style={BANNER_GLOW_STYLES}
    />
  );
}

const tierCardBase =
  "group relative flex min-h-[172px] flex-col gap-12 overflow-hidden rounded-12 border-1/2 border-slate-600";
const tierCardBanner = "bg-slate-950 p-16 max-lg:p-12";
const tierCardActive = "bg-slate-950 pt-16 px-16 pb-12";
const tierIconLarge =
  "size-48 shrink-0 rounded-12 border-[0.8px] border-rewards-blue-300/60 drop-shadow-[0_4px_8px_rgba(120,133,255,0.9)]";

function VolumeCard({
  config,
  status,
  active,
}: {
  config: IncentivesConfig;
  status?: AccountIncentiveStatus;
  active: boolean;
}) {
  const volumeTier = status?.volumeTier;
  const tierVolume = status?.tierVolume ?? 0n;
  const currentTierIndex = config.volumeTiers.findIndex((tier) => tier.tier === volumeTier);
  const currentTierConfig = currentTierIndex >= 0 ? config.volumeTiers[currentTierIndex] : undefined;
  const projectedTierIndex = config.volumeTiers.findIndex((tier) => tier.tier === status?.projectedVolumeTier);
  const indexedProjectedTierConfig = projectedTierIndex >= 0 ? config.volumeTiers[projectedTierIndex] : undefined;
  const hasQualifiedProjectedUpgrade = Boolean(
    projectedTierIndex > currentTierIndex &&
      indexedProjectedTierConfig &&
      tierVolume >= indexedProjectedTierConfig.threshold
  );
  const effectiveTierIndex = hasQualifiedProjectedUpgrade ? projectedTierIndex : currentTierIndex;
  const nextTierConfig = config.volumeTiers[effectiveTierIndex + 1];
  const isMaxTier = active && effectiveTierIndex >= 0 && !nextTierConfig;
  const projectedTierConfig =
    status?.projectedVolumeTier && status.projectedVolumeTier !== volumeTier ? indexedProjectedTierConfig : undefined;
  const isProjectedDowngrade = Boolean(
    currentTierConfig && projectedTierConfig && projectedTierConfig.multiplier < currentTierConfig.multiplier
  );
  const isPreserveMode =
    active && Boolean(currentTierConfig) && (status?.projectedVolumeTier === null || isProjectedDowngrade);
  const showMaxTierState = isMaxTier && !isPreserveMode;
  const targetTierConfig = isPreserveMode ? currentTierConfig : nextTierConfig;
  const targetThreshold = targetTierConfig?.threshold;
  const remainingToTarget =
    targetThreshold !== undefined && targetThreshold > tierVolume ? targetThreshold - tierVolume : 0n;
  const progressPercent = showMaxTierState
    ? 100
    : targetThreshold !== undefined && targetThreshold > 0n
      ? Number((tierVolume * 100n) / targetThreshold)
      : 0;
  const progressStyle = useMemo(() => ({ width: `${Math.min(progressPercent, 100)}%` }), [progressPercent]);
  const volumeTooltip = projectedTierConfig ? (
    <MultiplierChangeTooltip isDecrease={isProjectedDowngrade}>
      {isProjectedDowngrade ? (
        <Trans>Your trading volume this epoch is below the threshold for your current tier.</Trans>
      ) : (
        <Trans>Your trading volume this epoch exceeds the threshold for the next tier.</Trans>
      )}
    </MultiplierChangeTooltip>
  ) : undefined;
  const progressTooltipContent =
    active && targetTierConfig && targetThreshold !== undefined ? (
      <div className="text-13">
        {isPreserveMode ? (
          <Trans>
            <span className="text-typography-primary">{formatCompactUsd(tierVolume)}</span>
            <span className="text-typography-secondary">/</span>
            <span className="text-typography-primary">{formatCompactUsd(targetThreshold)}</span>{" "}
            <span className="text-typography-secondary">
              to keep {volumeTierLabels[targetTierConfig.tier]} status{" "}
              <span className="text-typography-primary">
                +{formatMultiplier(targetTierConfig.multiplier, config.multiplierDecimals)}
              </span>
            </span>
          </Trans>
        ) : (
          <Trans>
            <span className="text-typography-primary">{formatCompactUsd(tierVolume)}</span>
            <span className="text-typography-secondary">/</span>
            <span className="text-typography-primary">{formatCompactUsd(targetThreshold)}</span>{" "}
            <span className="text-typography-secondary">
              to get {volumeTierLabels[targetTierConfig.tier]} status{" "}
              <span className="text-typography-primary">
                +{formatMultiplier(targetTierConfig.multiplier, config.multiplierDecimals)}
              </span>
            </span>
          </Trans>
        )}
      </div>
    ) : null;

  return (
    <div className={cx(tierCardBase, active ? tierCardActive : tierCardBanner)}>
      {!active && <BannerGlow type="top-right" />}
      <div className="flex items-center justify-between font-medium text-typography-secondary">
        {active ? (
          <Trans>Volume Tier</Trans>
        ) : (
          <div className="flex items-center gap-8">
            <div className="flex size-32 shrink-0 items-center justify-center rounded-8 border-1/2 border-slate-600">
              <StatsSvg className="size-16" />
            </div>
            <Trans>Volume Tier</Trans>
          </div>
        )}
        {active && (currentTierConfig || projectedTierConfig) ? (
          <span className="inline-flex items-center gap-6">
            {status?.projectedVolumeTier === null ? (
              <span className="text-12">
                <Trans>Expires next epoch</Trans>
              </span>
            ) : null}
            <MultiplierBadge
              config={config}
              currentMultiplier={currentTierConfig?.multiplier ?? 0n}
              projectedMultiplier={projectedTierConfig?.multiplier}
              tooltipContent={volumeTooltip}
            />
          </span>
        ) : null}
      </div>

      {active ? (
        <>
          <h3 className="text-h2 flex items-center gap-12 font-medium text-typography-primary">
            {volumeTier ? <VolumeTierIcon tierId={volumeTier} active className={tierIconLarge} /> : null}
            {volumeTier ? volumeTierLabels[volumeTier] : "—"}
          </h3>
          <div className="mt-auto flex flex-col gap-2 text-13 text-typography-secondary">
            <div className="flex items-center gap-4 py-2">
              <Trans>
                Volume this epoch: <span className="text-typography-primary">{formatCompactUsd(tierVolume)}</span>
              </Trans>
            </div>
            {progressTooltipContent ? (
              <TooltipWithPortal
                as="div"
                className="group/volume-bar -my-5 flex items-center py-5"
                handle={
                  <button
                    type="button"
                    aria-label={t`Volume Tier`}
                    className="relative h-6 w-full overflow-hidden rounded-8 bg-cold-blue-900 transition-[background-color,transform] duration-150 ease-out group-focus-within/volume-bar:scale-y-150 group-focus-within/volume-bar:bg-cold-blue-700 group-hover/volume-bar:scale-y-150 group-hover/volume-bar:bg-cold-blue-700"
                  >
                    <div
                      className="absolute left-0 top-0 h-full rounded-8 bg-rewards-blue-300 transition-[background-color,width] duration-300 ease-out"
                      style={progressStyle}
                    />
                  </button>
                }
                content={progressTooltipContent}
                variant="none"
              />
            ) : (
              <div className="relative -my-5 h-6 overflow-hidden rounded-8 bg-cold-blue-900">
                <div
                  className={cx(
                    "absolute left-0 top-0 h-full rounded-8 transition-[width] duration-300",
                    showMaxTierState ? "bg-green-300" : "bg-rewards-blue-300"
                  )}
                  style={progressStyle}
                />
              </div>
            )}
            {showMaxTierState ? (
              <div className="flex items-center gap-4 py-2 text-green-500">
                <Trans>Max tier reached ✓</Trans>
              </div>
            ) : targetTierConfig ? (
              <div className="py-2">
                {isPreserveMode ? (
                  <Trans>
                    Trade {formatCompactUsd(remainingToTarget)} more to keep {volumeTierLabels[targetTierConfig.tier]}{" "}
                    status{" "}
                    <span className="text-typography-primary">
                      +{formatMultiplier(targetTierConfig.multiplier, config.multiplierDecimals)}
                    </span>
                  </Trans>
                ) : (
                  <Trans>
                    Trade {formatCompactUsd(remainingToTarget)} more to unlock {volumeTierLabels[targetTierConfig.tier]}{" "}
                    status{" "}
                    <span className="text-typography-primary">
                      +{formatMultiplier(targetTierConfig.multiplier, config.multiplierDecimals)}
                    </span>
                  </Trans>
                )}
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col justify-end gap-8">
          <h3 className="text-h3 font-medium text-typography-primary">
            <Trans>Trade More. Earn More.</Trans>
          </h3>
          <div className="flex items-start gap-4 text-13 font-medium text-typography-secondary">
            <Trans>Trade more to reach a higher tier and earn more rewards.</Trans>
          </div>
          <Link to="/trade" className="flex items-center gap-4 text-13 font-medium text-rewards-blue-300">
            <Trans>Start trading</Trans> <ArrowRight />
          </Link>
        </div>
      )}
    </div>
  );
}

function StakingCard({
  config,
  status,
  active,
  account,
  walletGmx,
  walletGmxState,
  promoSelection,
  onBuyGmx,
}: {
  config: IncentivesConfig;
  status?: AccountIncentiveStatus;
  active: boolean;
  account?: string;
  walletGmx?: bigint;
  walletGmxState: AccountDataState;
  promoSelection?: RewardsPromoSelection;
  onBuyGmx: () => void;
}) {
  const stakingTier = status?.stakingTier;
  const displayTier = stakingTier ?? status?.projectedStakingTier;
  const isProjectedOnly = !stakingTier && Boolean(status?.projectedStakingTier);
  const displayTierIndex = config.stakingTiers.findIndex((tier) => tier.tier === displayTier);
  const displayTierConfig = displayTierIndex >= 0 ? config.stakingTiers[displayTierIndex] : undefined;
  const projectedTierConfig =
    !isProjectedOnly && status?.projectedStakingTier && status.projectedStakingTier !== stakingTier
      ? config.stakingTiers.find((tier) => tier.tier === status.projectedStakingTier)
      : undefined;
  const gmxStaked = status?.currentStakedBalance;
  const nextTierIndex =
    gmxStaked === undefined
      ? displayTierIndex + 1
      : config.stakingTiers.findIndex((tier) => tier.threshold > gmxStaked);
  const nextTierConfig = nextTierIndex >= 0 ? config.stakingTiers[nextTierIndex] : undefined;
  const requiredToNextTier =
    nextTierConfig && gmxStaked !== undefined && gmxStaked < nextTierConfig.threshold
      ? nextTierConfig.threshold - gmxStaked
      : 0n;
  const isMaxTier = active && displayTierIndex >= 0 && !nextTierConfig;
  const shouldStakeGmx = walletGmxState !== "ready" || (walletGmx ?? 0n) > 0n;
  const stakingTooltip = projectedTierConfig ? (
    <MultiplierChangeTooltip
      isDecrease={Boolean(displayTierConfig && projectedTierConfig.multiplier < displayTierConfig.multiplier)}
    >
      {displayTierConfig && projectedTierConfig.multiplier < displayTierConfig.multiplier ? (
        <Trans>Your combined staked balance is below the threshold for your current tier.</Trans>
      ) : (
        <Trans>Your combined staked balance is high enough to reach a higher tier.</Trans>
      )}
    </MultiplierChangeTooltip>
  ) : undefined;

  return (
    <div className={cx(tierCardBase, active ? tierCardActive : tierCardBanner)}>
      {!active && <BannerGlow type="bottom-right" />}
      <div className="flex items-center justify-between font-medium text-typography-secondary">
        {active ? (
          <Trans>Staking Tier</Trans>
        ) : (
          <div className="flex items-center gap-8">
            <div className="flex size-32 shrink-0 items-center justify-center rounded-8 border-1/2 border-slate-600">
              <BatterySvg className="text-purple-500 size-16" />
            </div>
            <Trans>Staking Tier</Trans>
          </div>
        )}
        {active && displayTierConfig ? (
          isProjectedOnly ? (
            <span className="inline-flex items-center gap-6">
              <span className="text-12 text-typography-secondary">
                <Trans>Applies next epoch</Trans>
              </span>
              <span className="rounded-full bg-green-900 px-6 py-2 text-12 font-medium text-green-500">
                {formatMultiplier(displayTierConfig.multiplier, config.multiplierDecimals)}
              </span>
            </span>
          ) : (
            <MultiplierBadge
              config={config}
              currentMultiplier={displayTierConfig.multiplier}
              projectedMultiplier={projectedTierConfig?.multiplier}
              tooltipContent={stakingTooltip}
            />
          )
        ) : null}
      </div>

      {active && displayTier ? (
        <>
          <h3 className="text-h2 flex items-center gap-12 font-medium text-typography-primary">
            <StakingTierIcon tierId={displayTier} active className={tierIconLarge} />
            {stakingTierLabels[displayTier]}
          </h3>
          <div className="mt-auto flex flex-col gap-2 text-13 text-typography-secondary">
            <div className="flex items-center justify-between py-2 font-medium">
              <Trans>
                GMX staked:{" "}
                <span className="text-typography-primary">
                  {gmxStaked === undefined ? "—" : formatWholeGmx(gmxStaked)}
                </span>
              </Trans>
              {requiredToNextTier > 0n ? (
                shouldStakeGmx ? (
                  <Link
                    to={EARN_PORTFOLIO_STAKE_GMX_LINK}
                    className="inline-flex items-center gap-2 text-13 font-medium text-rewards-blue-300"
                  >
                    <Trans>Stake GMX</Trans>
                    <GmxIcon className="size-12" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={onBuyGmx}
                    className="inline-flex items-center gap-2 text-13 font-medium text-rewards-blue-300"
                  >
                    <Trans>Buy GMX</Trans>
                    <PlusIcon className="size-12" />
                  </button>
                )
              ) : null}
            </div>
            <StakingProgressBar
              config={config}
              fallbackTier={displayTier}
              gmxStaked={gmxStaked}
              isMaxTier={isMaxTier}
            />
            {isMaxTier ? (
              <div className="flex items-center gap-4 py-2 text-green-500">
                <Trans>Max tier reached ✓</Trans>
              </div>
            ) : nextTierConfig && requiredToNextTier > 0n ? (
              <div className="py-2">
                <Trans>
                  Stake {formatAmount(requiredToNextTier, ES_GMX_DECIMALS, 2, true, { trimTrailingZeros: true })} GMX
                  more to get {stakingTierLabels[nextTierConfig.tier]} status{" "}
                  <span className="text-typography-primary">
                    +{formatMultiplier(nextTierConfig.multiplier, config.multiplierDecimals)}
                  </span>
                </Trans>
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <InactiveStakingCardContent
          account={account}
          walletGmx={walletGmx}
          walletGmxState={walletGmxState}
          promoSelection={promoSelection}
          onBuyGmx={onBuyGmx}
        />
      )}
    </div>
  );
}

function InactiveStakingCardContent({
  account,
  walletGmx,
  walletGmxState,
  promoSelection,
  onBuyGmx,
}: {
  account?: string;
  walletGmx?: bigint;
  walletGmxState: AccountDataState;
  promoSelection?: RewardsPromoSelection;
  onBuyGmx: () => void;
}) {
  if (!promoSelection) {
    return (
      <SkeletonTheme baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A">
        <div className="flex flex-1 flex-col justify-end gap-8">
          <Skeleton width="55%" height={24} />
          <Skeleton width="90%" height={14} />
          <Skeleton width={88} height={16} />
        </div>
      </SkeletonTheme>
    );
  }

  const hasWalletGmx = (walletGmx ?? 0n) > 0n;
  const showStaticCopy = !account;
  const isWalletBalanceLoading = Boolean(account && walletGmxState === "loading");
  const isWalletBalanceUnavailable = Boolean(account && walletGmxState === "unavailable");
  const shouldStakeGmx = hasWalletGmx || isWalletBalanceUnavailable;
  const promoCopy = getRewardsPromoCopy(promoSelection);

  return (
    <div className="flex flex-1 flex-col justify-end gap-8">
      <h3 className="text-h3 font-medium text-typography-primary">
        {showStaticCopy ? <Trans>Stake to Boost Rewards</Trans> : promoCopy.title}
      </h3>
      <div className="text-13 font-medium text-typography-secondary">
        <Trans>Stake more GMX to increase your tier and earn more rewards.</Trans>
      </div>
      {isWalletBalanceLoading ? (
        <SkeletonTheme baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A">
          <Skeleton width={88} height={16} />
        </SkeletonTheme>
      ) : shouldStakeGmx ? (
        <Link
          to={EARN_PORTFOLIO_STAKE_GMX_LINK}
          className="flex items-center gap-4 text-13 font-medium text-rewards-blue-300"
        >
          <Trans>Stake GMX</Trans>
          <GmxIcon className="size-16" />
        </Link>
      ) : (
        <button
          type="button"
          onClick={onBuyGmx}
          className="flex items-center gap-4 text-13 font-medium text-rewards-blue-300"
        >
          <Trans>Buy GMX</Trans>
          <PlusIcon className="size-16" />
        </button>
      )}
    </div>
  );
}

function StakingProgressBar({
  config,
  fallbackTier,
  gmxStaked,
  isMaxTier,
}: {
  config: IncentivesConfig;
  fallbackTier: StakingTierId;
  gmxStaked?: bigint;
  isMaxTier: boolean;
}) {
  const fallbackTierIndex = config.stakingTiers.findIndex((tier) => tier.tier === fallbackTier);
  const nextIndex =
    gmxStaked === undefined
      ? fallbackTierIndex + 1
      : config.stakingTiers.findIndex((tier) => tier.threshold > gmxStaked);
  const completedTierCount = nextIndex < 0 ? config.stakingTiers.length : nextIndex;
  const nextTierProgress = useMemo(() => {
    if (gmxStaked === undefined || nextIndex < 0 || nextIndex >= config.stakingTiers.length) return 0;

    const previousThreshold = nextIndex > 0 ? config.stakingTiers[nextIndex - 1].threshold : 0n;
    const nextThreshold = config.stakingTiers[nextIndex].threshold;
    const range = nextThreshold - previousThreshold;
    if (range <= 0n) return 0;

    const abovePrevious = gmxStaked > previousThreshold ? gmxStaked - previousThreshold : 0n;
    return Math.min(Number((abovePrevious * 100n) / range), 100);
  }, [config.stakingTiers, gmxStaked, nextIndex]);
  const nextTierProgressStyle = useMemo(() => ({ width: `${nextTierProgress}%` }), [nextTierProgress]);

  return (
    <div className="-my-5 flex h-16 gap-[3px] rounded-8" role="group" aria-label={t`Staking tiers`}>
      <span
        className="sr-only"
        role="progressbar"
        aria-label={t`Staking tier levels`}
        aria-valuemin={0}
        aria-valuemax={config.stakingTiers.length}
        aria-valuenow={completedTierCount}
      />
      {config.stakingTiers.map((tier, index) => {
        const completed = index < completedTierCount;
        const nextWithProgress = index === nextIndex && nextTierProgress > 0;
        const tooltipContent = (
          <div>
            <div className="flex items-center justify-between gap-4 font-medium">
              {stakingTierLabels[tier.tier]}{" "}
              <span className="text-green-300">+{formatMultiplier(tier.multiplier, config.multiplierDecimals)}</span>
            </div>
            <div className="mt-4 text-13 text-typography-secondary">
              <Trans>
                Staked: <span className="text-typography-primary">{formatWholeGmx(gmxStaked)}</span>
                <span className="text-11"> / </span>
                <span className="text-typography-primary">{formatWholeGmx(tier.threshold)} GMX</span>
              </Trans>
            </div>
          </div>
        );

        return (
          <TooltipWithPortal
            key={tier.tier}
            as="div"
            className="group/segment flex flex-1 items-center py-5"
            handle={
              nextWithProgress ? (
                <button
                  type="button"
                  className="relative h-6 w-full overflow-hidden rounded-8 bg-cold-blue-900 transition-[background-color,transform] duration-150 ease-out group-focus-within/segment:scale-y-150 group-focus-within/segment:bg-cold-blue-700 group-hover/segment:scale-y-150 group-hover/segment:bg-cold-blue-700"
                >
                  <div
                    className="absolute left-0 top-0 h-full rounded-8 bg-rewards-blue-300"
                    style={nextTierProgressStyle}
                  />
                  <span className="sr-only">
                    {stakingTierLabels[tier.tier]} <Trans>Staking tier</Trans>
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  className={cx(
                    "h-6 w-full rounded-8 transition-[background-color,transform] duration-150 ease-out group-focus-within/segment:scale-x-105 group-focus-within/segment:scale-y-150 group-hover/segment:scale-x-105 group-hover/segment:scale-y-150",
                    completed
                      ? isMaxTier
                        ? "bg-green-300"
                        : "bg-rewards-blue-300"
                      : "bg-cold-blue-900 group-focus-within/segment:bg-cold-blue-700 group-hover/segment:bg-cold-blue-700"
                  )}
                >
                  <span className="sr-only">
                    {stakingTierLabels[tier.tier]} <Trans>Staking tier</Trans>
                  </span>
                </button>
              )
            }
            content={tooltipContent}
            variant="none"
          />
        );
      })}
    </div>
  );
}

function getBoostDescription(boost: BoostConfig, config: IncentivesConfig) {
  if (boost.boost !== "ManualAllocation") {
    return <BoostDescriptionText boost={boost} config={config} />;
  }

  return <Trans>Available to eligible historical users while their return bonus cap remains.</Trans>;
}

type BoostDisplayItem =
  | {
      type: "multiplier";
      key: BoostId;
      boost: BoostConfig;
      isActivePersistent: boolean;
      isQualifiedThisEpoch: boolean;
      isHighlighted: boolean;
    }
  | {
      type: "referral";
      key: "ReferralBoost";
      isHighlighted: boolean;
    };

function BoostsCard({
  config,
  status,
  activePersistentBoostIds,
  qualifiedTransientBoostIds,
  hasReferralBoost,
  hasStatus,
}: {
  config: IncentivesConfig;
  status?: AccountIncentiveStatus;
  activePersistentBoostIds: BoostId[];
  qualifiedTransientBoostIds: BoostId[];
  hasReferralBoost: boolean;
  hasStatus: boolean;
}) {
  const persistentBoostAdjustment = config.boosts.reduce(
    (total, boost) => (activePersistentBoostIds.includes(boost.boost) ? total + boost.multiplier : total),
    0n
  );
  const activeBoostCount = activePersistentBoostIds.length + (hasReferralBoost ? 1 : 0);
  const includeReturnBonus = Boolean(status?.boostIds.includes("ManualAllocation"));
  const orderedBoosts = getBoostsInDisplayOrder(config.boosts, includeReturnBonus);
  const createMultiplierDisplayItem = (boost: BoostConfig): BoostDisplayItem => {
    const isActivePersistent = activePersistentBoostIds.includes(boost.boost);
    const isQualifiedThisEpoch = qualifiedTransientBoostIds.includes(boost.boost);

    return {
      type: "multiplier" as const,
      key: boost.boost,
      boost,
      isActivePersistent,
      isQualifiedThisEpoch,
      isHighlighted: isActivePersistent || isQualifiedThisEpoch,
    };
  };
  const boostDisplayItems: BoostDisplayItem[] = [
    ...orderedBoosts.filter((boost) => boost.boost === "ManualAllocation").map(createMultiplierDisplayItem),
    {
      type: "referral" as const,
      key: "ReferralBoost" as const,
      isHighlighted: hasReferralBoost,
    },
    ...orderedBoosts.filter((boost) => boost.boost !== "ManualAllocation").map(createMultiplierDisplayItem),
  ];

  return (
    <div
      className={cx(
        tierCardBase,
        "!p-0 !pb-16 max-lg:!pb-12",
        !hasStatus && "justify-between",
        hasStatus ? tierCardActive : tierCardBanner
      )}
    >
      <div className="flex flex-col gap-12 p-16 pb-0">
        {!hasStatus && <BannerGlow type="bottom" />}
        <div className="flex items-center justify-between font-medium text-typography-secondary">
          {hasStatus ? (
            <div className="flex w-full justify-between">
              <Trans>Activity Boost</Trans>
              {persistentBoostAdjustment > 0n ? (
                <MultiplierBadge config={config} currentMultiplier={persistentBoostAdjustment} />
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-8">
              <div className="flex size-32 shrink-0 items-center justify-center rounded-8 border-1/2 border-slate-600">
                <BoostSvg className="size-16" />
              </div>
              <Trans>Activity Boost</Trans>
            </div>
          )}
        </div>
      </div>
      <div className={cx("flex flex-col gap-20 px-16", hasStatus && "flex-1")}>
        {hasStatus ? (
          <>
            <h3 className="text-h2 flex items-center gap-12 font-medium text-typography-primary">
              <div className="flex size-48 shrink-0 items-center justify-center rounded-12 border-[0.8px] border-rewards-blue-300/60 drop-shadow-[0_4px_6px_rgba(120,133,255,0.9)]">
                <BoostSvg className="size-24 text-rewards-blue-300" />
              </div>
              <span className="flex flex-col">
                {activeBoostCount > 0 ? (
                  <span>{plural(activeBoostCount, { one: "# active boost", other: "# active boosts" })}</span>
                ) : (
                  <Trans>Trading activities</Trans>
                )}
              </span>
            </h3>
            <div className="mt-auto flex flex-nowrap gap-12">
              {boostDisplayItems.map((item) => {
                if (item.type === "referral") {
                  return (
                    <TooltipWithPortal
                      key={item.key}
                      as="button"
                      type="button"
                      aria-label={t`Referral Bonus`}
                      className="aspect-square min-w-0 max-w-44 flex-1 basis-44 rounded-8 p-0"
                      handle={
                        <div
                          className={cx(
                            "flex size-full items-center justify-center rounded-8 border-1/2",
                            item.isHighlighted
                              ? "border-slate-600 bg-slate-800"
                              : "border-slate-600 bg-slate-900/80 opacity-40"
                          )}
                        >
                          <ReferralBoostIcon active={item.isHighlighted} className="size-[45.4545%]" variant="glyph" />
                        </div>
                      }
                      content={
                        <div>
                          <div className="font-medium">
                            <Trans>Referral Bonus</Trans>
                          </div>
                          <div className="mt-4 text-13 text-typography-secondary">
                            <Trans>Receive 50% of the rewards earned by every trader you invite.</Trans>
                          </div>
                          <Link
                            to="/referrals/affiliates"
                            className="mt-4 inline-flex items-center gap-4 text-13 font-medium text-rewards-blue-300"
                          >
                            <Trans>Invite traders</Trans> <ArrowRight />
                          </Link>
                          {item.isHighlighted ? (
                            <div className="mt-4 text-13 text-green-500">
                              <Trans>Active</Trans>
                            </div>
                          ) : null}
                        </div>
                      }
                      variant="none"
                    />
                  );
                }

                const { boost, isActivePersistent, isQualifiedThisEpoch, isHighlighted } = item;
                const accessibleBoostLabel =
                  boost.boost === "FeaturedMarkets"
                    ? t`Featured Markets`
                    : boost.boost === "BalancingTrades"
                      ? t`Balancing Trades`
                      : boost.boost === "LifetimeTrading"
                        ? t`Lifetime Volume`
                        : t`Return Bonus`;

                return (
                  <TooltipWithPortal
                    key={boost.boost}
                    as="button"
                    type="button"
                    aria-label={accessibleBoostLabel}
                    className="aspect-square min-w-0 max-w-44 flex-1 basis-44 rounded-8 p-0"
                    handle={
                      <div
                        className={cx(
                          "flex size-full items-center justify-center rounded-8 border-1/2",
                          isHighlighted
                            ? "border-slate-600 bg-slate-800"
                            : "border-slate-600 bg-slate-900/80 opacity-40"
                        )}
                      >
                        <BoostTierIcon boostId={boost.boost} active={false} className="size-full" />
                      </div>
                    }
                    content={
                      <div>
                        <div className="font-medium">{boostLabels[boost.boost]}</div>
                        <div className="mt-4 text-13">
                          +{formatMultiplier(boost.multiplier, config.multiplierDecimals)}
                        </div>
                        {isActivePersistent ? (
                          <div className="mt-4 text-13 text-green-500">
                            <Trans>Active</Trans>
                          </div>
                        ) : isQualifiedThisEpoch ? (
                          <div className="mt-4 text-13 text-rewards-blue-300">
                            <Trans>Qualified this epoch</Trans>
                          </div>
                        ) : null}
                        <div className="mt-4 text-13 text-typography-secondary">
                          {getBoostDescription(boost, config)}
                        </div>
                        {boost.boost === "ManualAllocation" &&
                        status?.manualRewardCapUsd !== undefined &&
                        status.manualRewardCapUsd > 0n ? (
                          <div className="mt-4 text-13 text-typography-secondary">
                            <Trans>
                              Remaining: {formatUsd(status.manualRewardRemainingUsd, { fallbackToZero: true })} of{" "}
                              {formatUsd(status.manualRewardCapUsd, { fallbackToZero: true })}
                            </Trans>
                          </div>
                        ) : null}
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
              <Trans>Trading activities</Trans>
            </h3>
            <p className="text-13 font-medium text-typography-secondary">
              <Trans>Unlock bonuses and boosts and increase your rewards</Trans>
            </p>
          </div>
        )}
      </div>

      {!hasStatus ? (
        <div className="group overflow-hidden" tabIndex={0} aria-label={t`Activity Boost`}>
          <div className="flex w-max animate-marquee gap-8 group-hover:[animation-play-state:paused] group-focus:[animation-play-state:paused] motion-reduce:animate-none">
            <div className="flex gap-8">
              {boostDisplayItems.map((item) =>
                item.type === "referral" ? (
                  <span
                    key={item.key}
                    className="flex shrink-0 items-center gap-2 rounded-8 bg-white py-2 pl-4 pr-12 text-13 font-medium text-typography-secondary dark:bg-slate-700"
                  >
                    <span className="flex size-26 shrink-0 items-center justify-center">
                      <ReferralBoostIcon active={false} className="size-16" variant="glyph" />
                    </span>
                    <Trans>Referral Bonus</Trans>
                  </span>
                ) : (
                  <span
                    key={item.key}
                    className="flex shrink-0 items-center gap-2 rounded-8 bg-white py-2 pl-4 pr-12 text-13 font-medium text-typography-secondary dark:bg-slate-700"
                  >
                    <BoostTierIcon boostId={item.boost.boost} active={false} className="size-26 shrink-0" />
                    {boostLabels[item.boost.boost]}
                  </span>
                )
              )}
            </div>
            <div className="flex gap-8" aria-hidden="true">
              {boostDisplayItems.map((item) =>
                item.type === "referral" ? (
                  <span
                    key={item.key}
                    className="flex shrink-0 items-center gap-2 rounded-8 bg-white py-2 pl-4 pr-12 text-13 font-medium text-typography-secondary dark:bg-slate-700"
                  >
                    <span className="flex size-26 shrink-0 items-center justify-center">
                      <ReferralBoostIcon active={false} className="size-16" variant="glyph" />
                    </span>
                    <Trans>Referral Bonus</Trans>
                  </span>
                ) : (
                  <span
                    key={item.key}
                    className="flex shrink-0 items-center gap-2 rounded-8 bg-white py-2 pl-4 pr-12 text-13 font-medium text-typography-secondary dark:bg-slate-700"
                  >
                    <BoostTierIcon boostId={item.boost.boost} active={false} className="size-26 shrink-0" />
                    {boostLabels[item.boost.boost]}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TierCardsSkeleton() {
  return (
    <SkeletonTheme baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A">
      <div className="grid grid-cols-3 gap-12 max-lg:grid-cols-1">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className={cx(tierCardBase, tierCardActive, "min-h-[172px]")}>
            <div className="flex items-center justify-between">
              <Skeleton width={96} height={14} inline />
              <Skeleton width={54} height={20} borderRadius={999} inline />
            </div>
            <div className="mt-4 flex items-center gap-12">
              <Skeleton width={48} height={48} borderRadius={12} inline />
              <Skeleton width={132} height={28} inline />
            </div>
            <div className="flex flex-col gap-8">
              <Skeleton width="60%" height={14} inline />
              <Skeleton width="100%" height={6} borderRadius={8} inline />
              <Skeleton width="80%" height={14} inline />
            </div>
          </div>
        ))}
      </div>
    </SkeletonTheme>
  );
}

function TierCardsUnavailable() {
  const cards = [
    { key: "volume", label: <Trans>Volume Tier</Trans> },
    { key: "staking", label: <Trans>Staking Tier</Trans> },
    { key: "boosts", label: <Trans>Activity Boost</Trans> },
  ];

  return (
    <div className="grid grid-cols-3 gap-12 max-lg:grid-cols-1">
      {cards.map((card) => (
        <div key={card.key} className={cx(tierCardBase, tierCardActive, "min-h-[172px]")}>
          <div className="font-medium text-typography-secondary">{card.label}</div>
          <div className="flex flex-1 items-center text-13 text-yellow-300">
            <Trans>Your current status is temporarily unavailable.</Trans>
          </div>
        </div>
      ))}
    </div>
  );
}
