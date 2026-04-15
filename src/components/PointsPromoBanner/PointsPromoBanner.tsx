import { Trans } from "@lingui/macro";
import { Link } from "react-router-dom";

import { POINTS_TRADE_BANNER_DISMISSED_KEY } from "config/localStorage";
import { isIncentivesEnabled } from "domain/synthetics/incentives/constants";
import { usePersonalizedBannerData } from "domain/synthetics/incentives/usePersonalizedBannerData";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatUsd } from "lib/numbers";

import bgPointsPromoBanner from "img/bg_points_promo_banner.png";
import CrossIcon from "img/ic_cross.svg?react";

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

const BANNER_STYLES = {
  backgroundImage: `url(${bgPointsPromoBanner})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
};

export function PointsPromoBanner() {
  const { chainId } = useChainId();
  const [dismissed, setDismissed] = useLocalStorageSerializeKey(POINTS_TRADE_BANNER_DISMISSED_KEY, false);
  const bannerData = usePersonalizedBannerData();

  if (!isIncentivesEnabled(chainId) || dismissed) return null;

  const bannerText = getBannerText(bannerData);

  return bannerData.isLoading ? null : (
    <div className="flex justify-center">
      <Link
        className="grid min-h-[78px] w-full grid-cols-[1fr_76px] rounded-8 border-1/2 border-stroke-primary bg-slate-900/50 px-16 py-12"
        style={BANNER_STYLES}
        onClick={() => setDismissed(true)}
        to="/points"
      >
        <div className="flex gap-8">
          <div className="flex flex-col gap-2">{bannerText}</div>
        </div>

        <div className="flex items-start justify-end">
          <button
            className="text-typography-secondary hover:text-typography-primary"
            onClick={() => setDismissed(true)}
          >
            <CrossIcon className="size-11" />
          </button>
        </div>
      </Link>
    </div>
  );
}

function getBannerText(bannerData: ReturnType<typeof usePersonalizedBannerData>) {
  const defaultContent = (
    <>
      <h6 className="text-16 font-medium text-typography-primary">
        <Trans>Earn rewards</Trans>
      </h6>

      <span className="text-13 text-typography-secondary">
        <Trans>Start earning points and unlock rewards.</Trans>
      </span>
    </>
  );

  if (!bannerData.hasPersonalizedData) {
    return defaultContent;
  }

  if (bannerData.isManuallyRewarded && bannerData.manualBonusUsd !== undefined) {
    const bonusFormatted = formatUsd(bannerData.manualBonusUsd);
    return (
      <>
        <h6 className="text-16 font-medium text-typography-primary">
          <Trans>
            You've received a points bonus worth <span className="whitespace-nowrap">{bonusFormatted}</span>
          </Trans>
        </h6>

        <span className="text-13 text-typography-secondary">
          <Trans>Start trading to activate it and use it to discount your fees.</Trans>
        </span>
      </>
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
      <>
        <h6 className="text-16 font-medium text-typography-primary">
          <Trans>Earn rewards</Trans>
        </h6>

        <span className="text-13 text-typography-secondary">
          <Trans>
            With your recent volume, staking{" "}
            <span className="font-medium text-typography-primary">{stakeFormatted} GMX</span> could have earned you up
            to{" "}
            <span className="font-medium text-typography-primary">
              ${rewardsFormatted} in additional trading rewards
            </span>
            .
          </Trans>
        </span>
      </>
    );
  }

  return defaultContent;
}
