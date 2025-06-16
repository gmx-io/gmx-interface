import { Trans } from "@lingui/macro";
import { useLocalStorage } from "react-use";

import { getExpressTradingBannerDismissedKey } from "config/localStorage";
import { useChainId } from "lib/chains";

import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";

import ExpressIcon from "img/ic_express.svg?react";

export function ExpressTradingEnabledBanner() {
  const { chainId } = useChainId();
  const [isExpressTradingBannerDismissed, setIsExpressTradingBannerDismissed] = useLocalStorage(
    getExpressTradingBannerDismissedKey(chainId),
    false
  );

  if (isExpressTradingBannerDismissed) {
    return null;
  }

  return (
    <ColorfulBanner
      color="green"
      icon={<ExpressIcon className="-mt-6 ml-2" />}
      onClose={() => setIsExpressTradingBannerDismissed(true)}
    >
      <div className="pl-8 text-12">
        <Trans>Express Trading is enabled. Enjoy smoother, more reliable trades!</Trans>
      </div>
    </ColorfulBanner>
  );
}
