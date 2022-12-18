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
  tokenAddress?: string;
  tokenAmount: BigNumber;
  usdAmount: BigNumber;
  balance?: BigNumber;
  price?: BigNumber;
  shouldShowMaxButton?: boolean;
  setInputValue: (val: string) => void;
  setValueByTokenAmount: (val?: BigNumber) => void;
  setValueByUsdAmount: (usdAmount?: BigNumber) => void;
  setTokenAddress: (val?: string) => void;
};

export function useSwapTokenState(
  tokensData: TokensData,
  params: { initialTokenAddress?: string } = {}
): SwapTokenState {
  const [inputValue, setInputValue] = useState<string>("");
  const [tokenAddress, setTokenAddress] = useState<string | undefined>(params.initialTokenAddress);

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

    if (!token) {
      return {
        token: undefined,
        inputValue,
        tokenAmount: BigNumber.from(0),
        usdAmount: BigNumber.from(0),
        balance: undefined,
        price: undefined,
        shouldShowMaxButton: false,
        setInputValue,
        setTokenAddress,
        setValueByTokenAmount,
        setValueByUsdAmount,
      };
    }

    const tokenAmount = parseValue(inputValue || "0", token.decimals) || BigNumber.from(0);
    const usdAmount = getUsdFromTokenAmount(tokensData, tokenAddress, tokenAmount) || BigNumber.from(0);
    const balance = token.balance;
    const price = token.prices?.maxPrice;
    const shouldShowMaxButton = balance?.gt(0) && !tokenAmount.eq(balance);

    return {
      token,
      inputValue,
      tokenAddress,
      tokenAmount,
      usdAmount,
      balance,
      price,
      shouldShowMaxButton,
      setInputValue,
      setValueByTokenAmount,
      setValueByUsdAmount,
      setTokenAddress,
    };
  }, [inputValue, token, tokenAddress, tokensData]);

  return state;
}
