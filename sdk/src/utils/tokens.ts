import { BASIS_POINTS_DIVISOR_BIGINT, DEFAULT_ALLOWED_SWAP_SLIPPAGE_BPS } from "configs/factors";
import { NATIVE_TOKEN_ADDRESS } from "configs/tokens";
import {
  ContractPrice,
  Token,
  TokenData,
  TokenPrices,
  TokensData,
  TokensRatio,
  TokensRatioAndSlippage,
} from "types/tokens";

import { bigMath } from "./bigmath";
import { adjustForDecimals, expandDecimals, PRECISION } from "./numbers";

export function parseContractPrice(price: bigint, tokenDecimals: number) {
  return price * expandDecimals(1, tokenDecimals);
}

export function convertToContractPrice(price: bigint, tokenDecimals: number): ContractPrice {
  return (price / expandDecimals(1, tokenDecimals)) as ContractPrice;
}

export function convertToContractTokenPrices(prices: TokenPrices, tokenDecimals: number) {
  return {
    min: convertToContractPrice(prices.minPrice, tokenDecimals),
    max: convertToContractPrice(prices.maxPrice, tokenDecimals),
  };
}

export function convertToTokenAmount(
  usd: bigint | undefined,
  tokenDecimals: number | undefined,
  price: bigint | undefined
) {
  if (usd === undefined || typeof tokenDecimals !== "number" || price === undefined || price <= 0) {
    return undefined;
  }

  return (usd * expandDecimals(1, tokenDecimals)) / price;
}

export function convertToUsd(
  tokenAmount: bigint | undefined,
  tokenDecimals: number | undefined,
  price: bigint | undefined
) {
  if (tokenAmount == undefined || typeof tokenDecimals !== "number" || price === undefined) {
    return undefined;
  }

  return (tokenAmount * price) / expandDecimals(1, tokenDecimals);
}

export function convertBetweenTokens(
  tokenAmount: bigint | undefined,
  fromToken: TokenData | undefined,
  toToken: TokenData | undefined,
  maximize: boolean
) {
  if (tokenAmount === undefined || fromToken === undefined || toToken === undefined) {
    return undefined;
  }

  if (getIsEquivalentTokens(fromToken, toToken)) {
    return tokenAmount;
  }

  const fromPrice = maximize ? fromToken.prices.maxPrice : fromToken.prices.minPrice;
  const toPrice = maximize ? toToken.prices.minPrice : toToken.prices.maxPrice;

  const usd = convertToUsd(tokenAmount, fromToken.decimals, fromPrice)!;
  const amount = convertToTokenAmount(usd, toToken.decimals, toPrice)!;

  return amount;
}

export function getMidPrice(prices: TokenPrices) {
  return (prices.minPrice + prices.maxPrice) / 2n;
}

export function getIsEquivalentTokens(token1: Token, token2: Token) {
  if (token1.address === token2.address) {
    return true;
  }

  if (token1.wrappedAddress === token2.address || token2.wrappedAddress === token1.address) {
    return true;
  }

  if ((token1.isSynthetic || token2.isSynthetic) && token1.symbol === token2.symbol) {
    return true;
  }

  return false;
}

export function getTokenData(tokensData?: TokensData, address?: string, convertTo?: "wrapped" | "native") {
  if (!address || !tokensData?.[address]) {
    return undefined;
  }

  const token = tokensData[address];

  if (convertTo === "wrapped" && token.isNative && token.wrappedAddress) {
    return tokensData[token.wrappedAddress];
  }

  if (convertTo === "native" && token.isWrapped) {
    return tokensData[NATIVE_TOKEN_ADDRESS];
  }

  return token;
}

/**
 * Even though its not a generic function, it return the same type as the input.
 * If `TokenData` is passed, it returns `TokenData`, if `Token` is passed, it returns `Token`.
 */
export function getTokensRatioByAmounts(p: {
  fromToken: Token;
  toToken: Token;
  fromTokenAmount: bigint;
  toTokenAmount: bigint;
}): TokensRatio {
  const { fromToken, toToken, fromTokenAmount, toTokenAmount } = p;

  const adjustedFromAmount = (fromTokenAmount * PRECISION) / expandDecimals(1, fromToken.decimals);
  const adjustedToAmount = (toTokenAmount * PRECISION) / expandDecimals(1, toToken.decimals);

  const [smallestToken, largestToken, largestAmount, smallestAmount] =
    adjustedFromAmount > adjustedToAmount
      ? [fromToken, toToken, adjustedFromAmount, adjustedToAmount]
      : [toToken, fromToken, adjustedToAmount, adjustedFromAmount];

  const ratio = smallestAmount > 0 ? (largestAmount * PRECISION) / smallestAmount : 0n;

  return { ratio, largestToken, smallestToken };
}

