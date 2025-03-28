import { Trans } from "@lingui/macro";
import { useLocalStorage } from "react-use";
import { useChainId } from "lib/chains";
import { getExpressTradingBannerDismissedKey } from "config/localStorage";
import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import IconBolt from "img/icon-bolt.svg?react";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";

export function ExpressTradingBanner() {
  const { chainId } = useChainId();
  const settings = useSettings();
  const [isExpressTradingBannerDismissed, setIsExpressTradingBannerDismissed] = useLocalStorage(
    getExpressTradingBannerDismissedKey(chainId),
    false
  );

  if (isExpressTradingBannerDismissed || settings.expressOrdersEnabled) {
    return null;
  }

  return (
    <ColorfulBanner color="blue" icon={<IconBolt />} onClose={() => setIsExpressTradingBannerDismissed(true)}>
      <TooltipWithPortal
        handle={
          <div
            className="clickable -ml-4 mr-8"
            onClick={() => {
              settings.setExpressOrdersEnabled(true);
              setIsExpressTradingBannerDismissed(true);
            }}
          >
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
