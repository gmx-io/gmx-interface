import { Plural, Trans, t } from "@lingui/macro";
import cx from "classnames";
import { type PointerEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { POINTS_PAGE_BANNERS_DISMISSED_KEY } from "config/localStorage";
import { getEpochDuration } from "domain/synthetics/incentives/constants";
import type { EpochStats, IncentivesConfig, RewardsHistoryEntry } from "domain/synthetics/incentives/types";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatAmount } from "lib/numbers";

import bgPointsBanner from "img/bg_points_banner.png";
import CloseIcon from "img/ic_close.svg?react";
import EarnIcon from "img/ic_earn.svg?react";
import TradeIcon from "img/ic_trade_solid.svg?react";

import { getCurrentEpochEndTime, useCurrentUnixTimestamp } from "./epochTiming";

type Props = {
  isActiveUser: boolean;
  account?: string;
  config?: IncentivesConfig;
  currentEpochStats?: EpochStats;
  currentEpochHistory?: RewardsHistoryEntry;
};

type BannerAction = {
  label: ReactNode;
  type: "trade" | "stake";
  to: string;
};

type BannerType =
  | "default"
  | "points-expiring"
  | "next-volume-tier"
  | "volume-tier-drop-risk"
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

type BannerAnimationDirection = "left" | "right";

export function PointsBanner({ isActiveUser, account, config, currentEpochStats, currentEpochHistory }: Props) {
  const now = useCurrentUnixTimestamp();
  const [dismissedBannerTypes, setDismissedBannerTypes] = useLocalStorageSerializeKey<DismissedBannerState>(
    POINTS_PAGE_BANNERS_DISMISSED_KEY,
    {}
  );
  const swipeStartRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);

  const allBanners = useMemo(
    () => getBannerContent({ isActiveUser, account, config, currentEpochStats, currentEpochHistory, now }),
    [isActiveUser, account, config, currentEpochStats, currentEpochHistory, now]
  );
  const banners = useMemo(
    () => allBanners.filter((banner) => !dismissedBannerTypes?.[banner.type]),
    [allBanners, dismissedBannerTypes]
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

      const target = event.target;
      if (target instanceof HTMLElement && target.closest("a, button")) return;

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
          "relative grid w-full grid-cols-[1fr_80px] overflow-hidden rounded-8 border-1/2 border-stroke-primary bg-slate-900/50 p-16 [touch-action:pan-y]",
          bannerAnimationClass
        )}
        style={BANNER_STYLES}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-16 font-medium text-typography-primary">{current.title}</h3>
            <p className="text-13 text-typography-secondary">{current.description}</p>
          </div>
          <Link to={current.action.to} className="flex items-center gap-4">
            <span className="text-14 font-medium text-blue-300">{current.action.label}</span>
            {ACTION_ICONS[current.action.type]}
          </Link>
        </div>

        <button
          aria-label={t`Close`}
          className="absolute right-12 top-12 text-typography-secondary opacity-50 hover:opacity-80"
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

type BannerContext = Props & { now: number };

const DEFAULT_BANNER: BannerContent = {
  type: "default",
  title: <Trans>Earn rewards</Trans>,
  description: <Trans>Start earning points and unlock rewards.</Trans>,
  action: {
    label: <Trans>Trade</Trans>,
    type: "trade",
    to: "/trade",
  },
};

function getBannerContent({
  isActiveUser,
  account,
  config,
  currentEpochStats,
  currentEpochHistory,
  now,
}: BannerContext): BannerContent[] {
  if (!account || !isActiveUser) {
    return [DEFAULT_BANNER];
  }

  const items: BannerContent[] = [];

  if (currentEpochHistory?.pointsExpired && currentEpochHistory.pointsExpired > 0n) {
    const expiredAmount = currentEpochHistory.pointsExpired;
    const pointsDisplay = formatAmount(expiredAmount, 18, 0, true);
    const expiredPointsCount = Number(expiredAmount / 10n ** 18n);
    items.push({
      type: "points-expiring",
      title: t`Don't Let Rewards Expire`,
      description: (
        <Plural
          value={expiredPointsCount}
          one={`${pointsDisplay} point is set to expire this epoch. Use it before rollover and make the most of your activity.`}
          other={`${pointsDisplay} points are set to expire this epoch. Use them before rollover and make the most of your activity.`}
        />
      ),
      action: {
        label: <Trans>Claim rewards</Trans>,
        type: "stake",
        to: "/points",
      },
    });
  }

  if (config && currentEpochStats?.volumeTier) {
    const tierConfig = config.volumeTiers;
    const currentIdx = tierConfig.findIndex((tier) => tier.tier === currentEpochStats.volumeTier);
    const currentTierConfig = currentIdx >= 0 ? tierConfig[currentIdx] : undefined;
    const nextTier = tierConfig[currentIdx + 1];

    // "So close" upgrade prompt
    if (nextTier && currentEpochStats.tradedVolume > 0n) {
      const remaining = nextTier.threshold - currentEpochStats.tradedVolume;
      const threshold30Pct = (nextTier.threshold * 30n) / 100n;
      if (remaining > 0n && remaining < threshold30Pct) {
        items.push({
          type: "next-volume-tier",
          title: t`So Close to the Next Tier`,
          description: t`A small increase in volume will unlock a higher status and stronger rewards.`,
          action: {
            label: <Trans>Trade</Trans>,
            type: "trade",
            to: "/trade",
          },
        });
      }
    }

    // Downgrade risk prompt: the user hasn't traded enough so far to sustain their
    // current tier, and less than half of the epoch remains.
    if (currentTierConfig) {
      const epochDuration = getEpochDuration(config);
      const epochEnd = getCurrentEpochEndTime(config, now);
      const epochStart = epochEnd - epochDuration;
      const secondsIntoEpoch = Math.max(0, now - epochStart);
      const epochProgressed = epochDuration > 0 && secondsIntoEpoch * 2 >= epochDuration;
      const halfThreshold = currentTierConfig.threshold / 2n;
      if (epochProgressed && currentEpochStats.tradedVolume < halfThreshold) {
        items.push({
          type: "volume-tier-drop-risk",
          title: t`Your tier will drop next epoch`,
          description: t`Your volume this epoch is below the threshold for your current tier. Trade more to keep your rewards multiplier.`,
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
      to: "/earn",
    },
  });

  return items;
}
