import { Trans } from "@lingui/macro";
import { useCallback } from "react";
import { Link } from "react-router-dom";

import { JUMPER_BRIDGE_URL } from "config/links";
import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useChainId } from "lib/chains";
import { useGasPaymentTokensText } from "lib/gas/useGasPaymentTokensText";
import { getToken } from "sdk/configs/tokens";

import { ColorfulBanner, ColorfulButtonLink } from "components/ColorfulBanner/ColorfulBanner";
import ExternalLink from "components/ExternalLink/ExternalLink";

import ExpressIcon from "img/ic_express.svg?react";

export function ExpressTradingOutOfGasBanner({ onClose }: { onClose: () => void }) {
  const { chainId, srcChainId } = useChainId();
  const [, setGmxAccountModalOpen] = useGmxAccountModalOpen();
  const { gasPaymentTokenAddress } = useSettings();
  const { gasPaymentTokensText } = useGasPaymentTokensText(chainId);
  const gasPaymentTokenSymbol = getToken(chainId, gasPaymentTokenAddress).symbol;

  const onDepositClick = useCallback(() => {
    setGmxAccountModalOpen("deposit");
    onClose();
  }, [onClose, setGmxAccountModalOpen]);

  return (
    <ColorfulBanner color="red" icon={ExpressIcon}>
      <div>
        {srcChainId !== undefined ? (
          <>
            <Trans>
              Insufficient {gasPaymentTokensText} in your GMX Account. Express and One-Click Trading are unavailable.
            </Trans>
            <br />
            <ColorfulButtonLink color="blue" onClick={onDepositClick}>
              <Trans>Deposit {gasPaymentTokensText}</Trans>
            </ColorfulButtonLink>
          </>
        ) : (
          <>
            <Trans>
              Insufficient {gasPaymentTokensText} in your Wallet. Express and One-Click Trading are unavailable.
            </Trans>
            <br />
            <Trans>
              <Link
                className="underline underline-offset-2"
                to={`/trade/swap?to=${gasPaymentTokenSymbol}`}
                onClick={onClose}
              >
                Swap
              </Link>{" "}
              or <ExternalLink href={JUMPER_BRIDGE_URL}>bridge</ExternalLink> {gasPaymentTokenSymbol}.
            </Trans>
          </>
        )}
      </div>
    </ColorfulBanner>
  );
}
