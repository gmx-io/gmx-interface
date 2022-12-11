import {
  formatTokenAmount,
  getTokenAmountFromUsd,
  getTokenData,
  getUsdFromTokenAmount,
  TokensData,
} from "domain/synthetics/tokens";
import { Token } from "domain/tokens";
import { BigNumber } from "ethers";
import { parseValue } from "lib/numbers";
import { useState } from "react";

export type SwapTokenState = {
  token?: Token;
  inputValue?: string;
  tokenAddress?: string;
  setInputValue: (val: string) => void;
  setValueByTokenAmount: (val?: BigNumber) => void;
  setValueByUsdAmount: (usdAmount?: BigNumber) => void;
  setTokenAddress: (val?: string) => void;
  tokenAmount: BigNumber;
  usdAmount: BigNumber;
  balance?: BigNumber;
  price?: BigNumber;
};

export function useSwapTokenState(tokensData: TokensData, initial: { tokenAddress?: string } = {}): SwapTokenState {
  const [inputValue, setInputValue] = useState<string>("");
  const [tokenAddress, setTokenAddress] = useState<string | undefined>(initial.tokenAddress);

  const token = getTokenData(tokensData, tokenAddress);

  function setValueByTokenAmount(amount?: BigNumber) {
    if (!token) return;

    const value = formatTokenAmount(amount, token.decimals, undefined, true);

    // safe update the state
    if (value !== inputValue) {
      setInputValue(value);
    }
  }

  function setValueByUsdAmount(usdAmount?: BigNumber) {
    const nextTokenAmount = getTokenAmountFromUsd(tokensData, tokenAddress, usdAmount)!;

    setValueByTokenAmount(nextTokenAmount);
  }

  if (!token) {
    return {
      token: undefined,
      inputValue,
      setInputValue,
      setTokenAddress,
      setValueByTokenAmount,
      setValueByUsdAmount,
      tokenAmount: BigNumber.from(0),
      usdAmount: BigNumber.from(0),
      balance: undefined,
    };
  }

  const tokenAmount = parseValue(inputValue || "0", token.decimals) || BigNumber.from(0);
  const usdAmount = getUsdFromTokenAmount(tokensData, tokenAddress, tokenAmount) || BigNumber.from(0);
  const balance = token.balance;
  const price = token.prices?.maxPrice;

  return {
    token,
    inputValue,
    setInputValue,
    setValueByTokenAmount,
    setValueByUsdAmount,
    setTokenAddress,
    tokenAddress,
    tokenAmount,
    usdAmount,
    balance,
    price,
  };
}
