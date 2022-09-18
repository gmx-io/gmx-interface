import { BigNumber } from "@ethersproject/bignumber";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getNativeToken } from "../../config/Tokens";
import { InfoToken, Token } from "../../domain/tokens/types";
import Modal from "../Modal/Modal";
import { get1InchSwapUrl } from "../../domain/common";

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
  infoTokens: {
    [key: string]: InfoToken;
  };
};

interface LowestFeeToken extends Token {
  fees: number;
}

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
}: Props) {
  const [lowestFeeToken, setLowestFeeToken] = useState<LowestFeeToken>();
  useEffect(() => {
    setLowestFeeToken(
      getLowestFeeTokenForBuyGlp(
        chainId,
        glpAmount,
        glpPrice,
        usdgSupply,
        totalTokenWeights,
        infoTokens,
        swapToken?.address
      )
    );
  }, [chainId, glpAmount, glpPrice, usdgSupply, totalTokenWeights, infoTokens, swapToken.address]);

  if (!lowestFeeToken || !swapToken) return "";

  const nativeToken = getNativeToken(chainId);
  const inputCurrency = swapToken.address === AddressZero ? nativeToken.symbol : swapToken.address;
  const outputCurrency = lowestFeeToken.address === AddressZero ? nativeToken.symbol : lowestFeeToken.address;

  const oneInchUrl = get1InchSwapUrl(chainId, inputCurrency, outputCurrency);
  const label = `${swapToken?.symbol} Capacity Reached`;

  return (
    <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={label} className="Error-modal">
      <p>The pool's capacity has been reached for {swapToken.symbol}. Please use another token to buy GLP.</p>
      <p>Check the "Save on Fees" section for tokens with the lowest fees.</p>
      <p>
        <a href={oneInchUrl} target="_blank" rel="noreferrer">
          Swap {swapToken.symbol} to {lowestFeeToken.symbol} on 1inch
        </a>
      </p>
    </Modal>
  );
}
