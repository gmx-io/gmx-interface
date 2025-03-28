import { Trans } from "@lingui/macro";
import IconBolt from "img/icon-bolt.svg?react";
import { useLocalStorage } from "react-use";

import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import { getExpressTradingBannerDismissedKey } from "config/localStorage";
import { useChainId } from "lib/chains";

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
    <ColorfulBanner color="green" icon={<IconBolt />} onClose={() => setIsExpressTradingBannerDismissed(true)}>
      <div className="text-12">
        <Trans>Express Trading is enabled. Enjoy smoother, more reliable trades!</Trans>
      </div>
    </ColorfulBanner>
  );
}
