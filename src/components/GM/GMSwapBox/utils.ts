import { getTokenBySymbol } from "config/tokens";
import { TokensData } from "domain/synthetics/tokens/types";
import {
  getTokenAmountFromUsd,
  getTokenBalance,
  getTokenConfig,
  getTokenPrice,
  getUsdFromTokenAmount,
} from "domain/synthetics/tokens/utils";
import { Token } from "domain/tokens";
import { BigNumber } from "ethers";
import { GM_DECIMALS, USD_DECIMALS } from "lib/legacy";
import { expandDecimals, formatAmount, formatAmountFree, parseValue } from "lib/numbers";
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

  const price = parseValue("100", USD_DECIMALS)!;
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

export function formatTokenAmount(amount?: BigNumber, tokenDecimals?: number, showAllSignificant?: boolean) {
  if (!tokenDecimals || !amount) return formatAmount(BigNumber.from(0), 4, 4);

  if (showAllSignificant) return formatAmountFree(amount, tokenDecimals, tokenDecimals);

  return formatAmount(amount, tokenDecimals, 4);
}

export function formatUsdAmount(amount?: BigNumber) {
  return `$${formatAmount(amount || BigNumber.from(0), USD_DECIMALS, 2, true)}`;
}

export function formatPriceImpact(p: { priceImpactBasisPoints: BigNumber; priceImpactDiff: BigNumber }) {
  if (!p.priceImpactBasisPoints.gt(0)) {
    return "...";
  }

  const formattedUsd = formatUsdAmount(p.priceImpactDiff);
  const formattedBp = formatAmount(p.priceImpactBasisPoints, 2, 2);

  return `${formattedBp}% ($${formattedUsd})`;
}

export function shouldShowMaxButton(tokenState: { balance?: BigNumber; tokenAmount: BigNumber }) {
  return tokenState.balance?.gt(0) && tokenState.tokenAmount.lt(tokenState.balance);
}

// export function getDeltas(
//   selectedMarket: SyntheticsMarket,
//   operationType: OperationType,
//   tokenAmounts: { usdAmount: BigNumber; symbol: string }[]
// ) {
//   const deltas = {
//     longDelta: BigNumber.from(0),
//     shortDelta: BigNumber.from(0),
//   };

//   const deltas = tokenAmounts.reduce(
//     (acc, { usdAmount, symbol }) => {
//       if (usdAmount?.lte(0)) {
//         return acc;
//       }

//       if (symbol === selectedMarket.longCollateralSymbol) {
//         acc.longDelta;
//       }

//       if (tokenState.usdAmount.gt(0)) {
//         if (tokenState.token?.symbol === p.selectedMarket.longCollateralSymbol) {
//           acc.longDelta = tokenState.usdAmount;
//         } else if (tokenState.token?.symbol === p.selectedMarket.shortCollateralSymbol) {
//           acc.shortDelta = tokenState.usdAmount;
//         }
//       }

//       return acc;
//     },
//     {
//       longDelta: BigNumber.from(0),
//       shortDelta: BigNumber.from(0),
//     }
//   );
// }
