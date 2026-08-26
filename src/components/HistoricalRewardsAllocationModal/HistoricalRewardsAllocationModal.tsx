import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { useEffect } from "react";
import { Link } from "react-router-dom";

import { formatRewardUsd } from "domain/synthetics/incentives/v2/utils";
import {
  sendRewardsManualAllocationDialogActionEvent,
  sendRewardsManualAllocationDialogShownEvent,
} from "lib/userAnalytics/rewardsEvents";

import Button from "components/Button/Button";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import { rewardsBannerArt } from "components/RewardsPromoBanner/rewardsBannerArt";
import { rewardsBannerAccentStyles } from "components/RewardsPromoBanner/rewardsBannerStyles";

import RewardsIcon from "img/ic_rewards.svg?react";
import ShareIcon from "img/ic_share_arrow_filled.svg?react";

type Props = {
  isVisible: boolean;
  onClose: () => void;
  rewardCapUsd?: bigint;
  rewardConsumedUsd?: bigint;
  rewardRemainingUsd?: bigint;
};

export function HistoricalRewardsAllocationModal({
  isVisible,
  onClose,
  rewardCapUsd,
  rewardConsumedUsd,
  rewardRemainingUsd,
}: Props) {
  const cap = rewardCapUsd === undefined ? "-" : formatRewardUsd(rewardCapUsd);
  const consumed = rewardConsumedUsd === undefined ? "-" : formatRewardUsd(rewardConsumedUsd);
  const remaining = rewardRemainingUsd === undefined ? "-" : formatRewardUsd(rewardRemainingUsd);

  useEffect(() => {
    if (!isVisible) return;

    sendRewardsManualAllocationDialogShownEvent({
      rewardCapUsd,
      rewardConsumedUsd,
      rewardRemainingUsd,
    });
  }, [isVisible, rewardCapUsd, rewardConsumedUsd, rewardRemainingUsd]);

  return (
    <ModalWithPortal
      isVisible={isVisible}
      setIsVisible={(nextIsVisible) => {
        if (!nextIsVisible) onClose();
      }}
      label={t`You've received a rewards bonus!`}
      contentClassName="w-[420px]"
      contentPadding={false}
      hideHeaderBorder
      withMobileBottomPosition
    >
      <div className="flex flex-col gap-20 pt-12">
        <div className="flex flex-col gap-12 px-adaptive">
          <div className="flex flex-col gap-4">
            <p className="text-12 font-medium text-typography-secondary">
              <Trans>Bonus remaining</Trans>
            </p>
            <div className="flex items-center gap-8">
              <div className="flex items-center justify-center rounded-full bg-cold-blue-900 p-6 text-blue-100">
                <RewardsIcon className="size-24" />
              </div>
              <span className="text-[40px] font-medium leading-[1.1] tracking-[-0.016em] text-typography-primary">
                {remaining}
              </span>
            </div>
            <p className="text-12 text-typography-secondary">
              <Trans>
                {consumed} used out of a {cap} reward cap
              </Trans>
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-14 font-medium text-blue-100">
              <Trans>
                As a thank-you for your previous trading on GMX, your account has a bonus reward cap. Start trading to
                activate it and earn esGMX and GT rewards.
              </Trans>
            </p>
            <Link
              to="/rewards"
              className="text-14 font-medium text-blue-300"
              onClick={() => {
                sendRewardsManualAllocationDialogActionEvent("LearnMore");
                onClose();
              }}
            >
              <Trans>Learn more about the rewards program</Trans> →
            </Link>
          </div>

          <Button
            variant="primary"
            className="mt-8 w-full"
            to="/trade"
            size="medium"
            onClick={() => {
              sendRewardsManualAllocationDialogActionEvent("Trade");
              onClose();
            }}
          >
            <Trans>Start trading</Trans>
          </Button>
        </div>

        <div className="border-t-1/2 border-stroke-primary" />

        <div className="px-adaptive pb-adaptive">
          <Link
            to="/referrals"
            onClick={() => {
              sendRewardsManualAllocationDialogActionEvent("Share");
              onClose();
            }}
            className="relative grid grid-cols-[minmax(0,1fr)_72px] overflow-hidden rounded-8 border-1/2 border-stroke-primary bg-slate-950 p-12"
            style={rewardsBannerAccentStyles.referral}
          >
            <div className="relative z-10 flex min-w-0 flex-col gap-2">
              <h6 className="text-14 font-medium text-typography-primary">
                <Trans>Know someone who traded on GMX?</Trans>
              </h6>
              <p className="text-14 text-typography-secondary">
                <Trans>Share the rewards program and let them check their allocation.</Trans>
              </p>
              <span className="mt-2 flex items-center gap-4 text-14 font-medium text-blue-300">
                <Trans>Share your rewards</Trans>
                <ShareIcon className="size-12" />
              </span>
            </div>
            <img
              src={rewardsBannerArt.referral.src}
              alt=""
              aria-hidden="true"
              className={cx("pointer-events-none absolute select-none", rewardsBannerArt.referral.className)}
            />
          </Link>
        </div>
      </div>
    </ModalWithPortal>
  );
}
