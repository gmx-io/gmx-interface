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
  isNotMatchAvailableBalance?: boolean;
  setInputValue: (val: string) => void;
  setValueByTokenAmount: (val?: BigNumber) => void;
  setValueByUsd: (usdAmount?: BigNumber) => void;
};

export function useTokenInput(
  tokensData: TokensData | undefined,
  params: {
    tokenAddress?: string;
    priceType: "min" | "max";
  }
): TokenInputState {
  const [inputValue, setInputValue] = useState<string>("");
  const { tokenAddress } = params;

  return useMemo(() => {
    const token = getTokenData(tokensData, tokenAddress);
    const price = params.priceType === "max" ? token?.prices?.maxPrice : token?.prices?.minPrice;
    const balance = token?.balance;
    const tokenAmount = token ? parseValue(inputValue || "0", token.decimals)! : BigNumber.from(0);
    const usdAmount = convertToUsd(tokenAmount, token?.decimals, price) || BigNumber.from(0);
    const isNotMatchAvailableBalance = balance?.gt(0) && !tokenAmount.eq(balance);

    function setValueByTokenAmount(amount?: BigNumber) {
      if (!token) return;

      const nextValue = amount?.gt(0) ? formatAmountFree(amount, token.decimals) : "";

      // safe update the state
      if (nextValue !== inputValue) {
        setInputValue(nextValue);
      }
    }

    function setValueByUsd(usdAmount?: BigNumber) {
      if (!token || !price) return;

      const nextTokenAmount = convertToTokenAmount(usdAmount || BigNumber.from(0), token.decimals, price);

      setValueByTokenAmount(nextTokenAmount);
    }

    return {
      token,
      inputValue,
      tokenAddress,
      tokenAmount,
      usdAmount,
      balance,
      price,
      isNotMatchAvailableBalance,
      setInputValue,
      setValueByTokenAmount,
      setValueByUsd,
    };
  }, [inputValue, params.priceType, tokenAddress, tokensData]);
}
