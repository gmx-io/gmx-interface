import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { InfoTokens, Token, TokenInfo, getIsEquivalentTokens } from "domain/tokens";
import { BigNumber } from "ethers";
import { PRECISION, USD_DECIMALS, adjustForDecimals } from "lib/legacy";
import { expandDecimals, formatAmount } from "lib/numbers";
import { TokenData, TokenPrices, TokensAllowanceData, TokensData, TokensRatio } from "./types";

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

export function getNeedTokenApprove(
  tokenAllowanceData: TokensAllowanceData,
  tokenAddress: string,
  amountToSpend: BigNumber
): boolean {
  if (tokenAddress === NATIVE_TOKEN_ADDRESS || !tokenAllowanceData[tokenAddress]) {
    return false;
  }

  return amountToSpend.gt(tokenAllowanceData[tokenAddress]);
}

export function convertToTokenAmount(
  usd: BigNumber | undefined,
  tokenDecimals: number | undefined,
  price: BigNumber | undefined
) {
  if (!usd || typeof tokenDecimals !== "number" || !price?.gt(0)) {
    return undefined;
  }

  return usd.mul(expandDecimals(1, tokenDecimals)).div(price);
}

export function convertToUsd(
  tokenAmount: BigNumber | undefined,
  tokenDecimals: number | undefined,
  price: BigNumber | undefined
) {
  if (!tokenAmount || typeof tokenDecimals !== "number" || !price) {
    return undefined;
  }

  return tokenAmount.mul(price).div(expandDecimals(1, tokenDecimals));
}

export function getTokensRatioByPrice(p: {
  fromToken: TokenData;
  toToken: TokenData;
  fromPrice: BigNumber;
  toPrice: BigNumber;
}): TokensRatio {
  const { fromToken, toToken, fromPrice, toPrice } = p;

  const [largestToken, smallestToken, largestPrice, smallestPrice] = fromPrice.gt(toPrice)
    ? [fromToken, toToken, fromPrice, toPrice]
    : [toToken, fromToken, toPrice, fromPrice];

  const ratio = largestPrice.mul(PRECISION).div(smallestPrice);

  return { ratio, largestToken, smallestToken };
}

/**
 * Even though its not a generic function, it return the same type as the input.
 * If `TokenData` is passed, it returns `TokenData`, if `Token` is passed, it returns `Token`.
 */
export function getTokensRatioByAmounts(p: {
  fromToken: Token;
  toToken: Token;
  fromTokenAmount: BigNumber;
  toTokenAmount: BigNumber;
}): TokensRatio {
  const { fromToken, toToken, fromTokenAmount, toTokenAmount } = p;

  const adjustedFromAmount = fromTokenAmount.mul(PRECISION).div(expandDecimals(1, fromToken.decimals));
  const adjustedToAmount = toTokenAmount.mul(PRECISION).div(expandDecimals(1, toToken.decimals));

  const [smallestToken, largestToken, largestAmount, smallestAmount] = adjustedFromAmount.gt(adjustedToAmount)
    ? [fromToken, toToken, adjustedFromAmount, adjustedToAmount]
    : [toToken, fromToken, adjustedToAmount, adjustedFromAmount];

  const ratio = smallestAmount.gt(0) ? largestAmount.mul(PRECISION).div(smallestAmount) : BigNumber.from(0);

  return { ratio, largestToken, smallestToken };
}

export function formatTokensRatio(fromToken?: Token, toToken?: Token, ratio?: TokensRatio) {
  if (!fromToken || !toToken || !ratio) {
    return undefined;
  }

  const [largest, smallest] =
    ratio.largestToken.address === fromToken.address ? [fromToken, toToken] : [toToken, fromToken];

  return `${formatAmount(ratio.ratio, USD_DECIMALS, 4)} ${smallest.symbol} / ${largest.symbol}`;
}

export function getAmountByRatio(p: {
  fromToken: Token;
  toToken: Token;
  fromTokenAmount: BigNumber;
  ratio: BigNumber;
  shouldInvertRatio?: boolean;
}) {
  const { fromToken, toToken, fromTokenAmount, ratio, shouldInvertRatio } = p;

  if (getIsEquivalentTokens(fromToken, toToken) || fromTokenAmount.eq(0)) {
    return p.fromTokenAmount;
  }

  const _ratio = shouldInvertRatio ? PRECISION.mul(PRECISION).div(ratio) : ratio;

  const adjustedDecimalsRatio = adjustForDecimals(_ratio, fromToken.decimals, toToken.decimals);

  return p.fromTokenAmount.mul(adjustedDecimalsRatio).div(PRECISION);
}

export function getMidPrice(prices: TokenPrices) {
  return prices.minPrice.add(prices.maxPrice).div(2);
}

export function convertToContractPrice(price: BigNumber, tokenDecimals: number) {
  return price.div(expandDecimals(1, tokenDecimals));
}

export function convertToContractTokenPrices(prices: TokenPrices, tokenDecimals: number) {
  return {
    min: convertToContractPrice(prices.minPrice, tokenDecimals),
    max: convertToContractPrice(prices.maxPrice, tokenDecimals),
  };
}

export function parseContractPrice(price: BigNumber, tokenDecimals: number) {
  return price.mul(expandDecimals(1, tokenDecimals));
}

/**
 * Used to adapt Synthetics tokens to InfoTokens where it's possible
 */
export function adaptToV1InfoTokens(tokensData: TokensData): InfoTokens {
  const infoTokens = Object.keys(tokensData).reduce((acc, address) => {
    const tokenData = getTokenData(tokensData, address)!;

    acc[address] = adaptToV1TokenInfo(tokenData);

    return acc;
  }, {} as InfoTokens);

  return infoTokens;
}

/**
 * Used to adapt Synthetics tokens to InfoTokens where it's possible
 */
export function adaptToV1TokenInfo(tokenData: TokenData): TokenInfo {
  return {
    ...tokenData,
    minPrice: tokenData.prices?.minPrice,
    maxPrice: tokenData.prices?.maxPrice,
  };
}
