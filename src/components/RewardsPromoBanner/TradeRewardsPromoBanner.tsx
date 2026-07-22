import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { type MouseEvent, useMemo } from "react";
import { Link } from "react-router-dom";

import { REWARDS_TRADE_PROMO_DISMISSED_KEY } from "config/localStorage";
import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/v2/useAccountIncentiveStatus";
import { useRewardsPromoActivity } from "domain/synthetics/incentives/v2/useRewardsPromoActivity";
import {
  formatFactorPercentage,
  formatRewardUsd,
  getMaxRewardRateFactor,
  getRecentActivityRewardEstimateUsd,
} from "domain/synthetics/incentives/v2/utils";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKeySafe } from "lib/localStorage";
import useWallet from "lib/wallets/useWallet";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";
import CloseIcon from "img/ic_close.svg?react";
import GmxIcon from "img/ic_gmx_glyph.svg?react";
import rewardsBannerCoinGmx from "img/rewards_banner_coin_gmx.png";
import rewardsBannerCoinWallet from "img/rewards_banner_coin_wallet.png";

import { rewardsBannerStyles } from "./rewardsBannerStyles";

export function TradeRewardsPromoBanner({ className }: { className?: string }) {
  const { chainId } = useChainId();
  const { account } = useWallet();
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

  const promo = useMemo(() => {
    if (availability.status !== "active") return undefined;

    const currentStatus = status?.epochTimestamp === availability.config.epochTimestamp ? status : undefined;

    if (currentStatus?.manualRewardRemainingUsd && currentStatus.manualRewardRemainingUsd > 0n) {
      const bonus = formatRewardUsd(currentStatus.manualRewardRemainingUsd);

      return {
        variant: "manual-reward" as const,
        title: t`You've received bonus of ${bonus}`,
        body: <Trans>Start trading to redeem your rewards.</Trans>,
        actionLabel: <Trans>Learn more</Trans>,
        actionIcon: <ArrowRightIcon className="size-12" />,
        to: "/rewards",
        coin: rewardsBannerCoinWallet,
      };
    }

    const maxRewardRate = formatFactorPercentage(getMaxRewardRateFactor(availability.config));
    const estimatedRewardsUsd = activity
      ? getRecentActivityRewardEstimateUsd({
          ...activity,
          maxRewardRateFactor: getMaxRewardRateFactor(availability.config),
        })
      : undefined;

    if (estimatedRewardsUsd !== undefined) {
      const estimatedRewards = formatRewardUsd(estimatedRewardsUsd);

      return {
        variant: "recent-activity" as const,
        title: t`Earn rewards`,
        body: (
          <Trans>
            With your recent activity, staking GMX could have earned you up to {estimatedRewards} in rewards.
          </Trans>
        ),
        actionLabel: <Trans>Stake GMX</Trans>,
        actionIcon: <GmxIcon className="size-16" />,
        to: "/earn/portfolio",
        coin: rewardsBannerCoinGmx,
      };
    }

    return {
      variant: "rewards-program" as const,
      title: t`Earn rewards`,
      body: <Trans>Stake GMX and receive up to {maxRewardRate} of your fees back.</Trans>,
      actionLabel: <Trans>Learn more</Trans>,
      actionIcon: <ArrowRightIcon className="size-12" />,
      to: "/rewards",
      coin: rewardsBannerCoinGmx,
    };
  }, [activity, availability, status]);

  const isWaitingForPersonalization =
    account && (statusLoading || (promo?.variant === "rewards-program" && activityLoading));

  if (!promo || isWaitingForPersonalization || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
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
        <Link className="relative z-10 flex min-w-0 flex-col gap-4 pr-4" onClick={handleDismiss} to={promo.to}>
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
