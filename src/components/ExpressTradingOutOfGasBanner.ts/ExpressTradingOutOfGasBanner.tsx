import { Trans } from "@lingui/macro";
import { useCallback, useMemo } from "react";
import { useHistory } from "react-router-dom";

import { useChainId } from "lib/chains";
import { getGasPaymentTokens } from "sdk/configs/express";
import { getToken } from "sdk/configs/tokens";

import Button from "components/Button/Button";
import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";

import ExpressIcon from "img/ic_express.svg?react";

export function useGasPaymentTokensText(chainId: number) {
  const gasPaymentTokenSymbols = useMemo(
    () => getGasPaymentTokens(chainId).map((tokenAddress) => getToken(chainId, tokenAddress)?.symbol),
    [chainId]
  );

  const gasPaymentTokensText = gasPaymentTokenSymbols.reduce((acc, symbol, index) => {
    if (index === 0) {
      return symbol;
    }

    if (index < gasPaymentTokenSymbols.length - 1) {
      return `${acc}, ${symbol}`;
    }

    return `${acc} or ${symbol}`;
  }, "");

  return {
    gasPaymentTokensText,
    gasPaymentTokenSymbols,
  };
}

export function ExpressTradingOutOfGasBanner({ onClose }: { onClose: () => void }) {
  const { chainId } = useChainId();
  const history = useHistory();

  const { gasPaymentTokensText, gasPaymentTokenSymbols } = useGasPaymentTokensText(chainId);

  const onClick = useCallback(() => {
    history.push(`/trade/swap?to=${gasPaymentTokenSymbols[0]}`);
    onClose();
  }, [history, onClose, gasPaymentTokenSymbols]);

  return (
    <ColorfulBanner color="slate" icon={<ExpressIcon className="-mt-6" />}>
      <div className="mr-8 pl-8 text-12">
        <Trans>Express and One-Click Trading are unavailable due to insufficient gas balance.</Trans>
        <br />
        <Button variant="link" className="mt-2 !text-12" onClick={onClick}>
          <Trans>Buy {gasPaymentTokensText}</Trans>
        </Button>
      </div>
    </ColorfulBanner>
  );
}
