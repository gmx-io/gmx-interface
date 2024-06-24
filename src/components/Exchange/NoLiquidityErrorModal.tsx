import { ethers } from "ethers";
import Modal from "../Modal/Modal";
import { get1InchSwapUrl } from "config/links";
import { Token, TokenInfo } from "domain/tokens";
import { getNativeToken } from "config/tokens";
import { t, Trans } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";

const { ZeroAddress } = ethers;

type Props = {
  chainId: number;
  modalError: string;
  isShort: boolean;
  isLong: boolean;
  fromToken: Token;
  toToken: Token;
  shortCollateralToken: TokenInfo;
  setModalError: () => void;
};

export default function NoLiquidityErrorModal({
  chainId,
  fromToken,
  toToken,
  shortCollateralToken,
  isLong,
  isShort,
  modalError,
  setModalError,
}: Props) {
  const nativeToken = getNativeToken(chainId);
  const inputCurrency = fromToken.address === ZeroAddress ? nativeToken.symbol : fromToken.address;
  let outputCurrency;
  if (isLong) {
    outputCurrency = toToken.address === ZeroAddress ? nativeToken.symbol : toToken.address;
  } else {
    outputCurrency = shortCollateralToken.address;
  }
  const swapTokenSymbol = isLong ? toToken.symbol : shortCollateralToken.symbol;
  const oneInchSwapUrl = get1InchSwapUrl(chainId, inputCurrency, outputCurrency);
  const label =
    modalError === "BUFFER" ? t`${shortCollateralToken.symbol} Required` : t`${fromToken.symbol} Pool Capacity Reached`;

  return (
    <Modal isVisible={Boolean(modalError)} setIsVisible={setModalError} label={label} className="Error-modal text-15">
      <div>
        <Trans>
          You need to select {swapTokenSymbol} as the "Pay" token to use it for collateral to initiate this trade.
        </Trans>
      </div>
      <br />
      <div>
        <Trans>
          As there is not enough liquidity in GLP to swap {fromToken.symbol} to {swapTokenSymbol}, you can use the
          option below to do so:
        </Trans>
      </div>
      <br />

      <ExternalLink href={oneInchSwapUrl}>
        <Trans>Buy {swapTokenSymbol} on 1inch</Trans>
      </ExternalLink>

      {isShort && (
        <div>
          <br />
          <Trans>Alternatively, you can select a different "Collateral In" token.</Trans>
          <br />
        </div>
      )}
    </Modal>
  );
}
