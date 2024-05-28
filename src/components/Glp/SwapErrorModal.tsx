import { useEffect, useState } from "react";
import { ethers } from "ethers";
import Modal from "../Modal/Modal";
import { get1InchSwapUrl } from "config/links";
import { getLowestFeeTokenForBuyGlp, InfoTokens, Token } from "domain/tokens";
import { getNativeToken } from "config/tokens";
import { t, Trans } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";

const { ZeroAddress } = ethers;

type Props = {
  swapToken: Token;
  isVisible: boolean;
  setIsVisible: () => void;
  chainId: number;
  glpAmount: bigint;
  usdgSupply: bigint;
  totalTokenWeights: bigint;
  glpPrice: bigint;
  swapUsdMin: bigint;
  infoTokens: InfoTokens;
};

export default function SwapErrorModal({
  swapToken,
  isVisible,
  setIsVisible,
  chainId,
  glpAmount,
  usdgSupply,
  totalTokenWeights,
  glpPrice,
  infoTokens,
  swapUsdMin,
}: Props) {
  const [lowestFeeToken, setLowestFeeToken] = useState<
    { token: Token; fees: number; amountLeftToDeposit: bigint } | undefined
  >();
  useEffect(() => {
    const lowestFeeTokenInfo = getLowestFeeTokenForBuyGlp(
      chainId,
      glpAmount,
      glpPrice,
      usdgSupply,
      totalTokenWeights,
      infoTokens,
      swapToken.address,
      swapUsdMin
    );
    setLowestFeeToken(lowestFeeTokenInfo);
  }, [chainId, glpAmount, glpPrice, usdgSupply, totalTokenWeights, infoTokens, swapUsdMin, swapToken.address]);

  const label = t`${swapToken?.symbol} Capacity Reached`;

  if (lowestFeeToken && swapUsdMin !== undefined && swapUsdMin > lowestFeeToken.amountLeftToDeposit) {
    return (
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={label} className="Error-modal">
        <p>
          <Trans>
            There is not enough liquidity in a single token for your size. Please check the Save on Fees section and
            consider splitting your order into several different ones
          </Trans>
        </p>
        <p>
          <ExternalLink href={get1InchSwapUrl(chainId)}>
            <Trans>Swap on 1inch</Trans>
          </ExternalLink>
        </p>
      </Modal>
    );
  }

  const nativeToken = getNativeToken(chainId);
  const inputCurrency = swapToken.address === ZeroAddress ? nativeToken.symbol : swapToken.address;
  const outputCurrency =
    lowestFeeToken?.token.address === ZeroAddress ? nativeToken.symbol : lowestFeeToken?.token.address;
  const oneInchUrl = get1InchSwapUrl(chainId, inputCurrency, outputCurrency);

  return (
    <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={label} className="Error-modal">
      <Trans>
        <p>The pool's capacity has been reached for {swapToken.symbol}. Please use another token to buy GLP.</p>
        <p>Check the "Save on Fees" section for tokens with the lowest fees.</p>
      </Trans>
      <p>
        <ExternalLink href={oneInchUrl}>
          <Trans>
            Swap {swapToken.symbol} to {lowestFeeToken?.token.symbol} on 1inch
          </Trans>
        </ExternalLink>
      </p>
    </Modal>
  );
}
