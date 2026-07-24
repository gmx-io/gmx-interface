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

import ArrowRightIcon from "img/ic_arrow_right.svg?react";
import CloseIcon from "img/ic_close.svg?react";
import GmxIcon from "img/ic_gmx_glyph.svg?react";
import rewardsBannerCoinGmx from "img/rewards_banner_coin_gmx.png";
import rewardsBannerCoinWallet from "img/rewards_banner_coin_wallet.png";

import { rewardsBannerStyles } from "./rewardsBannerStyles";
import { getRewardsPromoCopy } from "./rewardsPromoCopy";

export function TradeRewardsPromoBanner({ className }: { className?: string }) {
  const { chainId } = useChainId();
  const { account, status: walletStatus } = useWallet();
  const isWalletInitializing = useIsWalletInitializing();
  const { availability, isActive } = useIncentivesV2State();
  const { data: status, loading: statusLoading } = useAccountIncentiveStatus(chainId, {
    account,
    enabled: isActive && Boolean(account),
  });
  const { data: activity, loading: activityLoading } = useRewardsPromoActivity(chainId, {
    account,
    enabled: isActive && Boolean(account),
  });
  const [isDismissed, setIsDismissed] = useLocalStorageSerializeKeySafe<boolean>(
    [REWARDS_TRADE_PROMO_DISMISSED_KEY, chainId, account ?? "anonymous"],
    false
  );
  const config = availability.status === "active" ? availability.config : undefined;
  const { selection: promoSelection } = useStableRewardsPromoSelection({
    chainId,
    account,
    walletStatus,
    isWalletInitializing,
    enabled: isActive,
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
        actionLabel: <Trans>Learn more</Trans>,
        actionIcon: <ArrowRightIcon className="size-12" />,
        to: "/rewards",
        coin: rewardsBannerCoinWallet,
      };
    }

    if (promoSelection.variant === "recent-activity") {
      return {
        variant: promoSelection.variant,
        analyticsBanner: "trade-recent-activity" as const,
        ...copy,
        actionLabel: <Trans>Stake GMX</Trans>,
        actionIcon: <GmxIcon className="size-16" />,
        to: "/earn/portfolio",
        coin: rewardsBannerCoinGmx,
      };
    }

    return {
      variant: "rewards-program" as const,
      analyticsBanner: "trade-rewards-program" as const,
      ...copy,
      actionLabel: <Trans>Learn more</Trans>,
      actionIcon: <ArrowRightIcon className="size-12" />,
      to: "/rewards",
      coin: rewardsBannerCoinGmx,
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
        style={rewardsBannerStyles}
      >
        <Link className="relative z-10 flex min-w-0 flex-col gap-4 pr-4" onClick={handleActionClick} to={promo.to}>
          <div className="flex flex-col gap-2">
            <h6 className="text-16 font-medium text-typography-primary">{promo.title}</h6>
            <span className="text-13 text-typography-secondary">{promo.body}</span>
          </div>

          <span className="flex items-center gap-4 text-14 font-medium text-rewards-blue-300">
            {promo.actionLabel}
            {promo.actionIcon}
          </span>
        </Link>

        <img
          src={promo.coin}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[-30px] right-[-12px] size-[126px] select-none max-sm:bottom-[-22px] max-sm:right-[-36px] max-sm:size-[124px]"
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
