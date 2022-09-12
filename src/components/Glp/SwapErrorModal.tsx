import { BigNumber } from "@ethersproject/bignumber";
import { useEffect, useState } from "react";
import { InfoToken, Token } from "../../domain/tokens/types";
import { getLowestFeeTokenForBuyGlp } from "../../lib/legacy";
import Modal from "../Modal/Modal";

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

  if (!lowestFeeToken) return "";

  const oneInchUrl = `https://app.1inch.io/#/${chainId}/swap/${swapToken.address}/${lowestFeeToken.symbol}`;
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
