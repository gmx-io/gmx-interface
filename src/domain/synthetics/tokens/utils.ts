import { USD_DECIMALS } from "config/factors";
import { InfoTokens, Token, TokenInfo } from "domain/tokens";
import { formatAmount } from "lib/numbers";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import { getTokenData } from "sdk/utils/tokens";
import { TokenData, TokensAllowanceData, TokensData, TokensRatio } from "./types";

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

export function formatTokensRatio(fromToken?: Token, toToken?: Token, ratio?: TokensRatio) {
  if (!fromToken || !toToken || !ratio) {
    return undefined;
  }

  const [largest, smallest] =
    ratio.largestToken.address === fromToken.address ? [fromToken, toToken] : [toToken, fromToken];

  return `${formatAmount(ratio.ratio, USD_DECIMALS, 4)} ${smallest.symbol} / ${largest.symbol}`;
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
