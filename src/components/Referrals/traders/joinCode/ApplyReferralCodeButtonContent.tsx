import { Trans } from "@lingui/macro";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";

export function ApplyReferralCodeButtonContent() {
  return (
    <div className="flex items-center justify-center gap-8">
      <Trans>Apply referal code</Trans>
      <ArrowRightIcon className="-my-10 size-24" />
    </div>
  );
}
