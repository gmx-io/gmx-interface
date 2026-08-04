import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { type PointerEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { REWARDS_PAGE_BANNERS_DISMISSED_KEY } from "config/localStorage";
import { ES_GMX_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import { getRewardsPromoSelection, type RewardsPromoSelection } from "domain/synthetics/incentives/v2/rewardsPromo";
import type { AccountIncentiveStatus, IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { formatMultiplier, formatRewardUsd } from "domain/synthetics/incentives/v2/utils";
import { useLocalStorageSerializeKeySafe } from "lib/localStorage";
import { formatAmount, PRECISION } from "lib/numbers";
import { sendRewardsBannerEvent, sendRewardsNavigationEvent } from "lib/userAnalytics/rewardsEvents";

import {
  EARN_PORTFOLIO_STAKE_ES_GMX_LINK,
  EARN_PORTFOLIO_STAKE_GMX_LINK,
} from "components/Earn/Portfolio/AssetsList/GmxAssetCard/constants";
import { RewardsPromoBannerCard } from "components/RewardsPromoBanner/RewardsPromoBannerCard";
import { getRewardsPromoCopy } from "components/RewardsPromoBanner/rewardsPromoCopy";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";
import TradeIcon from "img/ic_candles_filled.svg?react";
import GmxIcon from "img/ic_gmx_glyph.svg?react";
import rewardsBannerCoinGmx from "img/rewards_banner_coin_gmx.png";
import rewardsBannerCoinMultiplier from "img/rewards_banner_coin_multiplier.png";
import rewardsBannerCoinTrade from "img/rewards_banner_coin_trade.png";
import rewardsBannerCoinWallet from "img/rewards_banner_coin_wallet.png";

import { getRewardsDebugMode } from "../rewardsDebug";
import { getStartRewardsVestingPath } from "../rewardsRoutes";
import { volumeTierLabels } from "./rewardsTiersShared";

type RewardsBannerType =
  | "manual-reward"
  | "gmx-ready-to-stake"
  | "esgmx-ready-to-stake"
  | "referral"
  | "next-volume-tier"
  | "pair-boosts"
  | "restake-rewards";

type RewardsBannerAction = {
  label: ReactNode;
  type: "trade" | "stake" | "invite";
  to: string;
};

type RewardsBannerContent = {
  type: RewardsBannerType;
  title: ReactNode;
  description: ReactNode;
  actions: RewardsBannerAction[];
  coin: string;
};

type DismissedRewardsBanners = Partial<Record<RewardsBannerType, boolean>>;
type BannerAnimationDirection = "left" | "right";

const AUTO_ROTATE_MS = 6000;
const SWIPE_THRESHOLD_PX = 40;
const SWIPE_DIRECTION_LOCK_RATIO = 1.25;

function isInteractiveElement(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("a, button"));
}

export function getRewardsPromotionalBannerContent({
  config,
  status,
  promoSelection,
  walletGmx,
  walletEsGmx,
}: {
  config: IncentivesConfig;
  status?: AccountIncentiveStatus;
  promoSelection?: RewardsPromoSelection;
  walletGmx?: bigint;
  walletEsGmx?: bigint;
}): RewardsBannerContent[] {
  const banners: RewardsBannerContent[] = [];

  if (promoSelection?.variant === "manual-reward") {
    const { title } = getRewardsPromoCopy(promoSelection);
    banners.push({
      type: "manual-reward",
      title,
      description: <Trans>Start trading to activate it and get your rewards.</Trans>,
      actions: [{ label: <Trans>Trade</Trans>, type: "trade", to: "/trade" }],
      coin: rewardsBannerCoinWallet,
    });
  }

  if (promoSelection?.isActiveUser && (walletGmx ?? 0n) > 0n) {
    const gmxAmount = formatAmount(walletGmx, ES_GMX_DECIMALS, 2, true, { trimTrailingZeros: true });
    banners.push({
      type: "gmx-ready-to-stake",
      title: <Trans>You have GMX ready to stake</Trans>,
      description: <Trans>You have {gmxAmount} GMX unstaked - stake now to earn more rewards.</Trans>,
      actions: [{ label: <Trans>Stake GMX</Trans>, type: "stake", to: EARN_PORTFOLIO_STAKE_GMX_LINK }],
      coin: rewardsBannerCoinGmx,
    });
  }

  if (promoSelection?.isActiveUser && (walletEsGmx ?? 0n) > 0n) {
    const esGmxAmount = formatAmount(walletEsGmx, ES_GMX_DECIMALS, 2, true, {
      trimTrailingZeros: true,
    });
    banners.push({
      type: "esgmx-ready-to-stake",
      title: <Trans>You have esGMX available</Trans>,
      description: <Trans>You have {esGmxAmount} esGMX – stake it or vest to get additional rewards</Trans>,
      actions: [
        { label: <Trans>Stake</Trans>, type: "stake", to: EARN_PORTFOLIO_STAKE_ES_GMX_LINK },
        { label: <Trans>Vest</Trans>, type: "stake", to: getStartRewardsVestingPath() },
      ],
      coin: rewardsBannerCoinGmx,
    });
  }

  banners.push({
    type: "referral",
    title: <Trans>Referral Bonus</Trans>,
    description: <Trans>Refer other traders and receive 50% of their rewards</Trans>,
    actions: [{ label: <Trans>Invite</Trans>, type: "invite", to: "/referrals/affiliates" }],
    coin: rewardsBannerCoinWallet,
  });

  if (!status || !promoSelection?.isActiveUser) return banners;

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
        actions: [{ label: <Trans>Trade</Trans>, type: "trade", to: "/trade" }],
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
      description: <Trans>Trade featured pairs to boost multiplier and rewards</Trans>,
      actions: [{ label: <Trans>Trade</Trans>, type: "trade", to: "/trade" }],
      coin: rewardsBannerCoinTrade,
    });
  }

  banners.push({
    type: "restake-rewards",
    title: <Trans>Restake your rewards</Trans>,
    description: <Trans>Restake rewards to boost earnings and unlock more GMX yield.</Trans>,
    actions: [{ label: <Trans>Stake rewards</Trans>, type: "stake", to: EARN_PORTFOLIO_STAKE_GMX_LINK }],
    coin: rewardsBannerCoinGmx,
  });

  return banners;
}

