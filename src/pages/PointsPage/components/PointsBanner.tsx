import cx from "classnames";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { EpochStats, IncentivesConfig, RewardsHistoryEntry } from "domain/synthetics/incentives/types";
import { formatAmount } from "lib/numbers";

import bgPointsBanner from "img/bg_points_banner.png";
import CloseIcon from "img/ic_close.svg?react";
import EarnIcon from "img/ic_earn.svg?react";
import TradeIcon from "img/ic_trade_solid.svg?react";

type Props = {
  isActiveUser: boolean;
  account?: string;
  config?: IncentivesConfig;
  currentEpochStats?: EpochStats;
  currentEpochHistory?: RewardsHistoryEntry;
};

type BannerAction = {
  label: string;
  type: "trade" | "stake";
  to: string;
};

type BannerContent = {
  title: string;
  description: string;
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
  const banners = useMemo(
    () => getBannerContent({ isActiveUser, account, config, currentEpochStats, currentEpochHistory }),
    [isActiveUser, account, config, currentEpochStats, currentEpochHistory]
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

function getBannerContent({
  isActiveUser,
  account,
  config,
  currentEpochStats,
  currentEpochHistory,
}: Props): BannerContent[] {
  if (!account || !isActiveUser) return [];

  const items: BannerContent[] = [];

  if (currentEpochHistory?.pointsExpired && currentEpochHistory.pointsExpired > 0n) {
    const pointsDisplay = formatAmount(currentEpochHistory.pointsExpired, 18, 0, true);
    items.push({
      title: "Don't Let Rewards Expire",
      description: `${pointsDisplay} points are set to expire this epoch. Use them before rollover and make the most of your activity.`,
      action: {
        label: "Claim rewards",
        type: "stake",
        to: "/points",
      },
    });
  }

  if (config && currentEpochStats?.volumeTier) {
    const tierConfig = config.volumeTiers;
    const currentIdx = tierConfig.findIndex((t) => t.tier === currentEpochStats.volumeTier);
    const nextTier = tierConfig[currentIdx + 1];
    if (nextTier && currentEpochStats.tradedVolume > 0n) {
      const remaining = nextTier.threshold - currentEpochStats.tradedVolume;
      const threshold30Pct = (nextTier.threshold * 30n) / 100n;
      if (remaining > 0n && remaining < threshold30Pct) {
        items.push({
          title: "So Close to the Next Tier",
          description: "A small increase in volume will unlock a higher status and stronger rewards.",
          action: {
            label: "Trade",
            type: "trade",
            to: "/trade",
          },
        });
      }
    }
  }

  if (currentEpochStats && (!currentEpochStats.boostIds || currentEpochStats.boostIds.length === 0)) {
    items.push({
      title: "Activate Pair Boosts",
      description: "Trade eligible pairs to unlock multipliers and increase your reward potential this epoch.",
      action: {
        label: "Trade",
        type: "trade",
        to: "/trade",
      },
    });
  }

  items.push({
    title: "Restake your rewards and earn more",
    description:
      "Continue restaking your rewards to boost your earnings and unlock additional yield on your GMX tokens.",
    action: {
      label: "Stake rewards",
      type: "stake",
      to: "/earn",
    },
  });

  return items;
}
