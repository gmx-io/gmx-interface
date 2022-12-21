import { t } from "@lingui/macro";
import { NATIVE_TOKEN_ADDRESS, getWrappedToken } from "config/tokens";
import { getMarkets, useMarketsData } from "domain/synthetics/markets";
import {
  adaptToInfoTokens,
  convertFromUsdByPrice,
  convertToUsdByPrice,
  getTokenData,
  TokensData,
  useAvailableTradeTokensData,
} from "domain/synthetics/tokens";
import { Token } from "domain/tokens";
import { BigNumber } from "ethers";

import longImg from "img/long.svg";
import shortImg from "img/short.svg";
import swapImg from "img/swap.svg";
import { useChainId } from "lib/chains";
import { BASIS_POINTS_DIVISOR, PRECISION, USD_DECIMALS } from "lib/legacy";
import { parseValue } from "lib/numbers";
import { useMemo, useState } from "react";

export enum Operation {
  Long = "Long",
  Short = "Short",
  Swap = "Swap",
}

export enum Mode {
  Market = "Market",
  Limit = "Limit",
  Trigger = "Trigger",
}

export const operationTexts = {
  [Operation.Long]: t`Long`,
  [Operation.Short]: t`Short`,
  [Operation.Swap]: t`Swap`,
};

export const operationIcons = {
  [Operation.Long]: longImg,
  [Operation.Short]: shortImg,
  [Operation.Swap]: swapImg,
};

export const modeTexts = {
  [Mode.Market]: t`Market`,
  [Mode.Limit]: t`Limit`,
  [Mode.Trigger]: t`Trigger`,
};

export const avaialbleModes = {
  [Operation.Long]: [Mode.Market, Mode.Limit],
  [Operation.Short]: [Mode.Market, Mode.Limit],
  [Operation.Swap]: [Mode.Market, Mode.Limit],
};

const TRIGGER_RATIO_PRECISION = PRECISION;
const LEVERAGE_PRECISION = BigNumber.from(BASIS_POINTS_DIVISOR);

export function getSubmitError(p: {
  operationType: Operation;
  mode: Mode;
  tokensData: TokensData;
  fromTokenAddress?: string;
  fromTokenAmount?: BigNumber;
  toTokenAddress?: string;
  swapPath?: string[];
}) {
  const fromToken = getTokenData(p.tokensData, p.fromTokenAddress);

  if (!fromToken) {
    return t`Loading...`;
  }

  if (p.fromTokenAmount?.gt(fromToken.balance || BigNumber.from(0))) {
    return t`Insufficient ${fromToken.symbol} balance`;
  }

  if (p.operationType === Operation.Swap) {
    if (p.fromTokenAddress === p.toTokenAddress) {
      return t`Select different tokens`;
    }
  }

  if (!p.fromTokenAmount?.gt(0)) {
    return t`Enter an amount`;
  }

  if (!p.swapPath) {
    return t`Couldn't find a swap path`;
  }
}

export function getNextTokenAmount(p: {
  fromTokenAmount: BigNumber;
  fromTokenPrice: BigNumber;
  fromToken: Token;
  toToken: Token;
  toTokenPrice: BigNumber;
  triggerPrice?: BigNumber;
  shouldInvertTriggerPrice?: boolean;
  swapTriggerRatio?: BigNumber;
  shouldInvertRatio?: boolean;
  leverageMultiplier?: BigNumber;
  shouldInvertLeverage?: boolean;
}) {
  const fromUsdAmount = convertToUsdByPrice(p.fromTokenAmount, p.fromToken.decimals, p.fromTokenPrice);

  let toAmount = convertFromUsdByPrice(fromUsdAmount, p.toToken.decimals, p.toTokenPrice);

  if (!toAmount || !fromUsdAmount) return undefined;

  if (p.swapTriggerRatio?.gt(0)) {
    const ratio = p.shouldInvertRatio
      ? p.swapTriggerRatio
      : TRIGGER_RATIO_PRECISION.mul(TRIGGER_RATIO_PRECISION).div(p.swapTriggerRatio);

    toAmount = p.fromTokenAmount.mul(ratio).div(TRIGGER_RATIO_PRECISION);
  } else if (p.triggerPrice?.gt(0)) {
    if (p.shouldInvertTriggerPrice) {
      const toAmountUsd = convertToUsdByPrice(p.fromTokenAmount, p.fromToken.decimals, p.triggerPrice);

      toAmount = convertFromUsdByPrice(toAmountUsd, p.toToken.decimals, p.toTokenPrice);
    } else {
      toAmount = convertFromUsdByPrice(fromUsdAmount, p.toToken.decimals, p.triggerPrice);
    }
  }

  if (p.leverageMultiplier) {
    const leverage = p.shouldInvertLeverage
      ? LEVERAGE_PRECISION.mul(LEVERAGE_PRECISION).div(p.leverageMultiplier)
      : p.leverageMultiplier;

    toAmount = toAmount?.mul(leverage).div(LEVERAGE_PRECISION);
  }

  return toAmount;
}

