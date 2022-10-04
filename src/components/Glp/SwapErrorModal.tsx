import { BigNumber } from "@ethersproject/bignumber";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import Modal from "../Modal/Modal";
import { get1InchSwapUrl } from "domain/common";
import { getLowestFeeTokenForBuyGlp, InfoTokens, Token } from "domain/tokens";
import { getNativeToken } from "config/tokens";

const { AddressZero } = ethers.constants;

type Props = {
  swapToken: Token;
  isVisible: boolean;
  setIsVisible: () => void;
  chainId: number;
  glpAmount: BigNumber;
  usdgSupply: BigNumber;
  totalTokenWeights: BigNumber;
  glpPrice: BigNumber;
  swapUsdMin: BigNumber;
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
    { token: Token; fees: number; amountLeftToDeposit: BigNumber } | undefined
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

  const label = `${swapToken?.symbol} Capacity Reached`;

  if (lowestFeeToken && swapUsdMin && swapUsdMin.gt(lowestFeeToken.amountLeftToDeposit)) {
    return (
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={label} className="Error-modal">
        <p>There is not enough liquidity in a single token for your size.</p>
        <p>Please check the Save on Fees section and consider splitting your order into several different ones.</p>
        <p>
          <a href={get1InchSwapUrl(chainId)} target="_blank" rel="noreferrer">
            Swap on 1inch
          </a>
        </p>
      </Modal>
    );
  }

  const nativeToken = getNativeToken(chainId);
  const inputCurrency = swapToken.address === AddressZero ? nativeToken.symbol : swapToken.address;
  const outputCurrency =
    lowestFeeToken?.token.address === AddressZero ? nativeToken.symbol : lowestFeeToken?.token.address;
  const oneInchUrl = get1InchSwapUrl(chainId, inputCurrency, outputCurrency);

  return (
    <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={label} className="Error-modal">
      <p>The pool's capacity has been reached for {swapToken.symbol}. Please use another token to buy GLP.</p>
      <p>Check the "Save on Fees" section for tokens with the lowest fees.</p>
      <p>
        <a href={oneInchUrl} target="_blank" rel="noreferrer">
          Swap {swapToken.symbol} to {lowestFeeToken?.token.symbol} on 1inch
        </a>
      </p>
    </Modal>
  );
}
