import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { type PointerEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { REWARDS_PAGE_BANNERS_DISMISSED_KEY } from "config/localStorage";
import { ES_GMX_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { AccountIncentiveStatus, IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { formatMultiplier, formatRewardUsd } from "domain/synthetics/incentives/v2/utils";
import type { StakingProcessedData } from "lib/legacy";
import { useLocalStorageSerializeKeySafe } from "lib/localStorage";
import { formatAmount } from "lib/numbers";

import { rewardsBannerStyles } from "components/RewardsPromoBanner/rewardsBannerStyles";

import TradeIcon from "img/ic_candles_filled.svg?react";
import CloseIcon from "img/ic_close.svg?react";
import GmxIcon from "img/ic_gmx_glyph.svg?react";
import rewardsBannerCoinGmx from "img/rewards_banner_coin_gmx.png";
import rewardsBannerCoinMultiplier from "img/rewards_banner_coin_multiplier.png";
import rewardsBannerCoinTrade from "img/rewards_banner_coin_trade.png";
import rewardsBannerCoinWallet from "img/rewards_banner_coin_wallet.png";

import { volumeTierLabels } from "./rewardsTiersShared";

type RewardsBannerType =
  | "manual-reward"
  | "gmx-ready-to-stake"
  | "esgmx-ready-to-stake"
  | "next-volume-tier"
  | "pair-boosts"
  | "restake-rewards";

type RewardsBannerContent = {
  type: RewardsBannerType;
  title: ReactNode;
  description: ReactNode;
  actionLabel: ReactNode;
  actionType: "trade" | "stake";
  to: string;
  coin: string;
};

type DismissedRewardsBanners = Partial<Record<RewardsBannerType, boolean>>;

const AUTO_ROTATE_MS = 6000;
const SWIPE_THRESHOLD_PX = 40;
const SWIPE_DIRECTION_LOCK_RATIO = 1.25;

function isInteractiveElement(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("a, button"));
}

export function getRewardsPromotionalBannerContent({
  config,
  status,
  stakingData,
}: {
  config: IncentivesConfig;
  status?: AccountIncentiveStatus;
  stakingData?: Pick<StakingProcessedData, "gmxBalance" | "esGmxBalance">;
}): RewardsBannerContent[] {
  if (!status) return [];

  const banners: RewardsBannerContent[] = [];

  if (status.manualRewardRemainingUsd > 0n) {
    const bonus = formatRewardUsd(status.manualRewardRemainingUsd);
    banners.push({
      type: "manual-reward",
      title: t`You've received bonus of ${bonus}`,
      description: <Trans>Start trading to activate it and get your rewards.</Trans>,
      actionLabel: <Trans>Start trading</Trans>,
      actionType: "trade",
      to: "/trade",
      coin: rewardsBannerCoinWallet,
    });
  }

  if ((stakingData?.gmxBalance ?? 0n) > 0n) {
    const gmxAmount = formatAmount(stakingData?.gmxBalance, ES_GMX_DECIMALS, 2, true, { trimTrailingZeros: true });
    banners.push({
      type: "gmx-ready-to-stake",
      title: <Trans>You have GMX ready to stake</Trans>,
      description: <Trans>You have {gmxAmount} GMX unstaked - stake now to earn more rewards.</Trans>,
      actionLabel: <Trans>Stake GMX</Trans>,
      actionType: "stake",
      to: "/earn/portfolio",
      coin: rewardsBannerCoinGmx,
    });
  }

  if ((stakingData?.esGmxBalance ?? 0n) > 0n) {
    const esGmxAmount = formatAmount(stakingData?.esGmxBalance, ES_GMX_DECIMALS, 2, true, {
      trimTrailingZeros: true,
    });
    banners.push({
      type: "esgmx-ready-to-stake",
      title: <Trans>You have esGMX ready to stake</Trans>,
      description: <Trans>You have {esGmxAmount} esGMX unstaked - stake now to earn more rewards.</Trans>,
      actionLabel: <Trans>Stake esGMX</Trans>,
      actionType: "stake",
      to: "/earn/portfolio",
      coin: rewardsBannerCoinGmx,
    });
  }

  const activeTierIndex = config.volumeTiers.findIndex((tier) => tier.tier === status.volumeTier);
  const projectedTierIndex = config.volumeTiers.findIndex((tier) => tier.tier === status.projectedVolumeTier);
  const effectiveTierIndex = Math.max(activeTierIndex, projectedTierIndex);
  const nextVolumeTier = config.volumeTiers.find(
    (tier, index) => index > effectiveTierIndex && tier.threshold > status.tierVolume
  );
  if (nextVolumeTier && status.tierVolume > 0n) {
    const remainingVolume = nextVolumeTier.threshold - status.tierVolume;
    const isAlmostAtNextTier = remainingVolume * 100n <= nextVolumeTier.threshold * 30n;

    if (isAlmostAtNextTier) {
      const remainingVolumeLabel = formatRewardUsd(remainingVolume);
      const tierLabel = volumeTierLabels[nextVolumeTier.tier];
      const multiplierLabel = formatMultiplier(nextVolumeTier.multiplier, config.multiplierDecimals);

      banners.push({
        type: "next-volume-tier",
        title: <Trans>Almost at the next tier</Trans>,
        description: (
          <Trans>
            Trade {remainingVolumeLabel} more to unlock {tierLabel} status and a +{multiplierLabel} multiplier
          </Trans>
        ),
        actionLabel: <Trans>Trade</Trans>,
        actionType: "trade",
        to: "/trade",
        coin: rewardsBannerCoinMultiplier,
      });
    }
  }

  const hasFeaturedMarketOpportunity =
    config.featuredMarketIndexTokens.length > 0 && !status.boostIds.includes("FeaturedMarkets");
  if (hasFeaturedMarketOpportunity) {
    banners.push({
      type: "pair-boosts",
      title: <Trans>Activate Pair Boosts</Trans>,
      description: (
        <Trans>Trade eligible pairs to unlock multipliers and increase your reward potential this epoch.</Trans>
      ),
      actionLabel: <Trans>Trade</Trans>,
      actionType: "trade",
      to: "/trade",
      coin: rewardsBannerCoinTrade,
    });
  }

  banners.push({
    type: "restake-rewards",
    title: <Trans>Restake your rewards and earn more</Trans>,
    description: (
      <Trans>
        Continue restaking your rewards to boost your earnings and unlock additional yield on your GMX tokens.
      </Trans>
    ),
    actionLabel: <Trans>Stake rewards</Trans>,
    actionType: "stake",
    to: "/earn/portfolio",
    coin: rewardsBannerCoinGmx,
  });

  return banners;
}

export function RewardsPromotionalBanners({
  account,
  config,
  status,
  stakingData,
}: {
  account?: string;
  config: IncentivesConfig;
  status?: AccountIncentiveStatus;
  stakingData?: Pick<StakingProcessedData, "gmxBalance" | "esGmxBalance">;
}) {
  const allBanners = useMemo(
    () => getRewardsPromotionalBannerContent({ config, status, stakingData }),
    [config, stakingData, status]
  );
  const [dismissedBanners, setDismissedBanners] = useLocalStorageSerializeKeySafe<DismissedRewardsBanners>(
    [REWARDS_PAGE_BANNERS_DISMISSED_KEY, account],
    {}
  );
  const banners = useMemo(
    () => allBanners.filter((banner) => !dismissedBanners?.[banner.type]),
    [allBanners, dismissedBanners]
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isInteractionPaused, setIsInteractionPaused] = useState(false);
  const [isRotationPaused, setIsRotationPaused] = useState(
    () => typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
  );
  const swipeStartRef = useRef<{ pointerId: number; x: number; y: number }>();

  const goToRelativeIndex = useCallback(
    (offset: number) => {
      if (banners.length <= 1) return;
      setCurrentIndex((current) => (current + offset + banners.length) % banners.length);
    },
    [banners.length]
  );

  const selectedIndex = banners.length === 0 ? 0 : currentIndex % banners.length;
  const current = banners[selectedIndex];

  useEffect(() => {
    setCurrentIndex((index) => (banners.length === 0 ? 0 : index % banners.length));
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1 || isInteractionPaused || isRotationPaused) return;

    const timeout = window.setTimeout(() => goToRelativeIndex(1), AUTO_ROTATE_MS);
    return () => window.clearTimeout(timeout);
  }, [banners.length, current?.type, goToRelativeIndex, isInteractionPaused, isRotationPaused]);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mediaQuery) return;

    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) setIsRotationPaused(true);
    };
    mediaQuery.addEventListener?.("change", handleChange);
    return () => mediaQuery.removeEventListener?.("change", handleChange);
  }, []);

  if (!account || !current) return null;

  const handleDismiss = () => {
    setDismissedBanners((dismissed) => ({ ...dismissed, [current.type]: true }));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" || banners.length <= 1 || isInteractiveElement(event.target)) return;
    swipeStartRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;

    swipeStartRef.current = undefined;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    if (Math.abs(deltaX) < Math.abs(deltaY) * SWIPE_DIRECTION_LOCK_RATIO) return;
    event.preventDefault();
    setIsRotationPaused(true);
    goToRelativeIndex(deltaX < 0 ? 1 : -1);
  };

  return (
    <div
      className="flex flex-col items-center"
      role={banners.length > 1 ? "region" : undefined}
      aria-roledescription={banners.length > 1 ? "carousel" : undefined}
      aria-label={banners.length > 1 ? t`Rewards opportunities` : undefined}
      tabIndex={banners.length > 1 ? 0 : undefined}
      onMouseEnter={() => setIsInteractionPaused(true)}
      onMouseLeave={() => setIsInteractionPaused(false)}
      onFocus={() => setIsInteractionPaused(true)}
      onBlur={() => setIsInteractionPaused(false)}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          setIsRotationPaused(true);
          goToRelativeIndex(1);
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          setIsRotationPaused(true);
          goToRelativeIndex(-1);
        }
      }}
      data-testid="rewards-promotional-banners"
    >
      <div
        className="relative grid min-h-[110px] w-full grid-cols-[minmax(0,1fr)_80px] overflow-hidden rounded-8 border-1/2 border-stroke-primary bg-slate-950 p-16 [touch-action:pan-y]"
        style={rewardsBannerStyles}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          swipeStartRef.current = undefined;
        }}
      >
        <div
          className="relative z-10 flex min-w-0 flex-col gap-4 pr-4"
          aria-live={isRotationPaused || isInteractionPaused ? "polite" : "off"}
          aria-atomic="true"
        >
          <div className="flex flex-col gap-2">
            <h3 className="text-16 font-medium text-typography-primary">{current.title}</h3>
            <p className="text-13 text-typography-secondary">{current.description}</p>
          </div>
          <Link to={current.to} className="flex w-fit items-center gap-4 text-14 font-medium text-blue-300">
            {current.actionLabel}
            {current.actionType === "trade" ? <TradeIcon className="size-16" /> : <GmxIcon className="size-16" />}
          </Link>
        </div>

        <img
          src={current.coin}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[-30px] right-[-12px] size-[126px] select-none max-sm:bottom-[-22px] max-sm:right-[-36px] max-sm:size-[124px]"
        />

        <button
          type="button"
          aria-label={t`Close`}
          className="absolute right-8 top-8 z-20 flex size-24 items-center justify-center text-typography-secondary opacity-50 hover:opacity-80"
          onClick={handleDismiss}
        >
          <CloseIcon className="size-16" />
        </button>
      </div>

      {banners.length > 1 ? (
        <div className="flex items-center justify-center gap-4 py-8">
          <button
            type="button"
            aria-label={isRotationPaused ? t`Resume banner rotation` : t`Pause banner rotation`}
            aria-pressed={isRotationPaused}
            className="flex size-24 items-center justify-center rounded-full text-blue-300 opacity-70 hover:opacity-100"
            onClick={() => setIsRotationPaused((paused) => !paused)}
          >
            {isRotationPaused ? (
              <span className="border-y-transparent border-l-current ml-2 size-0 border-y-[4px] border-l-[7px]" />
            ) : (
              <span className="flex gap-2" aria-hidden="true">
                <span className="bg-current h-8 w-2 rounded-full" />
                <span className="bg-current h-8 w-2 rounded-full" />
              </span>
            )}
          </button>
          {banners.map((banner, index) => (
            <button
              key={banner.type}
              type="button"
              aria-label={t`Go to slide ${index + 1}`}
              aria-current={index === selectedIndex}
              className="flex size-24 items-center justify-center rounded-full"
              onClick={() => {
                setIsRotationPaused(true);
                setCurrentIndex(index);
              }}
            >
              <span
                className={cx(
                  "size-8 rounded-full bg-blue-300 transition-opacity",
                  index === selectedIndex ? "opacity-100" : "opacity-40 hover:opacity-70"
                )}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
