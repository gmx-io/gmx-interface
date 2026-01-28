import { Trans } from "@lingui/macro";
import { useCallback } from "react";
import { useHistory } from "react-router-dom";

import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { useChainId } from "lib/chains";
import { useGasPaymentTokensText } from "lib/gas/useGasPaymentTokensText";

import { ColorfulBanner, ColorfulButtonLink } from "components/ColorfulBanner/ColorfulBanner";

import ExpressIcon from "img/ic_express.svg?react";

export function ExpressTradingOutOfGasBanner({ onClose }: { onClose: () => void }) {
  const { chainId, srcChainId } = useChainId();
  const history = useHistory();
  const [, setGmxAccountModalOpen] = useGmxAccountModalOpen();
  const { gasPaymentTokensText, gasPaymentTokenSymbols } = useGasPaymentTokensText(chainId);

  const onBuyClick = useCallback(() => {
    history.push(`/trade/swap?to=${gasPaymentTokenSymbols[0]}`);
    onClose();
  }, [history, onClose, gasPaymentTokenSymbols]);
  const onDepositClick = useCallback(() => {
    setGmxAccountModalOpen("deposit");
    onClose();
  }, [onClose, setGmxAccountModalOpen]);

  return (
    <ColorfulBanner color="blue" icon={ExpressIcon}>
      <div>
        {srcChainId !== undefined ? (
          <>
            <Trans>Insufficient gas balance, please deposit more {gasPaymentTokensText}.</Trans>
            <br />
            <ColorfulButtonLink color="blue" onClick={onDepositClick}>
              <Trans>Deposit {gasPaymentTokensText}</Trans>
            </ColorfulButtonLink>
          </>
        ) : (
          <>
            <Trans>Express and One-Click Trading are unavailable due to insufficient gas balance.</Trans>
            <br />
            <ColorfulButtonLink color="blue" onClick={onBuyClick}>
              <Trans>Buy {gasPaymentTokensText}</Trans>
            </ColorfulButtonLink>
          </>
        )}
      </div>
    </ColorfulBanner>
  );
}
