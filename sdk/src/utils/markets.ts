import { BASIS_POINTS_DIVISOR } from "configs/factors";
import { getTokenVisualMultiplier, NATIVE_TOKEN_ADDRESS } from "configs/tokens";
import { ContractMarketPrices, Market, MarketInfo } from "types/markets";
import { Token, TokenPrices, TokensData } from "types/tokens";

import { applyFactor, PRECISION } from "./numbers";
import { getByKey } from "./objects";
import { convertToContractTokenPrices, convertToUsd, getMidPrice } from "./tokens";

export function getMarketFullName(p: { longToken: Token; shortToken: Token; indexToken: Token; isSpotOnly: boolean }) {
  const { indexToken, longToken, shortToken, isSpotOnly } = p;

  return `${getMarketIndexName({ indexToken, isSpotOnly })} [${getMarketPoolName({ longToken, shortToken })}]`;
}

export function getMarketIndexName(p: ({ indexToken: Token } | { glvToken: Token }) & { isSpotOnly: boolean }) {
  const { isSpotOnly } = p;

  const firstToken = "indexToken" in p ? p.indexToken : p.glvToken;

  if (isSpotOnly) {
    return `SWAP-ONLY`;
  }

  const prefix = getTokenVisualMultiplier(firstToken);

  return `${prefix}${firstToken.baseSymbol || firstToken.symbol}/USD`;
}

export function getMarketPoolName(p: { longToken: Token; shortToken: Token }, separator = "-") {
  const { longToken, shortToken } = p;

  return `${longToken.symbol}${separator}${shortToken.symbol}`;
}

export function getContractMarketPrices(tokensData: TokensData, market: Market): ContractMarketPrices | undefined {
  const indexToken = getByKey(tokensData, market.indexTokenAddress);
  const longToken = getByKey(tokensData, market.longTokenAddress);
  const shortToken = getByKey(tokensData, market.shortTokenAddress);

  if (!indexToken || !longToken || !shortToken) {
    return undefined;
  }

  return {
    indexTokenPrice: indexToken && convertToContractTokenPrices(indexToken.prices, indexToken.decimals),
    longTokenPrice: longToken && convertToContractTokenPrices(longToken.prices, longToken.decimals),
    shortTokenPrice: shortToken && convertToContractTokenPrices(shortToken.prices, shortToken.decimals),
  };
}

/**
 * Apart from usual cases, returns `long` for single token backed markets.
 */
export function getTokenPoolType(
  marketInfo: {
    longToken: Token;
    shortToken: Token;
  },
  tokenAddress: string
): "long" | "short" | undefined {
  const { longToken, shortToken } = marketInfo;

  if (longToken.address === shortToken.address && tokenAddress === longToken.address) {
    return "long";
  }

  if (tokenAddress === longToken.address || (tokenAddress === NATIVE_TOKEN_ADDRESS && longToken.isWrapped)) {
    return "long";
  }

  if (tokenAddress === shortToken.address || (tokenAddress === NATIVE_TOKEN_ADDRESS && shortToken.isWrapped)) {
    return "short";
  }

  return undefined;
}

export function getPoolUsdWithoutPnl(
  marketInfo: MarketInfo,
  isLong: boolean,
  priceType: "minPrice" | "maxPrice" | "midPrice"
) {
  const poolAmount = isLong ? marketInfo.longPoolAmount : marketInfo.shortPoolAmount;
  const token = isLong ? marketInfo.longToken : marketInfo.shortToken;

  let price: bigint | undefined;

  if (priceType === "minPrice") {
    price = token.prices?.minPrice;
  } else if (priceType === "maxPrice") {
    price = token.prices?.maxPrice;
  } else {
    price = getMidPrice(token.prices);
  }

  return convertToUsd(poolAmount, token.decimals, price)!;
}

export function getCappedPoolPnl(p: { marketInfo: MarketInfo; poolUsd: bigint; poolPnl: bigint; isLong: boolean }) {
  const { marketInfo, poolUsd, poolPnl, isLong } = p;

  if (poolPnl < 0) {
    return poolPnl;
  }

  const maxPnlFactor: bigint = isLong ? marketInfo.maxPnlFactorForTradersLong : marketInfo.maxPnlFactorForTradersShort;
  const maxPnl = applyFactor(poolUsd, maxPnlFactor);

  return poolPnl > maxPnl ? maxPnl : poolPnl;
}

