import { Trans } from "@lingui/macro";

import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";

import IconInfo from "img/ic_info.svg?react";

export function ExpressTradingGasTokenSwitchedBanner({ onClose }: { onClose: () => void }) {
  return (
    <ColorfulBanner color="slate" icon={<IconInfo />} onClose={onClose}>
      <div className="ml-2 text-12">
        <Trans>Gas payment token changed due to insufficient balance in the selected token.</Trans>
      </div>
    </ColorfulBanner>
  );
}
