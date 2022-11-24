import { getTokenInfo, getUsd, InfoTokens, TokenInfo } from "domain/tokens";
import { BigNumber } from "ethers";
import { GM_DECIMALS, USD_DECIMALS } from "lib/legacy";
import { expandDecimals, formatAmount, formatAmountFree, parseValue } from "lib/numbers";
import { useState } from "react";

type SwapTokenState = {
  info?: TokenInfo;
  inputValue?: string;
  tokenAddress?: string;
  setInputValue: (val?: string) => void;
  setValueByTokenAmount: (val: BigNumber) => void;
  setTokenAddress: (val?: string) => void;
  tokenAmount: BigNumber;
  usdAmount: BigNumber;
  balance: BigNumber;
  tokenAmountFormatted: string;
  usdAmountFormatted: string;
  balanceFormatted: string;
};

// TODO: move to domain?
export function useSwapTokenState(infoTokens: InfoTokens, initial: { tokenAddress?: string } = {}): SwapTokenState {
  const [inputValue, setInputValue] = useState<string | undefined>();
  const [tokenAddress, setTokenAddress] = useState<string | undefined>(initial.tokenAddress);

  const formattedInputValue = Number(inputValue) > 0 ? inputValue : "";

  if (!tokenAddress) {
    return {
      info: undefined,
      inputValue: formattedInputValue,
      setInputValue,
      setTokenAddress,
      setValueByTokenAmount: () => null,
      tokenAmount: BigNumber.from(0),
      usdAmount: BigNumber.from(0),
      balance: BigNumber.from(0),
      tokenAmountFormatted: formatAmount(BigNumber.from(0), 4, 4),
      usdAmountFormatted: `$${formatAmount(BigNumber.from(0), 2, 2, true)}`,
      balanceFormatted: formatAmount(BigNumber.from(0), 4, 4),
    };
  }

  const info = getTokenInfo(infoTokens, tokenAddress);

  if (!info) {
    return {
      info: undefined,
      inputValue: formattedInputValue,
      setInputValue,
      setTokenAddress,
      setValueByTokenAmount: () => null,
      tokenAmount: BigNumber.from(0),
      usdAmount: BigNumber.from(0),
      balance: BigNumber.from(0),
      tokenAmountFormatted: formatAmount(BigNumber.from(0), 4, 4),
      usdAmountFormatted: `$${formatAmount(BigNumber.from(0), 2, 2, true)}`,
      balanceFormatted: formatAmount(BigNumber.from(0), 4, 4),
    };
  }

  const tokenAmount = parseValue(inputValue || "0", info.decimals) || BigNumber.from(0);
  const usdAmount = getUsd(tokenAmount, tokenAddress, false, infoTokens) || BigNumber.from(0);
  const balance = info.balance || BigNumber.from(0);

  const tokenAmountFormatted = formatAmount(tokenAmount, info.decimals, 4);
  const usdAmountFormatted = `$${formatAmount(usdAmount, USD_DECIMALS, 2, true)}`;
  const balanceFormatted = formatAmount(balance, info.decimals, 4);

  function setValueByTokenAmount(amount: BigNumber) {
    const value = formatAmountFree(amount, info.decimals, info.decimals);
    setInputValue(value);
  }

  return {
    inputValue: formattedInputValue,
    setInputValue,
    setValueByTokenAmount,
    setTokenAddress,
    info,
    tokenAddress,
    tokenAmount,
    usdAmount,
    balance,
    tokenAmountFormatted,
    usdAmountFormatted,
    balanceFormatted,
  };
}

// TODO
export function useGmTokenState() {
  const [inputValue, setInputValue] = useState<string | undefined>();
  const formattedInputValue = Number(inputValue) > 0 ? inputValue : "";

  const gmPrice = parseValue("100", USD_DECIMALS)!;

  const tokenAmount = parseValue(inputValue || "0", GM_DECIMALS) || BigNumber.from(0);
  const usdAmount = tokenAmount.mul(gmPrice).div(expandDecimals(1, GM_DECIMALS));
  const balance = parseValue("3.214", GM_DECIMALS)!;

  const tokenAmountFormatted = formatAmount(tokenAmount, GM_DECIMALS, 4);
  const usdAmountFormatted = `$${formatAmount(usdAmount, USD_DECIMALS, 2, true)}`;
  const balanceFormatted = formatAmount(balance, GM_DECIMALS, 4);

  function setValueByTokenAmount(amount: BigNumber) {
    const value = formatAmountFree(amount, GM_DECIMALS, GM_DECIMALS);
    setInputValue(value);
  }

  return {
    inputValue: formattedInputValue,
    setInputValue,
    setValueByTokenAmount,
    tokenAmount,
    usdAmount,
    balance,
    gmPrice,
    tokenAmountFormatted,
    usdAmountFormatted,
    balanceFormatted,
  };
}

export function shouldShowMaxButton(tokenState: { balance?: BigNumber; tokenAmount: BigNumber }) {
  return tokenState.balance?.gt(0) && tokenState.tokenAmount.lt(tokenState.balance);
}