export function getMaxLeverageByMinCollateralFactor(minCollateralFactor: bigint | undefined) {
  if (minCollateralFactor === undefined) return 100 * BASIS_POINTS_DIVISOR;
  if (minCollateralFactor === 0n) return 100 * BASIS_POINTS_DIVISOR;

  const x = Number(PRECISION / minCollateralFactor);
  const rounded = Math.round(x / 10) * 10;
  return rounded * BASIS_POINTS_DIVISOR;
}

export function getMaxAllowedLeverageByMinCollateralFactor(minCollateralFactor: bigint | undefined) {
  return getMaxLeverageByMinCollateralFactor(minCollateralFactor) / 2;
}

export function getOppositeCollateral(marketInfo: MarketInfo, tokenAddress: string) {
  const poolType = getTokenPoolType(marketInfo, tokenAddress);

  if (poolType === "long") {
    return marketInfo.shortToken;
  }

  if (poolType === "short") {
    return marketInfo.longToken;
  }

  return undefined;
}

export function getAvailableUsdLiquidityForCollateral(marketInfo: MarketInfo, isLong: boolean) {
  const poolUsd = getPoolUsdWithoutPnl(marketInfo, isLong, "minPrice");

  if (marketInfo.isSpotOnly) {
    return poolUsd;
  }

  const reservedUsd = getReservedUsd(marketInfo, isLong);
  const maxReserveFactor = isLong ? marketInfo.reserveFactorLong : marketInfo.reserveFactorShort;

  if (maxReserveFactor === 0n) {
    return 0n;
  }

  const minPoolUsd = (reservedUsd * PRECISION) / maxReserveFactor;

  const liquidity = poolUsd - minPoolUsd;

  return liquidity;
}

export function getReservedUsd(marketInfo: MarketInfo, isLong: boolean) {
  const { indexToken } = marketInfo;

  if (isLong) {
    return convertToUsd(marketInfo.longInterestInTokens, marketInfo.indexToken.decimals, indexToken.prices.maxPrice)!;
  } else {
    return marketInfo.shortInterestUsd;
  }
}

export function getMarketDivisor({
  longTokenAddress,
  shortTokenAddress,
}: {
  longTokenAddress: string;
  shortTokenAddress: string;
}) {
  return longTokenAddress === shortTokenAddress ? 2n : 1n;
}

export function getMarketPnl(marketInfo: MarketInfo, isLong: boolean, forMaxPoolValue: boolean) {
  const maximize = !forMaxPoolValue;
  const openInterestUsd = getOpenInterestUsd(marketInfo, isLong);
  const openInterestInTokens = getOpenInterestInTokens(marketInfo, isLong);

  if (openInterestUsd === 0n || openInterestInTokens === 0n) {
    return 0n;
  }

  const price = getPriceForPnl(marketInfo.indexToken.prices, isLong, maximize);

  const openInterestValue = convertToUsd(openInterestInTokens, marketInfo.indexToken.decimals, price)!;
  const pnl = isLong ? openInterestValue - openInterestUsd : openInterestUsd - openInterestValue;

  return pnl;
}

export function getOpenInterestUsd(marketInfo: MarketInfo, isLong: boolean) {
  return isLong ? marketInfo.longInterestUsd : marketInfo.shortInterestUsd;
}

export function getOpenInterestInTokens(marketInfo: MarketInfo, isLong: boolean) {
  return isLong ? marketInfo.longInterestInTokens : marketInfo.shortInterestInTokens;
}

export function getPriceForPnl(prices: TokenPrices, isLong: boolean, maximize: boolean) {
  // for long positions, pick the larger price to maximize pnl
  // for short positions, pick the smaller price to maximize pnl
  if (isLong) {
    return maximize ? prices.maxPrice : prices.minPrice;
  }

  return maximize ? prices.minPrice : prices.maxPrice;
}
