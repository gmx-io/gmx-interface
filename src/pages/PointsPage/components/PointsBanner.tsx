import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { type PointerEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { USD_DECIMALS } from "config/factors";
import { POINTS_PAGE_BANNERS_DISMISSED_KEY } from "config/localStorage";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useStakingProcessedData } from "domain/stake/useStakingProcessedData";
import { VOLUME_TIER_BADGES } from "domain/synthetics/incentives/constants";
import type { EpochStats, IncentivesConfig } from "domain/synthetics/incentives/types";
import { usePersonalizedBannerData } from "domain/synthetics/incentives/usePersonalizedBannerData";
import { formatMultiplier } from "domain/synthetics/incentives/utils";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatAmount, formatAmountHuman, formatUsd } from "lib/numbers";

import bgPointsBanner from "img/bg_points_banner.png";
import TradeIcon from "img/ic_candles_filled.svg?react";
import CloseIcon from "img/ic_close.svg?react";
import EarnIcon from "img/ic_earn.svg?react";
import pointsBannerCoinEarn from "img/points_banner_coin_earn.png";
import pointsBannerCoinGmx from "img/points_banner_coin_gmx.png";
import pointsBannerCoinMultiplier from "img/points_banner_coin_multiplier.png";
import pointsBannerCoinTime from "img/points_banner_coin_time.png";
import pointsBannerCoinTrade from "img/points_banner_coin_trade.png";
import pointsBannerCoinWallet from "img/points_banner_coin_wallet.png";

type Props = {
  isActiveUser: boolean;
  account?: string;
  config?: IncentivesConfig;
  currentEpochStats?: EpochStats;
  pointsExpiringThisEpoch?: bigint;
  onStakeGmxClick?: () => void;
};

type BannerAction = {
  label: ReactNode;
  type: "trade" | "stake";
  to?: string;
  onClick?: () => void;
};

type BannerType =
  | "manual-reward"
  | "points-expiring"
  | "gmx-ready-to-stake"
  | "next-volume-tier"
  | "pair-boosts"
  | "restake-rewards";

type BannerContent = {
  type: BannerType;
  title: ReactNode;
  description: ReactNode;
  action: BannerAction;
};

type DismissedBannerState = Partial<Record<BannerType, boolean>>;

