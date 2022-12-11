import { useMemo, useState } from "react";
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

export type SwapTokenState = {
  token?: Token;
  inputValue?: string;
  isFocused?: boolean;
  tokenAddress?: string;
  onFocus: () => void;
  onBlur: () => void;
  setInputValue: (val: string) => void;
  setValueByTokenAmount: (val?: BigNumber) => void;
  setValueByUsdAmount: (usdAmount?: BigNumber) => void;
  setTokenAddress: (val?: string) => void;
  tokenAmount: BigNumber;
  usdAmount: BigNumber;
  balance?: BigNumber;
  price?: BigNumber;
};

export function useSwapTokenState(
  tokensData: TokensData,
  params: { initialTokenAddress?: string } = {}
): SwapTokenState {
  const [inputValue, setInputValue] = useState<string>("");
  const [tokenAddress, setTokenAddress] = useState<string | undefined>(params.initialTokenAddress);
  const [isFocused, setIsFocused] = useState(false);

  const token = getTokenData(tokensData, tokenAddress);

  const state = useMemo(() => {
    function setValueByTokenAmount(amount?: BigNumber) {
      if (!token) return;

      const value = formatTokenAmount(amount, token.decimals, undefined, true);

      const formatted = value !== "0" ? value : "";

      // safe update the state
      if (formatted !== inputValue) {
        setInputValue(formatted);
      }
    }

    function setValueByUsdAmount(usdAmount?: BigNumber) {
      const nextTokenAmount = getTokenAmountFromUsd(tokensData, tokenAddress, usdAmount)!;

      setValueByTokenAmount(nextTokenAmount);
    }

    function onFocus() {
      setIsFocused(true);
    }

    function onBlur() {
      setIsFocused(false);
    }

    if (!token) {
      return {
        token: undefined,
        inputValue,
        isFocused,
        onFocus,
        onBlur,
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
      isFocused,
      onFocus,
      onBlur,
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
  }, [inputValue, isFocused, token, tokenAddress, tokensData]);

  return state;
}
