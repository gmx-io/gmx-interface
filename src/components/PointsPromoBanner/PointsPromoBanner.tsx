import { Trans } from "@lingui/macro";
import { Link } from "react-router-dom";

import { POINTS_TRADE_BANNER_DISMISSED_KEY } from "config/localStorage";
import { isIncentivesEnabled } from "domain/synthetics/incentives/constants";
import { usePersonalizedBannerData } from "domain/synthetics/incentives/usePersonalizedBannerData";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatUsd } from "lib/numbers";

import ChevronRightIcon from "img/ic_chevron_right.svg?react";
import MultiplierIcon from "img/ic_multiplier.svg?react";

function formatCompactNumber(value: number): string {
  if (value >= 1000) {
    const k = value / 1000;
    return k === Math.floor(k) ? `${Math.floor(k)}K` : `${k.toFixed(1)}K`;
  }
  if (value >= 1) {
    return value === Math.floor(value) ? `${Math.floor(value)}` : `${value.toFixed(2)}`;
  }
  return value.toFixed(2);
}

export function PointsPromoBanner() {
  const { chainId } = useChainId();
  const [dismissed, setDismissed] = useLocalStorageSerializeKey(POINTS_TRADE_BANNER_DISMISSED_KEY, false);
  const bannerData = usePersonalizedBannerData();

  if (!isIncentivesEnabled(chainId) || dismissed) return null;

  const bannerText = getBannerText(bannerData);

  return (
    <div className="flex items-center justify-between rounded-8 border-1/2 border-blue-500/30 bg-blue-500/10 px-16 py-12">
      <Link to="/points" className="text-body-small flex items-center gap-8 font-medium text-typography-primary">
        <MultiplierIcon className="size-16 text-green-500" />
        <span>{bannerText}</span>
        <ChevronRightIcon className="size-16 text-typography-secondary" />
      </Link>
      <button
        className="ml-8 text-typography-secondary hover:text-typography-primary"
        onClick={() => setDismissed(true)}
      >
        ✕
      </button>
    </div>
  );
}

function getBannerText(bannerData: ReturnType<typeof usePersonalizedBannerData>) {
  if (!bannerData.hasPersonalizedData) {
    return <Trans>Start earning points and unlock rewards.</Trans>;
  }

  if (bannerData.isManuallyRewarded && bannerData.manualBonusUsd !== undefined) {
    const bonusFormatted = formatUsd(bannerData.manualBonusUsd);
    return (
      <Trans>You've received a bonus of {bonusFormatted} — Start trading to activate it and get your rewards.</Trans>
    );
  }

  if (
    bannerData.recommendedStakeGmx !== undefined &&
    bannerData.estimatedRewardsUsd !== undefined &&
    bannerData.recommendedStakeGmx > 0 &&
    bannerData.estimatedRewardsUsd > 0
  ) {
    const stakeFormatted = formatCompactNumber(bannerData.recommendedStakeGmx);
    const rewardsFormatted = formatCompactNumber(bannerData.estimatedRewardsUsd);
    return (
      <Trans>
        Earn rewards — With your recent volume, staking {stakeFormatted} GMX could have earned you up to $
        {rewardsFormatted} in additional trading rewards.
      </Trans>
    );
  }

  return <Trans>Start earning points and unlock rewards.</Trans>;
}