export function getTokensRatioByMinOutputAmountAndTriggerPrice(p: {
  fromToken: Token;
  toToken: Token;
  fromTokenAmount: bigint;
  toTokenAmount: bigint;
  triggerPrice: bigint;
  minOutputAmount: bigint;
}): TokensRatioAndSlippage {
  const { fromToken, toToken, fromTokenAmount, toTokenAmount, triggerPrice, minOutputAmount } = p;

  let allowedSwapSlippageBps = DEFAULT_ALLOWED_SWAP_SLIPPAGE_BPS;
  let smallestToken = fromToken;
  let largestToken = toToken;
  let largestAmount = fromTokenAmount;
  let smallestAmount = toTokenAmount;
  let acceptablePrice = 0n;
  let ratio = 0n;

  const adjustedFromAmount = (fromTokenAmount * PRECISION) / expandDecimals(1, fromToken.decimals);
  const adjustedToAmount = (minOutputAmount * PRECISION) / expandDecimals(1, toToken.decimals);
  const adjustedMinOutputAmount = (minOutputAmount * PRECISION) / expandDecimals(1, toToken.decimals);

  [smallestToken, largestToken, largestAmount, smallestAmount] =
    adjustedFromAmount > adjustedToAmount
      ? [fromToken, toToken, adjustedFromAmount, adjustedToAmount]
      : [toToken, fromToken, adjustedToAmount, adjustedFromAmount];
  ratio = smallestAmount > 0 ? (largestAmount * PRECISION) / smallestAmount : 0n;

  if (triggerPrice === 0n) {
    allowedSwapSlippageBps = DEFAULT_ALLOWED_SWAP_SLIPPAGE_BPS;
    acceptablePrice = ratio;
  } else {
    const outputAtTriggerPrice =
      adjustedFromAmount > adjustedToAmount
        ? (adjustedFromAmount * PRECISION) / triggerPrice
        : (adjustedFromAmount * triggerPrice) / PRECISION;

    allowedSwapSlippageBps =
      ((outputAtTriggerPrice - adjustedMinOutputAmount) * BASIS_POINTS_DIVISOR_BIGINT) / outputAtTriggerPrice;
    acceptablePrice = ratio;
    ratio = triggerPrice;
  }

  return { ratio, largestToken, smallestToken, allowedSwapSlippageBps, acceptablePrice };
}

export function getAmountByRatio(p: {
  fromToken: Token;
  toToken: Token;
  fromTokenAmount: bigint;
  ratio: bigint;
  shouldInvertRatio?: boolean;
  allowedSwapSlippageBps?: bigint;
}) {
  const { fromToken, toToken, fromTokenAmount, ratio, shouldInvertRatio, allowedSwapSlippageBps } = p;

  if (getIsEquivalentTokens(fromToken, toToken) || fromTokenAmount === 0n) {
    return p.fromTokenAmount;
  }

  const _ratio = shouldInvertRatio ? (PRECISION * PRECISION) / ratio : ratio;

  const adjustedDecimalsRatio = adjustForDecimals(_ratio, fromToken.decimals, toToken.decimals);
  const amount = (p.fromTokenAmount * adjustedDecimalsRatio) / PRECISION;

  const swapSlippageAmount =
    allowedSwapSlippageBps !== undefined
      ? bigMath.mulDiv(amount, allowedSwapSlippageBps, BASIS_POINTS_DIVISOR_BIGINT)
      : 0n;

  return amount - swapSlippageAmount;
}

export function getIsWrap(token1: Token, token2: Token) {
  return token1.isNative && token2.isWrapped;
}

export function getIsUnwrap(token1: Token, token2: Token) {
  return token1.isWrapped && token2.isNative;
}

export function getIsStake(token1: Token, token2: Token) {
  return (token1.isWrapped || token1.isNative) && token2.isStaking;
}

export function getIsUnstake(token1: Token, token2: Token) {
  // can't unstake straight to native token
  return token1.isStaking && token2.isWrapped;
}

export function getTokensRatioByPrice(p: {
  fromToken: Token;
  toToken: Token;
  fromPrice: bigint;
  toPrice: bigint;
}): TokensRatio {
  const { fromToken, toToken, fromPrice, toPrice } = p;

  const [largestToken, smallestToken, largestPrice, smallestPrice] =
    fromPrice > toPrice ? [fromToken, toToken, fromPrice, toPrice] : [toToken, fromToken, toPrice, fromPrice];

  const ratio = (largestPrice * PRECISION) / smallestPrice;

  return { ratio, largestToken, smallestToken };
}