function getRewardsPromotionalBannerDebugContent(config: IncentivesConfig) {
  const currentVolumeTier = config.volumeTiers[0]?.tier ?? "Tier1";
  const nextVolumeTier = config.volumeTiers[1];
  const tierVolume =
    nextVolumeTier && nextVolumeTier.threshold > 0n ? (nextVolumeTier.threshold * 3n) / 4n : 1n * PRECISION;
  const status: AccountIncentiveStatus = {
    account: "0x0000000000000000000000000000000000000001",
    multiplier: config.volumeTiers[0]?.multiplier ?? 0n,
    volumeTier: currentVolumeTier,
    stakingTier: null,
    projectedVolumeTier: currentVolumeTier,
    projectedStakingTier: null,
    epochTimestamp: config.epochTimestamp,
    tradingVolume: tierVolume,
    tierVolume,
    referralVolume: 0n,
    currentStakedBalance: 0n,
    boostIds: [],
    esGmxRewards: 0n,
    gtRewards: 0n,
    rewardsUsd: 0n,
    manualRewardCapUsd: 500n * PRECISION,
    manualRewardConsumedUsd: 300n * PRECISION,
    manualRewardRemainingUsd: 200n * PRECISION,
  };

  return getRewardsPromotionalBannerContent({
    config,
    status,
    promoSelection: getRewardsPromoSelection({ config, status }),
    walletGmx: 100n * 10n ** BigInt(ES_GMX_DECIMALS),
    walletEsGmx: 100n * 10n ** BigInt(ES_GMX_DECIMALS),
  });
}

