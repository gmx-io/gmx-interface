import { Plural, Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { getEpochDuration } from "domain/synthetics/incentives/constants";
import type { EpochStats, IncentivesConfig, RewardsHistoryEntry } from "domain/synthetics/incentives/types";
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

type BannerContent = {
  title: ReactNode;
  description: ReactNode;
  action: BannerAction;
};

const BANNER_STYLES = {
  backgroundImage: `url(${bgPointsBanner})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
};

const AUTO_ROTATE_MS = 6000;

const ACTION_ICONS: Record<BannerAction["type"], React.ReactNode> = {
  trade: <TradeIcon className="size-16 text-blue-300" />,
  stake: <EarnIcon className="size-16 text-blue-300" />,
};

export function PointsBanner({ isActiveUser, account, config, currentEpochStats, currentEpochHistory }: Props) {
  const now = useCurrentUnixTimestamp();

  const banners = useMemo(
    () => getBannerContent({ isActiveUser, account, config, currentEpochStats, currentEpochHistory, now }),
    [isActiveUser, account, config, currentEpochStats, currentEpochHistory, now]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setCurrentIndex(0);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, AUTO_ROTATE_MS);

    return () => clearInterval(interval);
  }, [banners.length, currentIndex]);

  if (banners.length === 0 || dismissed) return null;

  const current = banners[currentIndex % banners.length];

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative grid w-full grid-cols-[1fr_80px] overflow-hidden rounded-8 border-1/2 border-stroke-primary bg-slate-900/50 p-16"
        style={BANNER_STYLES}
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
          className="absolute right-12 top-12 text-typography-secondary opacity-50 hover:opacity-80"
          onClick={() => setDismissed(true)}
        >
          <CloseIcon className="size-20" />
        </button>
      </div>

      {banners.length > 1 && (
        <div className="flex items-center justify-center gap-8 py-12">
          {banners.map((_, index) => (
            <button
              key={index}
              className={cx("size-8 rounded-full bg-blue-300", index === currentIndex ? "opacity-100" : "opacity-40")}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type BannerContext = Props & { now: number };

const DEFAULT_BANNER: BannerContent = {
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
