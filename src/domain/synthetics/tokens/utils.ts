import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import { InfoTokens, Token, TokenInfo } from "domain/tokens";
import { BASIS_POINTS_DIVISOR_BIGINT, USD_DECIMALS } from "config/factors";
import { formatAmount, PRECISION, adjustForDecimals } from "lib/numbers";
import { TokenData, TokensAllowanceData, TokensData, TokensRatio } from "./types";
import { getIsEquivalentTokens, getTokenData } from "sdk/utils/tokens";
import { bigMath } from "sdk/utils/bigmath";

export * from "sdk/utils/tokens";

export function getNeedTokenApprove(
  tokenAllowanceData: TokensAllowanceData | undefined,
  tokenAddress: string | undefined,
  amountToSpend: bigint | undefined
): boolean {
  if (tokenAddress === NATIVE_TOKEN_ADDRESS || amountToSpend === undefined || amountToSpend <= 0n) {
    return false;
  }

  if (!tokenAllowanceData || !tokenAddress || tokenAllowanceData?.[tokenAddress] === undefined) {
    return true;
  }

  return amountToSpend > tokenAllowanceData[tokenAddress];
}

export function getTokensRatioByPrice(p: {
  fromToken: TokenData;
  toToken: TokenData;
  fromPrice: bigint;
  toPrice: bigint;
}): TokensRatio {
  const { fromToken, toToken, fromPrice, toPrice } = p;

  const [largestToken, smallestToken, largestPrice, smallestPrice] =
    fromPrice > toPrice ? [fromToken, toToken, fromPrice, toPrice] : [toToken, fromToken, toPrice, fromPrice];

  const ratio = (largestPrice * PRECISION) / smallestPrice;

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

  return amount - bigMath.mulDiv(amount, allowedSwapSlippageBps ?? 100n, BASIS_POINTS_DIVISOR_BIGINT);
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
