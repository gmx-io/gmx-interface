import { Trans, t } from "@lingui/macro";
import { useEffect } from "react";

import {
  sendRewardsVestingStartedDialogActionEvent,
  sendRewardsVestingStartedDialogShownEvent,
} from "lib/userAnalytics/rewardsEvents";

import Button from "components/Button/Button";
import ModalWithPortal from "components/Modal/ModalWithPortal";

import rewardsVestingReferralSrc from "img/rewards_vesting_referral.jpg";

export const REWARDS_VESTING_STARTED_INVITE_LINK = "/referrals/affiliates";

type Props = {
  isVisible: boolean;
  onClose: () => void;
};

export function RewardsVestingStartedModal({ isVisible, onClose }: Props) {
  useEffect(() => {
    if (!isVisible) return;

    sendRewardsVestingStartedDialogShownEvent();
  }, [isVisible]);

  return (
    <ModalWithPortal
      isVisible={isVisible}
      setIsVisible={(nextIsVisible) => {
        if (!nextIsVisible) onClose();
      }}
      label={t`Your esGMX is now vesting!`}
      contentClassName="w-[420px] gap-0"
      hideHeaderBorder
      withMobileBottomPosition
      qa="rewards-vesting-started-modal"
    >
      <div className="flex flex-col gap-16">
        <p className="text-body-medium text-typography-secondary">
          <Trans>
            Did you know you can earn more rewards by inviting other traders? Receive 50% of the rewards earned by
            traders you refer.
          </Trans>
        </p>

        <img
          src={rewardsVestingReferralSrc}
          alt=""
          aria-hidden="true"
          className="pointer-events-none aspect-[380/195] w-full select-none rounded-12 object-cover"
        />

        <div className="flex flex-col gap-8">
          <Button
            variant="primary"
            size="medium"
            className="w-full"
            to={REWARDS_VESTING_STARTED_INVITE_LINK}
            onClick={() => {
              sendRewardsVestingStartedDialogActionEvent("InviteTraders");
              onClose();
            }}
          >
            <Trans>Invite traders</Trans>
          </Button>
          <Button
            variant="ghost"
            size="medium"
            className="w-full"
            onClick={() => {
              sendRewardsVestingStartedDialogActionEvent("Skip");
              onClose();
            }}
          >
            <Trans>Skip</Trans>
          </Button>
        </div>
      </div>
    </ModalWithPortal>
  );
}