const BANNER_STYLES = {
  backgroundImage: `url(${bgPointsBanner})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundColor: "var(--color-slate-950)",
};

const AUTO_ROTATE_MS = 6000;
const SWIPE_THRESHOLD_PX = 40;
const SWIPE_DIRECTION_LOCK_RATIO = 1.25;
const DISMISSED_STORAGE_KEY = JSON.stringify(POINTS_PAGE_BANNERS_DISMISSED_KEY);
const DISMISSED_STORAGE_EVENT = "points-page-banners-dismissed-change";

const ACTION_ICONS: Record<BannerAction["type"], React.ReactNode> = {
  trade: <TradeIcon className="size-16 text-blue-300" />,
  stake: <EarnIcon className="size-16 text-blue-300" />,
};

const BANNER_COINS: Record<BannerType, string> = {
  "manual-reward": pointsBannerCoinWallet,
  "points-expiring": pointsBannerCoinTime,
  "gmx-ready-to-stake": pointsBannerCoinGmx,
  "next-volume-tier": pointsBannerCoinMultiplier,
  "pair-boosts": pointsBannerCoinTrade,
  "restake-rewards": pointsBannerCoinEarn,
};

type BannerAnimationDirection = "left" | "right";

function isInsideButtonOrLink(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest("a, button"));
}

export function PointsBanner({
  isActiveUser,
  account,
  config,
  currentEpochStats,
  pointsExpiringThisEpoch,
  onStakeGmxClick,
}: Props) {
  const { showAllPointsPageBanners } = useSettings();
  const { data: stakingData } = useStakingProcessedData();
  const personalizedBannerData = usePersonalizedBannerData();
  const [dismissedBannerTypes, setDismissedBannerTypes] = useLocalStorageSerializeKey<DismissedBannerState>(
    POINTS_PAGE_BANNERS_DISMISSED_KEY,
    {}
  );
  const swipeStartRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);

  const allBanners = useMemo(
    () =>
      getBannerContent({
        isActiveUser,
        account,
        config,
        currentEpochStats,
        pointsExpiringThisEpoch,
        walletGmx: stakingData?.gmxBalance,
        isManuallyRewarded: personalizedBannerData.isManuallyRewarded,
        manualBonusUsd: personalizedBannerData.manualBonusUsd,
        showAllBanners: showAllPointsPageBanners,
        onStakeGmxClick,
      }),
    [
      isActiveUser,
      account,
      config,
      currentEpochStats,
      pointsExpiringThisEpoch,
      stakingData?.gmxBalance,
      personalizedBannerData.isManuallyRewarded,
      personalizedBannerData.manualBonusUsd,
      showAllPointsPageBanners,
      onStakeGmxClick,
    ]
  );
  const banners = useMemo(
    () => (showAllPointsPageBanners ? allBanners : allBanners.filter((banner) => !dismissedBannerTypes?.[banner.type])),
    [allBanners, dismissedBannerTypes, showAllPointsPageBanners]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationDirection, setAnimationDirection] = useState<BannerAnimationDirection>("right");

  useEffect(() => {
    const syncDismissedBannerTypes = (event: Event) => {
      const customEvent = event as CustomEvent<DismissedBannerState>;
      setDismissedBannerTypes(customEvent.detail ?? {});
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === DISMISSED_STORAGE_KEY) {
        setDismissedBannerTypes(parseDismissedBannerTypes(event.newValue));
      }
    };

    window.addEventListener(DISMISSED_STORAGE_EVENT, syncDismissedBannerTypes);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(DISMISSED_STORAGE_EVENT, syncDismissedBannerTypes);
      window.removeEventListener("storage", handleStorage);
    };
  }, [setDismissedBannerTypes]);

  useEffect(() => {
    setCurrentIndex((prev) => (banners.length === 0 ? 0 : prev % banners.length));
  }, [banners.length]);

  const goToRelativeIndex = useCallback(
    (offset: number) => {
      if (banners.length <= 1 || offset === 0) return;

      setAnimationDirection(offset > 0 ? "right" : "left");
      setCurrentIndex((prev) => normalizeBannerIndex(prev + offset, banners.length));
    },
    [banners.length]
  );

  const selectedIndex = banners.length === 0 ? 0 : normalizeBannerIndex(currentIndex, banners.length);
  const current = banners[selectedIndex];

  useEffect(() => {
    if (banners.length <= 1) return;

    const timeout = window.setTimeout(() => {
      goToRelativeIndex(1);
    }, AUTO_ROTATE_MS);

    return () => window.clearTimeout(timeout);
  }, [banners.length, current?.type, goToRelativeIndex, selectedIndex]);

  const bannerAnimationClass =
    animationDirection === "left" ? "animate-points-banner-slide-in-left" : "animate-points-banner-slide-in-right";

  const handleDotClick = useCallback(
    (index: number) => {
      if (index === selectedIndex) return;

      setAnimationDirection(index > selectedIndex ? "right" : "left");
      setCurrentIndex(index);
    },
    [selectedIndex]
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (banners.length <= 1 || event.pointerType === "mouse") return;

      if (isInsideButtonOrLink(event.target)) return;

      swipeStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        pointerId: event.pointerId,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [banners.length]
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const swipeStart = swipeStartRef.current;
      if (!swipeStart || swipeStart.pointerId !== event.pointerId) return;

      swipeStartRef.current = null;
      event.currentTarget.releasePointerCapture?.(event.pointerId);

      const deltaX = event.clientX - swipeStart.x;
      const deltaY = event.clientY - swipeStart.y;
      const absDeltaX = Math.abs(deltaX);

      if (absDeltaX < SWIPE_THRESHOLD_PX || absDeltaX < Math.abs(deltaY) * SWIPE_DIRECTION_LOCK_RATIO) return;

      event.preventDefault();
      goToRelativeIndex(deltaX < 0 ? 1 : -1);
    },
    [goToRelativeIndex]
  );

  const handlePointerCancel = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const swipeStart = swipeStartRef.current;
    if (!swipeStart || swipeStart.pointerId !== event.pointerId) return;

    swipeStartRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  const handleDismiss = useCallback(() => {
    if (!current) return;

    const nextDismissedBannerTypes = {
      ...dismissedBannerTypes,
      [current.type]: true,
    };

    setDismissedBannerTypes(nextDismissedBannerTypes);
    window.dispatchEvent(new CustomEvent(DISMISSED_STORAGE_EVENT, { detail: nextDismissedBannerTypes }));
  }, [current, dismissedBannerTypes, setDismissedBannerTypes]);

  if (banners.length === 0 || !current) return null;

  return (
    <div className="flex flex-col items-center">
      <div
        key={current.type}
        className={cx(
          "relative grid min-h-[110px] w-full grid-cols-[minmax(0,1fr)_80px] overflow-hidden rounded-8 border-1/2 border-stroke-primary bg-slate-900/50 p-16 [touch-action:pan-y] max-sm:grid-cols-[minmax(0,1fr)_80px]",
          bannerAnimationClass
        )}
        style={BANNER_STYLES}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div className="relative z-10 flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-16 font-medium text-typography-primary">{current.title}</h3>
            <p className="text-13 text-typography-secondary">{current.description}</p>
          </div>
          <BannerActionLink action={current.action} />
        </div>

        <img
          src={BANNER_COINS[current.type]}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[-30px] right-[-12px] size-[126px] select-none max-sm:bottom-[-22px] max-sm:right-[-36px] max-sm:size-[124px]"
        />

        <button
          aria-label={t`Close`}
          className="absolute right-12 top-12 z-20 text-typography-secondary opacity-50 hover:opacity-80"
          onClick={handleDismiss}
        >
          <CloseIcon className="size-20" />
        </button>
      </div>

      {banners.length > 1 && (
        <div className="flex items-center justify-center gap-8 py-12">
          {banners.map((_, index) => (
            <button
              key={index}
              className={cx("size-8 rounded-full bg-blue-300", index === selectedIndex ? "opacity-100" : "opacity-40")}
              onClick={() => handleDotClick(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BannerActionLink({ action }: { action: BannerAction }) {
  const content = (
    <>
      <span className="text-14 font-medium text-blue-300">{action.label}</span>
      {ACTION_ICONS[action.type]}
    </>
  );

  if (action.onClick) {
    return (
      <button
        type="button"
        className="bg-transparent flex appearance-none items-center gap-4 border-0 p-0 text-left"
        onClick={action.onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <Link to={action.to ?? "/points"} className="flex items-center gap-4">
      {content}
    </Link>
  );
}

function normalizeBannerIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

function parseDismissedBannerTypes(value: string | null): DismissedBannerState {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

type BannerContext = Props & {
  showAllBanners?: boolean;
  walletGmx?: bigint;
  isManuallyRewarded?: boolean;
  manualBonusUsd?: bigint;
};

function getBannerContent({
  isActiveUser,
  account,
  config,
  currentEpochStats,
  pointsExpiringThisEpoch,
  walletGmx,
  isManuallyRewarded,
  manualBonusUsd,
  showAllBanners,
  onStakeGmxClick,
}: BannerContext): BannerContent[] {
  if (showAllBanners) {
    return getAllBannerContent(onStakeGmxClick);
  }

  if (!account || !isActiveUser) {
    if (account && isManuallyRewarded && manualBonusUsd !== undefined) {
      return [getManualRewardBanner(manualBonusUsd)];
    }

    return [];
  }

  const items: BannerContent[] = [];

  if (pointsExpiringThisEpoch !== undefined && pointsExpiringThisEpoch > 0n) {
    items.push(getPointsExpiringBanner());
  }

  if (walletGmx !== undefined && walletGmx > 0n) {
    items.push({
      type: "gmx-ready-to-stake",
      title: t`You have GMX ready to stake`,
      description: t`You have ${formatAmount(walletGmx, 18, 2, true)} GMX unstaked - stake now to earn more points and rewards.`,
      action: {
        label: <Trans>Stake GMX</Trans>,
        type: "stake",
        to: "/points",
        onClick: onStakeGmxClick,
      },
    });
  }

  if (config && currentEpochStats?.volumeTier) {
    const tierConfig = config.volumeTiers;
    const currentIdx = tierConfig.findIndex((tier) => tier.tier === currentEpochStats.volumeTier);
    const nextTier = tierConfig[currentIdx + 1];

    if (nextTier && currentEpochStats.tradedVolume > 0n) {
      const remaining = nextTier.threshold - currentEpochStats.tradedVolume;
      const threshold30Pct = (nextTier.threshold * 30n) / 100n;
      if (remaining > 0n && remaining < threshold30Pct) {
        const remainingLabel = formatAmountHuman(remaining, USD_DECIMALS, true, 0);
        const tierLabel = VOLUME_TIER_BADGES[nextTier.tier]();
        const multiplierLabel = formatMultiplier(nextTier.multiplier);
        items.push({
          type: "next-volume-tier",
          title: t`Almost at the next tier`,
          description: t`Trade ${remainingLabel} more to unlock ${tierLabel} status and a +${multiplierLabel} multiplier`,
          action: {
            label: <Trans>Trade</Trans>,
            type: "trade",
            to: "/trade",
          },
        });
      }
    }
  }

  if (currentEpochStats && (!currentEpochStats.boostIds || currentEpochStats.boostIds.length === 0)) {
    items.push({
      type: "pair-boosts",
      title: t`Activate Pair Boosts`,
      description: t`Trade eligible pairs to unlock multipliers and increase your reward potential this epoch.`,
      action: {
        label: <Trans>Trade</Trans>,
        type: "trade",
        to: "/trade",
      },
    });
  }

  items.push({
    type: "restake-rewards",
    title: t`Restake your rewards and earn more`,
    description: t`Continue restaking your rewards to boost your earnings and unlock additional yield on your GMX tokens.`,
    action: {
      label: <Trans>Stake rewards</Trans>,
      type: "stake",
      to: "/points",
      onClick: onStakeGmxClick,
    },
  });

  return items;
}

function getAllBannerContent(onStakeGmxClick?: () => void): BannerContent[] {
  return [
    getManualRewardBanner(200n * 10n ** 30n),
    getPointsExpiringBanner(),
    {
      type: "gmx-ready-to-stake",
      title: t`You have GMX ready to stake`,
      description: t`You have X GMX unstaked - stake now to earn more points and rewards.`,
      action: {
        label: <Trans>Stake GMX</Trans>,
        type: "stake",
        to: "/points",
        onClick: onStakeGmxClick,
      },
    },
    {
      type: "next-volume-tier",
      title: t`Almost at the next tier`,
      description: t`Trade $X more to unlock ${VOLUME_TIER_BADGES.Tier2()} status and a +${formatMultiplier(125)} multiplier`,
      action: {
        label: <Trans>Trade</Trans>,
        type: "trade",
        to: "/trade",
      },
    },
    {
      type: "pair-boosts",
      title: t`Activate Pair Boosts`,
      description: t`Trade eligible pairs to unlock multipliers and increase your reward potential this epoch.`,
      action: {
        label: <Trans>Trade</Trans>,
        type: "trade",
        to: "/trade",
      },
    },
    {
      type: "restake-rewards",
      title: t`Restake your rewards and earn more`,
      description: t`Continue restaking your rewards to boost your earnings and unlock additional yield on your GMX tokens.`,
      action: {
        label: <Trans>Stake rewards</Trans>,
        type: "stake",
        to: "/points",
        onClick: onStakeGmxClick,
      },
    },
  ];
}

function getPointsExpiringBanner(): BannerContent {
  return {
    type: "points-expiring",
    title: t`Don't Let Rewards Expire`,
    description: t`Use your rewards before they expire and make the most of your activity.`,
    action: {
      label: <Trans>Claim rewards</Trans>,
      type: "stake",
      to: "/points",
    },
  };
}

function getManualRewardBanner(manualBonusUsd: bigint): BannerContent {
  const bonusFormatted = formatUsd(manualBonusUsd) ?? "$0.00";

  return {
    type: "manual-reward",
    title: t`You've received bonus of ${bonusFormatted}`,
    description: t`Start trading to activate it and get your rewards.`,
    action: {
      label: <Trans>Start trading</Trans>,
      type: "trade",
      to: "/trade",
    },
  };
}