export function RewardsPromotionalBanners({
  account,
  config,
  status,
  promoSelection,
  walletGmx,
  walletEsGmx,
  isLoading = false,
  className,
}: {
  account?: string;
  config: IncentivesConfig;
  status?: AccountIncentiveStatus;
  promoSelection?: RewardsPromoSelection;
  walletGmx?: bigint;
  walletEsGmx?: bigint;
  isLoading?: boolean;
  className?: string;
}) {
  const { search } = useLocation();
  const showAllBanners = getRewardsDebugMode(search) === "banners";
  const allBanners = useMemo(
    () =>
      showAllBanners
        ? getRewardsPromotionalBannerDebugContent(config)
        : getRewardsPromotionalBannerContent({ config, status, promoSelection, walletGmx, walletEsGmx }),
    [config, promoSelection, showAllBanners, status, walletEsGmx, walletGmx]
  );
  const [dismissedBanners, setDismissedBanners] = useLocalStorageSerializeKeySafe<DismissedRewardsBanners>(
    [REWARDS_PAGE_BANNERS_DISMISSED_KEY, account ?? "disconnected"],
    {}
  );
  const banners = useMemo(
    () => (showAllBanners ? allBanners : allBanners.filter((banner) => !dismissedBanners?.[banner.type])),
    [allBanners, dismissedBanners, showAllBanners]
  );
  const bannerTypesKey = banners.map((banner) => banner.type).join("|");
  const bannerTypes = useMemo(
    () => (bannerTypesKey ? (bannerTypesKey.split("|") as RewardsBannerType[]) : []),
    [bannerTypesKey]
  );
  const audienceKey = account ?? "disconnected";
  const [selection, setSelection] = useState<{ audienceKey: string; bannerType?: RewardsBannerType }>(() => ({
    audienceKey,
    bannerType: isLoading ? undefined : bannerTypes[0],
  }));
  const selectedBannerType = selection.audienceKey === audienceKey ? selection.bannerType : undefined;
  const [animationDirection, setAnimationDirection] = useState<BannerAnimationDirection>("right");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
  );
  const swipeStartRef = useRef<{ pointerId: number; x: number; y: number }>();

  const selectedBannerIndex =
    selectedBannerType === undefined ? -1 : bannerTypes.findIndex((bannerType) => bannerType === selectedBannerType);
  const selectedIndex = selectedBannerIndex === -1 ? 0 : selectedBannerIndex;
  const current = banners[selectedIndex];
  const currentType = current?.type;

  useEffect(() => {
    if (!isLoading && currentType !== selectedBannerType) {
      setSelection({ audienceKey, bannerType: currentType });
    }
  }, [audienceKey, currentType, isLoading, selectedBannerType]);

  const goToRelativeIndex = useCallback(
    (offset: number) => {
      if (bannerTypes.length <= 1) return;
      setAnimationDirection(offset > 0 ? "right" : "left");
      const nextIndex = (selectedIndex + offset + bannerTypes.length) % bannerTypes.length;
      setSelection({ audienceKey, bannerType: bannerTypes[nextIndex] });
    },
    [audienceKey, bannerTypes, selectedIndex]
  );

  useEffect(() => {
    if (banners.length <= 1 || prefersReducedMotion) return;

    const timeout = window.setTimeout(() => goToRelativeIndex(1), AUTO_ROTATE_MS);
    return () => window.clearTimeout(timeout);
  }, [banners.length, currentType, goToRelativeIndex, prefersReducedMotion]);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mediaQuery) return;

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };
    mediaQuery.addEventListener?.("change", handleChange);
    return () => mediaQuery.removeEventListener?.("change", handleChange);
  }, []);

  const bannerAnimationClass =
    animationDirection === "left" ? "animate-rewards-banner-slide-in-left" : "animate-rewards-banner-slide-in-right";

  const handleDotClick = (index: number) => {
    if (index === selectedIndex) return;

    setAnimationDirection(index > selectedIndex ? "right" : "left");
    setSelection({ audienceKey, bannerType: bannerTypes[index] });
  };

  useEffect(() => {
    if (!currentType) return;

    sendRewardsBannerEvent("BannerShown", currentType, account ?? "disconnected");
  }, [account, currentType]);

  if (!current) return null;

  const handleDismiss = () => {
    sendRewardsBannerEvent("BannerDismiss", current.type);
    if (showAllBanners) {
      goToRelativeIndex(1);
      return;
    }

    const nextBannerType = bannerTypes.length > 1 ? bannerTypes[(selectedIndex + 1) % bannerTypes.length] : undefined;
    setSelection({ audienceKey, bannerType: nextBannerType });
    setDismissedBanners((dismissed) => ({ ...dismissed, [current.type]: true }));
  };

  const handleActionClick = () => {
    sendRewardsBannerEvent("BannerClick", current.type);
    sendRewardsNavigationEvent({ source: "PromoBanner" });
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
    goToRelativeIndex(deltaX < 0 ? 1 : -1);
  };

  return (
    <div
      className={cx("flex min-w-0 flex-col items-center", className)}
      role={banners.length > 1 ? "region" : undefined}
      aria-roledescription={banners.length > 1 ? "carousel" : undefined}
      aria-label={banners.length > 1 ? t`Rewards opportunities` : undefined}
      tabIndex={banners.length > 1 ? 0 : undefined}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          goToRelativeIndex(1);
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          goToRelativeIndex(-1);
        }
      }}
      data-testid="rewards-promotional-banners"
    >
      <RewardsPromoBannerCard
        key={current.type}
        className={cx("[touch-action:pan-y]", !prefersReducedMotion && bannerAnimationClass)}
        coin={current.coin}
        onClose={handleDismiss}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          swipeStartRef.current = undefined;
        }}
      >
        <div className="relative z-10 flex min-w-0 flex-col gap-4 pr-4" aria-live="off" aria-atomic="true">
          <div className="flex flex-col gap-2">
            <h3 className="text-16 font-medium text-typography-primary">{current.title}</h3>
            <p className="text-13 text-typography-secondary">{current.description}</p>
          </div>
          <div className="flex items-center gap-8">
            {current.actions.map((action, index) => (
              <div key={`${action.type}-${action.to}`} className="flex items-center gap-8">
                {index > 0 ? (
                  <span aria-hidden="true" className="text-typography-secondary">
                    |
                  </span>
                ) : null}
                <Link
                  to={action.to}
                  className="flex w-fit items-center gap-4 text-14 font-medium text-blue-300"
                  onClick={handleActionClick}
                >
                  {action.label}
                  {action.type === "trade" ? (
                    <TradeIcon className="size-16" />
                  ) : action.type === "invite" ? (
                    <ArrowRightIcon className="size-16" />
                  ) : (
                    <GmxIcon className="size-16" />
                  )}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </RewardsPromoBannerCard>

      {banners.length > 1 ? (
        <div className="flex items-center justify-center gap-8 py-12">
          {banners.map((banner, index) => (
            <button
              key={banner.type}
              type="button"
              aria-label={t`Go to slide ${index + 1}`}
              aria-current={index === selectedIndex}
              className={cx(
                "size-8 rounded-full bg-blue-300 transition-opacity",
                index === selectedIndex ? "opacity-100" : "opacity-40 hover:opacity-70"
              )}
              onClick={() => handleDotClick(index)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
