import { InfoTokens, Token, TokenInfo } from "domain/tokens";
import { BigNumber } from "ethers";
import { TokenAllowancesData, TokenData, TokenPrices, TokensData, TokensRatio } from "./types";
import { expandDecimals, formatAmount } from "lib/numbers";
import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { PRECISION, USD_DECIMALS, adjustForDecimals } from "lib/legacy";
import { Bar } from "domain/tradingview/types";

export function getTokenData(tokensData: TokensData, address: string | undefined, convertTo?: "wrapped" | "native") {
  if (!address) return undefined;

  const token = tokensData[address];

  if (!token) return undefined;

  if (convertTo === "wrapped" && token.isNative && token.wrappedAddress) {
    return tokensData[token.wrappedAddress];
  }

  if (convertTo === "native" && token.isWrapped) {
    return tokensData[NATIVE_TOKEN_ADDRESS];
  }

  return tokensData[address];
}

export function getTokenAllowance(allowanceData: TokenAllowancesData, address: string | undefined) {
  if (!address) return undefined;

  return allowanceData[address];
}

export function needTokenApprove(
  tokenAllowanceData: TokenAllowancesData,
  tokenAddress: string | undefined,
  amountToSpend: BigNumber | undefined
) {
  if (tokenAddress === NATIVE_TOKEN_ADDRESS) return false;

  const allowance = getTokenAllowance(tokenAllowanceData, tokenAddress);

  if (!allowance || !amountToSpend) return false;

  return amountToSpend.gt(allowance);
}

export function convertToTokenAmount(
  usd: BigNumber | undefined,
  tokenDecimals: number | undefined,
  price: BigNumber | undefined
) {
  if (!usd || !tokenDecimals || !price?.gt(0)) return undefined;

  return usd.mul(expandDecimals(1, tokenDecimals)).div(price);
}

export function convertToUsd(
  tokenAmount: BigNumber | undefined,
  tokenDecimals: number | undefined,
  price: BigNumber | undefined
) {
  if (!tokenAmount || !tokenDecimals || !price) return undefined;

  return tokenAmount.mul(price).div(expandDecimals(1, tokenDecimals));
}

export function getTokensRatio(p: { fromToken?: TokenData; toToken?: TokenData }): TokensRatio | undefined {
  if (!p.fromToken?.prices || !p.toToken?.prices) return undefined;

  const fromAddress = p.fromToken.address;
  const toAddress = p.toToken.address;
  const fromPrice = p.fromToken.prices.minPrice;
  const toPrice = p.toToken.prices.maxPrice;

  const [largestAddress, smallestAddress] = fromPrice.gt(toPrice) ? [fromAddress, toAddress] : [toAddress, fromAddress];

  const ratio =
    largestAddress === fromAddress ? fromPrice.mul(PRECISION).div(toPrice) : toPrice.mul(PRECISION).div(fromPrice);

  return { ratio, largestAddress, smallestAddress };
}

export function getTokensRatioByAmounts(p: {
  fromToken?: Token;
  toToken?: Token;
  fromTokenAmount?: BigNumber;
  toTokenAmount?: BigNumber;
}): TokensRatio | undefined {
  if (!p.fromToken || !p.toToken || !p.fromTokenAmount?.gt(0) || !p.toTokenAmount?.gt(0)) return undefined;

  const fromAddress = p.fromToken.address;
  const toAddress = p.toToken.address;
  const fromAmount = p.fromTokenAmount.mul(PRECISION).div(expandDecimals(1, p.fromToken.decimals));
  const toAmount = p.toTokenAmount.mul(PRECISION).div(expandDecimals(1, p.toToken.decimals));

  if (!fromAmount.gt(0) || !toAmount.gt(0)) return undefined;

  const [largestAddress, smallestAddress] = fromAmount.gt(toAmount)
    ? [fromAddress, toAddress]
    : [toAddress, fromAddress];

  const ratio =
    largestAddress === fromAddress ? fromAmount.mul(PRECISION).div(toAmount) : toAmount.mul(PRECISION).div(fromAmount);

  return { ratio, largestAddress, smallestAddress };
}

