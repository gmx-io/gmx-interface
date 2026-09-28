import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { type MouseEvent, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";

import { REWARDS_TRADE_PROMO_DISMISSED_KEY } from "config/localStorage";
import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import { useStableRewardsPromoSelection } from "domain/synthetics/incentives/v2/rewardsPromo";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/v2/useAccountIncentiveStatus";
import { useRewardsPromoActivity } from "domain/synthetics/incentives/v2/useRewardsPromoActivity";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKeySafe } from "lib/localStorage";
import { sendRewardsBannerEvent, sendRewardsNavigationEvent } from "lib/userAnalytics/rewardsEvents";
import { useIsWalletInitializing } from "lib/wallets/useIsWalletInitializing";
import useWallet from "lib/wallets/useWallet";

import { EARN_PORTFOLIO_STAKE_GMX_LINK } from "components/Earn/Portfolio/AssetsList/GmxAssetCard/constants";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";
import CloseIcon from "img/ic_close.svg?react";
import GmxIcon from "img/ic_gmx_glyph.svg?react";

import { rewardsBannerArt } from "./rewardsBannerArt";
import { rewardsBannerAccentStyles } from "./rewardsBannerStyles";
import { getRewardsPromoCopy } from "./rewardsPromoCopy";

export function TradeRewardsPromoBanner({ className }: { className?: string }) {
  const { chainId } = useChainId();
  const { account, status: walletStatus } = useWallet();
  const isWalletInitializing = useIsWalletInitializing();
  const { availability, isActive } = useIncentivesV2State();
  const [isDismissed, setIsDismissed] = useLocalStorageSerializeKeySafe<boolean>(
    [REWARDS_TRADE_PROMO_DISMISSED_KEY, chainId, account ?? "anonymous"],
    false
  );
  const shouldLoadPersonalization = isActive && Boolean(account) && isDismissed === false;
  const { data: status, loading: statusLoading } = useAccountIncentiveStatus(chainId, {
    account,
    enabled: shouldLoadPersonalization,
  });
  const { data: activity, loading: activityLoading } = useRewardsPromoActivity(chainId, {
    account,
    enabled: shouldLoadPersonalization,
  });
  const config = availability.status === "active" ? availability.config : undefined;
  const { selection: promoSelection } = useStableRewardsPromoSelection({
    chainId,
    account,
    walletStatus,
    isWalletInitializing,
    enabled: isActive && isDismissed === false,
    config,
    status,
    statusLoading,
    activity,
    activityLoading,
  });

  const promo = useMemo(() => {
    if (!promoSelection) return undefined;

    const copy = getRewardsPromoCopy(promoSelection);

    if (promoSelection.variant === "manual-reward") {
      return {
        variant: promoSelection.variant,
        analyticsBanner: "trade-manual-reward" as const,
        ...copy,
        accent: "bonus" as const,
        actionLabel: <Trans>Learn more</Trans>,
        actionIcon: <ArrowRightIcon className="size-12" />,
        to: "/rewards",
        art: "bonus" as const,
      };
    }

    if (promoSelection.variant === "recent-activity") {
      return {
        variant: promoSelection.variant,
        analyticsBanner: "trade-recent-activity" as const,
        ...copy,
        accent: "stakeGmx" as const,
        actionLabel: <Trans>Stake GMX</Trans>,
        actionIcon: <GmxIcon className="size-16" />,
        to: EARN_PORTFOLIO_STAKE_GMX_LINK,
        art: "stake" as const,
      };
    }

    return {
      variant: "rewards-program" as const,
      analyticsBanner: "trade-rewards-program" as const,
      ...copy,
      accent: "stakeGmx" as const,
      actionLabel: <Trans>Learn more</Trans>,
      actionIcon: <ArrowRightIcon className="size-12" />,
      to: "/rewards",
      art: "stake" as const,
    };
  }, [promoSelection]);

  useEffect(() => {
    if (!promo || isDismissed) return;

    sendRewardsBannerEvent("BannerShown", promo.analyticsBanner);
  }, [isDismissed, promo]);

  if (!promo || isDismissed) return null;

  const handleDismiss = () => {
    sendRewardsBannerEvent("BannerDismiss", promo.analyticsBanner);
    setIsDismissed(true);
  };

  const handleActionClick = () => {
    sendRewardsBannerEvent("BannerClick", promo.analyticsBanner);
    sendRewardsNavigationEvent({
      source: "TradePageBanner",
      hasEstimatedRewards: promoSelection?.estimatedRewardsUsd !== undefined,
      rewardsUsd: promoSelection?.estimatedRewardsUsd,
    });
    setIsDismissed(true);
  };

  const handleDismissClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    handleDismiss();
  };

  return (
    <div className={cx("flex justify-center", className)} data-testid="trade-rewards-promo">
      <div
        className="relative grid min-h-[110px] w-full grid-cols-[minmax(0,1fr)_80px] overflow-hidden rounded-8 border-1/2 border-stroke-primary bg-slate-950 p-16"
        style={rewardsBannerAccentStyles[promo.accent]}
      >
        <Link className="relative z-10 flex min-w-0 flex-col gap-4 pr-4" onClick={handleActionClick} to={promo.to}>
          <div className="flex flex-col gap-2">
            <h6 className="text-16 font-medium text-typography-primary">{promo.title}</h6>
            <span className="text-13 text-typography-secondary">{promo.body}</span>
          </div>

          <span className="flex items-center gap-4 text-14 font-medium text-blue-300">
            {promo.actionLabel}
            {promo.actionIcon}
          </span>
        </Link>

        <img
          src={rewardsBannerArt[promo.art].src}
          alt=""
          aria-hidden="true"
          className={cx("pointer-events-none absolute select-none", rewardsBannerArt[promo.art].className)}
        />

        <button
          type="button"
          aria-label={t`Close`}
          className="absolute right-8 top-8 z-20 flex size-24 items-center justify-center text-typography-secondary opacity-50 hover:opacity-80"
          onClick={handleDismissClick}
        >
          <CloseIcon className="size-16" />
        </button>
      </div>
    </div>
  );
}
