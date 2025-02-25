import { Token, TokenPrices, TokensData, TokensRatio } from "types/tokens";
import { adjustForDecimals, expandDecimals, PRECISION } from "./numbers";
import { NATIVE_TOKEN_ADDRESS } from "configs/tokens";
import { BASIS_POINTS_DIVISOR_BIGINT, DEFAULT_ALLOWED_SWAP_SLIPPAGE_BPS } from "configs/factors";

export function parseContractPrice(price: bigint, tokenDecimals: number) {
  return price * expandDecimals(1, tokenDecimals);
}

export function convertToContractPrice(price: bigint, tokenDecimals: number) {
  return price / expandDecimals(1, tokenDecimals);
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
  triggerPrice: bigint;
  minOutputAmount: bigint;
}): TokensRatio {
  const { fromToken, toToken, fromTokenAmount, toTokenAmount, minOutputAmount } = p;

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

  if (p.triggerPrice === 0n) {
    ratio = smallestAmount > 0 ? (largestAmount * PRECISION) / smallestAmount : 0n;
    allowedSwapSlippageBps = DEFAULT_ALLOWED_SWAP_SLIPPAGE_BPS;
    acceptablePrice = ratio;
  } else {
    const outputAtTriggerPrice = (largestAmount * PRECISION) / p.triggerPrice;
    allowedSwapSlippageBps =
      ((outputAtTriggerPrice - adjustedMinOutputAmount) * BASIS_POINTS_DIVISOR_BIGINT) / outputAtTriggerPrice;
    ratio = p.triggerPrice;
    acceptablePrice = smallestAmount > 0 ? (largestAmount * PRECISION) / smallestAmount : 0n;
  }

  return { ratio, largestToken, smallestToken, allowedSwapSlippageBps, acceptablePrice };
}

export function getAmountByRatio(p: {
  fromToken: Token;
  toToken: Token;
  fromTokenAmount: bigint;
  ratio: bigint;
  shouldInvertRatio?: boolean;
}) {
  const { fromToken, toToken, fromTokenAmount, ratio, shouldInvertRatio } = p;

  if (getIsEquivalentTokens(fromToken, toToken) || fromTokenAmount === 0n) {
    return p.fromTokenAmount;
  }

  const _ratio = shouldInvertRatio ? (PRECISION * PRECISION) / ratio : ratio;

  const adjustedDecimalsRatio = adjustForDecimals(_ratio, fromToken.decimals, toToken.decimals);

  return (p.fromTokenAmount * adjustedDecimalsRatio) / PRECISION;
}