export function formatTokensRatio(fromToken?: Token, toToken?: Token, ratio?: TokensRatio) {
  if (!fromToken || !toToken || !ratio) return undefined;

  const [largest, smallest] = ratio.largestAddress === fromToken.address ? [fromToken, toToken] : [toToken, fromToken];

  return `${formatAmount(ratio.ratio, USD_DECIMALS, 4)} ${smallest.symbol} / ${largest.symbol}`;
}

export function getAmountByRatio(p: {
  fromToken: Token;
  toToken: Token;
  fromTokenAmount: BigNumber;
  ratio: BigNumber;
  invertRatio?: boolean;
}) {
  const isWrap = p.fromToken.isNative && p.toToken.isWrapped;
  const isUnwrap = p.fromToken.isWrapped && p.toToken.isNative;
  const isSameToken = p.fromToken.address === p.toToken.address;

  if (isWrap || isUnwrap || isSameToken) {
    return p.fromTokenAmount;
  }

  const ratio = p.invertRatio ? PRECISION.mul(PRECISION).div(p.ratio) : p.ratio;

  const adjustedDecimalsRatio = adjustForDecimals(ratio, p.fromToken.decimals, p.toToken.decimals);

  return p.fromTokenAmount.mul(adjustedDecimalsRatio).div(PRECISION);
}

export function getCandlesDelta(candles?: Bar[], currentAveragePrice?: number, periodInSeconds?: number) {
  if (!candles?.length || !periodInSeconds || !currentAveragePrice) {
    return undefined;
  }

  let high: number | undefined;
  let low: number | undefined;
  let deltaPrice: number | undefined;
  let delta: number | undefined;
  let deltaPercentage: number | undefined;
  let deltaPercentageStr: string | undefined;

  const now = Math.round(Date.now() / 1000);
  const timeThreshold = now - periodInSeconds;

  for (const candle of candles) {
    if (candle.time < timeThreshold) {
      break;
    }

    if (!high || candle.high > high) {
      high = candle.high;
    }

    if (!low || candle.low < low) {
      low = candle.low;
    }

    deltaPrice = candle.open;
  }

  if (deltaPrice && currentAveragePrice) {
    delta = currentAveragePrice - deltaPrice;
    deltaPercentage = (delta * 100) / currentAveragePrice;

    if (deltaPercentage > 0) {
      deltaPercentageStr = `+${deltaPercentage.toFixed(2)}%`;
    } else {
      deltaPercentageStr = `${deltaPercentage.toFixed(2)}%`;
    }
    if (deltaPercentage === 0) {
      deltaPercentageStr = "0.00";
    }
  }

  if (!high || !low || !deltaPrice || !delta || !deltaPercentage || !deltaPercentageStr) {
    return undefined;
  }

  return {
    high,
    low,
    deltaPrice,
    delta,
    deltaPercentage,
    deltaPercentageStr,
  };
}

export function getMidPrice(prices: TokenPrices | undefined) {
  if (!prices) return undefined;

  return prices.minPrice.add(prices.maxPrice).div(2);
}

export function parseOraclePrice(price: string, tokenDecimals: number, oracleDecimals: number) {
  return expandDecimals(price, tokenDecimals + oracleDecimals);
}

export function convertToContractPrice(price: BigNumber, tokenDecimals: number) {
  return price.div(expandDecimals(1, tokenDecimals));
}

export function convertToContractPrices(prices: TokenPrices, tokenDecimals: number) {
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
export function adaptToInfoTokens(tokensData: TokensData): InfoTokens {
  const infoTokens = Object.keys(tokensData).reduce((acc, address) => {
    const tokenData = getTokenData(tokensData, address)!;

    acc[address] = adaptToTokenInfo(tokenData);

    return acc;
  }, {} as InfoTokens);

  return infoTokens;
}

/**
 * Used to adapt Synthetics tokens to InfoTokens where it's possible
 */
export function adaptToTokenInfo(tokenData: TokenData): TokenInfo {
  return {
    ...tokenData,
    minPrice: tokenData.prices?.minPrice,
    maxPrice: tokenData.prices?.maxPrice,
  };
}
