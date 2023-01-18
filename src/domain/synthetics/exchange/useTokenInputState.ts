import { TokenData, TokensData, convertToTokenAmount, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { formatAmountFree, parseValue } from "lib/numbers";
import { useMemo, useState } from "react";

export type TokenInputState = {
  token?: TokenData;
  inputValue?: string;
  tokenAddress?: string;
  tokenAmount: BigNumber;
  usdAmount: BigNumber;
  balance?: BigNumber;
  price?: BigNumber;
  isNotMatchBalance?: boolean;
  setInputValue: (val: string) => void;
  setValueByTokenAmount: (val?: BigNumber) => void;
  setValueByUsdAmount: (usdAmount?: BigNumber) => void;
  setTokenAddress: (val?: string) => void;
};

export function useTokenInputState(
  tokensData: TokensData,
  params: {
    priceType: "minPrice" | "maxPrice";
    initialTokenAddress?: string;
  }
): TokenInputState {
  const [inputValue, setInputValue] = useState<string>("");
  const [tokenAddress, setTokenAddress] = useState<string | undefined>(params.initialTokenAddress);

  const token = getTokenData(tokensData, tokenAddress);
  const price = params.priceType === "maxPrice" ? token?.prices?.maxPrice : token?.prices?.minPrice;

  const state = useMemo(() => {
    function setValueByTokenAmount(amount?: BigNumber) {
      if (!token) return;

      const nextValue = amount?.gt(0) ? formatAmountFree(amount, token.decimals) : "";

      // safe update the state
      if (nextValue !== inputValue) {
        setInputValue(nextValue);
      }
    }

    function setValueByUsdAmount(usdAmount?: BigNumber) {
      if (!token || !price) return;

      const nextTokenAmount = convertToTokenAmount(usdAmount || BigNumber.from(0), token.decimals, price);

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
        isNotMatchBalance: false,
        setInputValue,
        setTokenAddress,
        setValueByTokenAmount,
        setValueByUsdAmount,
      };
    }

    const balance = token.balance;
    const tokenAmount = parseValue(inputValue || "0", token.decimals) || BigNumber.from(0);
    const usdAmount = convertToUsd(tokenAmount, token.decimals, price) || BigNumber.from(0);

    const isNotMatchBalance = balance?.gt(0) && !tokenAmount.eq(balance);

    return {
      token,
      inputValue,
      tokenAddress,
      tokenAmount,
      usdAmount,
      balance,
      price,
      isNotMatchBalance,
      setInputValue,
      setValueByTokenAmount,
      setValueByUsdAmount,
      setTokenAddress,
    };
  }, [inputValue, price, token, tokenAddress]);

  return state;
}
