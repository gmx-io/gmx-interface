import { Trans } from "@lingui/macro";

import ReferralsFilledIcon from "img/ic_referrals_filled.svg?react";
import ShareArrowFilledIcon from "img/ic_share_arrow_filled.svg?react";
import WalletIcon from "img/ic_wallet.svg?react";

export function HowToStartEarning() {
  return (
    <div className="flex flex-col gap-8">
      <h3 className="mb-12 mt-20 text-20 font-medium leading-1 text-white max-lg:mb-8 max-lg:mt-12">
        <Trans>How to start earning?</Trans>
      </h3>
      <div className="flex gap-8 max-lg:flex-col">
        <div className="flex flex-1 items-center gap-12 rounded-8 border-1/2 border-stroke-primary p-adaptive">
          <WalletIcon className="size-28 shrink-0 text-blue-300 max-lg:size-24" />
          <span className="text-16 font-medium max-lg:text-14">
            <Trans>Connect wallet</Trans>
          </span>
        </div>
        <div className="flex flex-1 items-center gap-12 rounded-8 border-1/2 border-stroke-primary p-adaptive">
          <ReferralsFilledIcon className="size-28 shrink-0 text-blue-300 max-lg:size-24" />
          <span className="text-16 font-medium max-lg:text-14">
            <Trans>Create referral code</Trans>
          </span>
        </div>
        <div className="flex flex-1 items-center gap-12 rounded-8 border-1/2 border-stroke-primary p-adaptive">
          <ShareArrowFilledIcon className="size-28 shrink-0 text-blue-300 max-lg:size-24" />
          <span className="text-16 font-medium max-lg:text-14">
            <Trans>Share and receive rebates</Trans>
          </span>
        </div>
      </div>
    </div>
  );
}
