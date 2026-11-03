import { Trans } from "@lingui/macro";

import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";

import InfoIcon from "img/ic_info.svg?react";

export function SkipReferralCodeBanner({ onClose }: { onClose: () => void }) {
  return (
    <ColorfulBanner color="blue" icon={InfoIcon} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <span className="font-medium text-blue-strong">
          <Trans>Skip creating a referral code?</Trans>
        </span>
        <span className="text-blue-secondary">
          <Trans>Earn rewards by sharing your referral code</Trans>
        </span>
      </div>
    </ColorfulBanner>
  );
}
