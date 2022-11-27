import { getTokenBySymbol } from "config/tokens";
import { TokensData } from "domain/synthetics/tokens/types";
import {
  formatTokenAmount,
  getTokenAmountFromUsd,
  getTokenBalance,
  getTokenConfig,
  getTokenPrice,
  getUsdFromTokenAmount,
  MOCK_GM_PRICE,
} from "domain/synthetics/tokens/utils";
import { Token } from "domain/tokens";
import { BigNumber } from "ethers";
import { GM_DECIMALS } from "lib/legacy";
import { expandDecimals, parseValue } from "lib/numbers";
import { useState } from "react";

type SwapTokenState = {
  token?: Token;
  inputValue?: string;
  tokenAddress?: string;
  setInputValue: (val?: string) => void;
  setValueByTokenAmount: (val?: BigNumber) => void;
  setValueByUsdAmount: (usdAmount?: BigNumber) => void;
  setTokenAddress: (val?: string) => void;
  tokenAmount: BigNumber;
  usdAmount: BigNumber;
  balance: BigNumber;
  price?: BigNumber;
};

// TODO: move to domain?
export function useSwapTokenState(tokensData: TokensData, initial: { tokenAddress?: string } = {}): SwapTokenState {
  const [inputValue, setInputValue] = useState<string | undefined>();
  const [tokenAddress, setTokenAddress] = useState<string | undefined>(initial.tokenAddress);

  const formattedInputValue = Number(inputValue) > 0 ? inputValue : "";

  const token = getTokenConfig(tokensData, tokenAddress);

  if (!token) {
    return {
      token: undefined,
      inputValue: formattedInputValue,
      setInputValue,
      setTokenAddress,
      setValueByTokenAmount: () => null,
      setValueByUsdAmount: () => null,
      tokenAmount: BigNumber.from(0),
      usdAmount: BigNumber.from(0),
      balance: BigNumber.from(0),
    };
  }

  const tokenAmount = parseValue(inputValue || "0", token.decimals) || BigNumber.from(0);
  const usdAmount = getUsdFromTokenAmount(tokensData, tokenAddress, tokenAmount) || BigNumber.from(0);
  const balance = getTokenBalance(tokensData, tokenAddress) || BigNumber.from(0);
  const price = getTokenPrice(tokensData, tokenAddress, true);

  function setValueByTokenAmount(amount?: BigNumber) {
    const value = formatTokenAmount(amount, token!.decimals, true);

    if (value !== inputValue) {
      setInputValue(value);
    }
  }

  function setValueByUsdAmount(usdAmount?: BigNumber) {
    const nextTokenAmount = getTokenAmountFromUsd(tokensData, tokenAddress, usdAmount)!;

    setValueByTokenAmount(nextTokenAmount);
  }

  return {
    token,
    inputValue: formattedInputValue,
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

// TODO
export function useGmTokenState(chainId: number): SwapTokenState {
  const [inputValue, setInputValue] = useState<string | undefined>();
  const formattedInputValue = Number(inputValue) > 0 ? inputValue : "";

  const token = getTokenBySymbol(chainId, "GM");

  const price = MOCK_GM_PRICE;
  const tokenAmount = parseValue(inputValue || "0", GM_DECIMALS) || BigNumber.from(0);
  const usdAmount = tokenAmount.mul(price).div(expandDecimals(1, GM_DECIMALS));
  const balance = parseValue("3.214", GM_DECIMALS)!;

  function setValueByTokenAmount(amount?: BigNumber) {
    const value = formatTokenAmount(amount, GM_DECIMALS, true);

    if (value !== inputValue) {
      setInputValue(value);
    }
  }

  function setValueByUsdAmount(usdAmount?: BigNumber) {
    if (!usdAmount || !price?.gt(0)) {
      return;
    }

    const nextTokenAmount = usdAmount.mul(expandDecimals(1, GM_DECIMALS)).div(price);

    setValueByTokenAmount(nextTokenAmount);
  }

  return {
    token,
    inputValue: formattedInputValue,
    setInputValue,
    setValueByTokenAmount,
    setValueByUsdAmount,
    setTokenAddress: () => null,
    tokenAmount,
    usdAmount,
    balance,
    price,
  };
}

export function shouldShowMaxButton(tokenState: { balance?: BigNumber; tokenAmount: BigNumber }) {
  return tokenState.balance?.gt(0) && tokenState.tokenAmount.lt(tokenState.balance);
}
