import { Trans } from "@lingui/macro";
import { useLocalStorage } from "react-use";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { getOneClickTradingPromoHiddenKey } from "config/localStorage";
import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import OneClickIcon from "img/ic_one_click.svg?react";

export function OneClickPromoBanner() {
  const { chainId } = useChainId();
  const { account } = useWallet();
  const subaccountState = useSubaccountContext();
  const settings = useSettings();
  const [isOneClickPromoHidden, setIsOneClickPromoHidden] = useLocalStorage(
    getOneClickTradingPromoHiddenKey(chainId),
    false
  );

  if (isOneClickPromoHidden || subaccountState.subaccount || !settings.expressOrdersEnabled || !account) {
    return null;
  }

  return (
    <ColorfulBanner
      color="blue"
      icon={<OneClickIcon className="-mr-6 -mt-4 ml-2" />}
      onClose={() => setIsOneClickPromoHidden(true)}
    >
      <TooltipWithPortal
        handle={
          <div
            className="clickable mr-8"
            onClick={() =>
              subaccountState.tryEnableSubaccount().then((res) => {
                if (res) {
                  setIsOneClickPromoHidden(true);
                }
              })
            }
          >
            <Trans>Enable One-Click Trading</Trans>
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
