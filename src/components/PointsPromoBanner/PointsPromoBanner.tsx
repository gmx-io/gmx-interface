import { Trans } from "@lingui/macro";
import { type MouseEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { POINTS_TRADE_BANNER_DISMISSED_KEY } from "config/localStorage";
import { isIncentivesEnabled } from "domain/synthetics/incentives/constants";
import { usePersonalizedBannerData } from "domain/synthetics/incentives/usePersonalizedBannerData";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { sendPointsPageNavigationEvent } from "lib/userAnalytics/pointsEvents";

import { EARN_PORTFOLIO_STAKE_GMX_LINK } from "components/Earn/Portfolio/AssetsList/GmxAssetCard/constants";

import bgPointsBanner from "img/bg_points_banner.png";
import ArrowRightIcon from "img/ic_arrow_right.svg?react";
import CrossIcon from "img/ic_cross.svg?react";
import GmxIcon from "img/ic_gmx_glyph.svg?react";
import pointsBannerCoinGmx from "img/points_banner_coin_gmx.png";

import { getPersonalizedBannerCopy } from "./personalizedBannerCopy";

const BANNER_STYLES = {
  backgroundImage: `url(${bgPointsBanner})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundColor: "var(--color-slate-950)",
};

type PointsTradeBannerDismissedState =
  | boolean
  | {
      dismissed: boolean;
      dismissedAfterFirstProgramEpochVolume?: boolean;
    };

function getIsDismissedForCurrentState(dismissedState: PointsTradeBannerDismissedState | undefined) {
  return typeof dismissedState === "object"
    ? dismissedState.dismissed || dismissedState.dismissedAfterFirstProgramEpochVolume === true
    : dismissedState === true;
}

export function PointsPromoBanner() {
  const { chainId } = useChainId();
  const [dismissedState, setDismissedState] = useLocalStorageSerializeKey<PointsTradeBannerDismissedState>(
    POINTS_TRADE_BANNER_DISMISSED_KEY,
    false
  );
  const [dismissedLatch, setDismissedLatch] = useState(() => getIsDismissedForCurrentState(dismissedState));
  const bannerData = usePersonalizedBannerData();
  const dismissed = dismissedLatch || getIsDismissedForCurrentState(dismissedState);

  const handleDismiss = () => {
    setDismissedLatch(true);
    setDismissedState(true);
  };

  useEffect(() => {
    if (getIsDismissedForCurrentState(dismissedState)) {
      setDismissedLatch(true);
    }
  }, [dismissedState]);

  const shouldRender =
    isIncentivesEnabled(chainId) && !dismissed && !bannerData.isLoading && bannerData.bannerVariant !== undefined;

  if (!shouldRender) {
    return null;
  }

  const { title, body } = getPersonalizedBannerCopy(bannerData);
  const isStakeCta = bannerData.bannerVariant === "recent-activity";
  const ctaTo = isStakeCta ? EARN_PORTFOLIO_STAKE_GMX_LINK : "/points";

  const handleBannerClick = () => {
    if (ctaTo === "/points") {
      sendPointsPageNavigationEvent({ source: "TradePageBanner" });
    }
    handleDismiss();
  };

  const handleDismissClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    handleDismiss();
  };

  return (
    <div className="flex justify-center">
      <Link
        className="relative grid w-full grid-cols-[minmax(0,1fr)_80px] overflow-hidden rounded-8 border-1/2 border-stroke-primary bg-slate-900/50 p-16"
        style={BANNER_STYLES}
        onClick={handleBannerClick}
        to={ctaTo}
      >
        <div className="relative z-10 flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h6 className="text-16 font-medium text-typography-primary">{title}</h6>
            <span className="text-13 text-typography-secondary">{body}</span>
          </div>

          <span className="flex items-center gap-4 text-14 font-medium text-blue-300">
            {isStakeCta ? (
              <>
                <GmxIcon className="size-16" />
                <Trans>Stake GMX</Trans>
              </>
            ) : (
              <>
                <Trans>Learn more</Trans>
                <ArrowRightIcon />
              </>
            )}
          </span>
        </div>

        <img
          src={pointsBannerCoinGmx}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[-30px] right-[-12px] size-[126px] select-none max-sm:bottom-[-22px] max-sm:right-[-36px] max-sm:size-[124px]"
        />

        <button
          className="absolute right-12 top-12 z-20 text-typography-secondary opacity-50 hover:opacity-80"
          onClick={handleDismissClick}
        >
          <CrossIcon className="size-11" />
        </button>
      </Link>
    </div>
  );
}
