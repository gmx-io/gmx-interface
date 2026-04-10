import { useMemo } from "react";

import type { AccountIncentiveDashboard, EpochStats, IncentivesConfig } from "domain/synthetics/incentives/types";
import { formatAmount } from "lib/numbers";

type Props = {
  isActiveUser: boolean;
  account?: string;
  config?: IncentivesConfig;
  dashboard?: AccountIncentiveDashboard;
  currentEpochStats?: EpochStats;
};

type BannerContent = {
  title: string;
  description: string;
};

export function PointsBanner({ isActiveUser, account, config, dashboard, currentEpochStats }: Props) {
  const banner = useMemo(
    () => getBannerContent({ isActiveUser, account, config, dashboard, currentEpochStats }),
    [isActiveUser, account, config, dashboard, currentEpochStats]
  );

  if (!banner) return null;

  return (
    <div className="rounded-8 border-1/2 border-blue-500/30 bg-blue-500/10 px-20 py-16">
      <div className="flex items-center justify-between gap-16">
        <div>
          <h3 className="text-body-medium font-medium text-typography-primary">{banner.title}</h3>
          <p className="text-body-small mt-4 text-typography-secondary">{banner.description}</p>
        </div>
      </div>
    </div>
  );
}

function getBannerContent({
  isActiveUser,
  account,
  config,
  dashboard,
  currentEpochStats,
}: Props): BannerContent | null {
  if (!account || !isActiveUser) return null;

  // 1. Points expiring this epoch — only show if balance is meaningful (> 1 point)
  const MIN_POINTS_FOR_BANNER = 10n ** 18n; // 1 point in 18-decimal
  if (dashboard?.pointsBalance && dashboard.pointsBalance > MIN_POINTS_FOR_BANNER) {
    const pointsDisplay = formatAmount(dashboard.pointsBalance, 18, 0, true);
    return {
      title: "Don't Let Rewards Expire",
      description: `Use your ${pointsDisplay} points before they expire and make the most of your activity.`,
    };
  }

  // 2. Close to next volume tier (< 30% needed)
  if (config && currentEpochStats?.volumeTier) {
    const tierConfig = config.volumeTiers;
    const currentIdx = tierConfig.findIndex((t) => t.tier === currentEpochStats.volumeTier);
    const nextTier = tierConfig[currentIdx + 1];
    if (nextTier && currentEpochStats.tradedVolume > 0n) {
      const remaining = nextTier.threshold - currentEpochStats.tradedVolume;
      const threshold30Pct = (nextTier.threshold * 30n) / 100n;
      if (remaining > 0n && remaining < threshold30Pct) {
        return {
          title: "So Close to the Next Tier",
          description: "A small increase in volume will unlock a higher status and stronger rewards.",
        };
      }
    }
  }

  // 3. Boosts not active
  if (currentEpochStats && (!currentEpochStats.boostIds || currentEpochStats.boostIds.length === 0)) {
    return {
      title: "Activate Pair Boosts",
      description: "Trade eligible pairs to unlock multipliers and increase your reward potential this epoch.",
    };
  }

  // 4. Default: restake
  return {
    title: "Restake your rewards and earn more",
    description:
      "Continue restaking your rewards to boost your earnings and unlock additional yield on your GMX tokens.",
  };
}
