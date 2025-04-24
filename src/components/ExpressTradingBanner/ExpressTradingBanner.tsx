import { Trans } from "@lingui/macro";
import { useCallback } from "react";
import { useLocalStorage } from "react-use";

import { getExpressTradingBannerDismissedKey } from "config/localStorage";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useChainId } from "lib/chains";

import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import IconBolt from "img/icon-bolt.svg?react";

export function ExpressTradingBanner() {
  const { chainId } = useChainId();
  const settings = useSettings();
  const [isExpressTradingBannerDismissed, setIsExpressTradingBannerDismissed] = useLocalStorage(
    getExpressTradingBannerDismissedKey(chainId),
    false
  );

  const onClose = useCallback(() => {
    setIsExpressTradingBannerDismissed(true);
  }, [setIsExpressTradingBannerDismissed]);

  const onEnable = useCallback(() => {
    settings.setExpressOrdersEnabled(true);
    setIsExpressTradingBannerDismissed(true);
  }, [settings, setIsExpressTradingBannerDismissed]);

  if (isExpressTradingBannerDismissed || settings.expressOrdersEnabled) {
    return null;
  }

  return (
    <ColorfulBanner color="blue" icon={<IconBolt />} onClose={onClose}>
      <TooltipWithPortal
        handle={
          <div className="clickable -ml-4 mr-8" onClick={onEnable}>
            <Trans>Enable Express Trading</Trans>
          </div>
        }
        content={
          <Trans>
            Express Trading simplifies your trades on GMX. Instead of sending transactions directly and paying gas fees
            in ETH/AVAX, you sign secure off-chain messages.
            <br />
            <br />
            These messages are then processed on-chain for you, which helps reduce issues with network congestion and
            RPC errors.
          </Trans>
        }
      />
    </ColorfulBanner>
  );
}
