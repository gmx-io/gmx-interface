import { Trans } from "@lingui/macro";
import { useCallback, useMemo } from "react";
import { useHistory } from "react-router-dom";

import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { useChainId } from "lib/chains";
import { getGasPaymentTokens } from "sdk/configs/express";
import { getNativeToken, getToken } from "sdk/configs/tokens";

import { ColorfulBanner, ColorfulButtonLink } from "components/ColorfulBanner/ColorfulBanner";

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

  const hasEth = getNativeToken(chainId).symbol === "ETH";

  return (
    <ColorfulBanner color="blue" icon={ExpressIcon}>
      {srcChainId !== undefined ? (
        <>
          {hasEth ? (
            <Trans>Insufficient gas balance, please deposit more WETH or USDC.</Trans>
          ) : (
            <Trans>Insufficient gas balance, please deposit more USDC.</Trans>
          )}
          <br />
          <ColorfulButtonLink color="blue" onClick={onDepositClick}>
            {hasEth ? <Trans>Deposit USDC or ETH</Trans> : <Trans>Deposit USDC</Trans>}
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
    </ColorfulBanner>
  );
}