export type SwapTriggerRatioState = {
  inputValue: string;
  setInputValue: (v: string) => void;
  ratio: BigNumber;
  biggestSide: "from" | "to";
  markRatio: BigNumber;
};

export function useSwapTriggerRatioState(p: {
  isAllowed: boolean;
  fromTokenPrice?: BigNumber;
  toTokenPrice?: BigNumber;
}): SwapTriggerRatioState | undefined {
  const [inputValue, setInputValue] = useState("");

  if (!p.isAllowed || !p.fromTokenPrice || !p.toTokenPrice) return undefined;

  const ratio = parseValue(inputValue || "0", USD_DECIMALS)!;

  const biggestSide = p.fromTokenPrice.gt(p.toTokenPrice) ? "from" : "to";

  let markRatio =
    biggestSide === "from"
      ? p.fromTokenPrice.mul(PRECISION).div(p.toTokenPrice)
      : p.fromTokenPrice.mul(PRECISION).div(p.toTokenPrice);

  return {
    inputValue,
    setInputValue,
    ratio,
    biggestSide,
    markRatio,
  };
}

export function useAvailableSwapTokens(p: { fromTokenAddress?: string; isSwap: boolean }) {
  const { chainId } = useChainId();

  const marketsData = useMarketsData(chainId);
  const tokensData = useAvailableTradeTokensData(chainId);

  const wrappedToken = getWrappedToken(chainId);
  const markets = getMarkets(marketsData);

  const infoTokens = useMemo(() => adaptToInfoTokens(tokensData), [tokensData]);

  const { longCollaterals, shortCollaterals, indexTokens, indexCollateralsMap } = useMemo(() => {
    const longMap: { [key: string]: Token } = {};
    const shortMap: { [key: string]: Token } = {};
    const indexMap: { [key: string]: Token } = {};

    const indexCollateralsMap: { [key: string]: { [key: string]: Token } } = {};

    for (const market of markets) {
      const longToken = getTokenData(tokensData, market.longTokenAddress)!;
      const shortToken = getTokenData(tokensData, market.shortTokenAddress)!;
      const indexToken = getTokenData(tokensData, market.indexTokenAddress)!;

      longMap[longToken.address] = longToken;
      shortMap[shortToken.address] = shortToken;
      indexMap[indexToken.address] = indexToken;

      indexCollateralsMap[indexToken.address] = indexCollateralsMap[indexToken.address] || {};

      indexCollateralsMap[indexToken.address][longToken.address] = longToken;
      indexCollateralsMap[indexToken.address][shortToken.address] = shortToken;

      if ([longToken.address, shortToken.address].includes(NATIVE_TOKEN_ADDRESS)) {
        longMap[wrappedToken.address] = wrappedToken;
        shortMap[wrappedToken.address] = wrappedToken;
        indexCollateralsMap[indexToken.address][wrappedToken.address] = wrappedToken;
      }
    }

    return {
      longCollaterals: Object.values(longMap) as Token[],
      shortCollaterals: Object.values(shortMap) as Token[],
      indexTokens: Object.values(indexMap) as Token[],
      indexCollateralsMap,
    };
  }, [markets, tokensData, wrappedToken]);

  const availableFromTokens: Token[] = longCollaterals.concat(shortCollaterals);
  const availableToTokens: Token[] = p.isSwap ? availableFromTokens : indexTokens;

  const availableCollaterals = !p.isSwap && p.fromTokenAddress ? indexCollateralsMap[p.fromTokenAddress] : undefined;

  return {
    availableFromTokens,
    availableToTokens,
    availableCollaterals,
    infoTokens,
  };
}
