import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { TokensData } from "../tokens/types";
import { getTokenData, getUsdFromTokenAmount } from "../tokens/utils";
import { MarketPoolType, MarketsData, MarketsPoolsData, MarketTokensData, MarketsOpenInterestData } from "./types";

export function getMarket(marketsData: MarketsData, marketAddress?: string) {
  if (!marketAddress) return undefined;

  return marketsData[marketAddress];
}

export function getMarkets(marketsData: MarketsData) {
  return Object.keys(marketsData).map((address) => getMarket(marketsData, address)!);
}

export function getMarketName(
  marketsData: MarketsData,
  tokensData: TokensData,
  marketAddress?: string,
  fallbackToPlaceholder?: boolean
) {
  const market = getMarket(marketsData, marketAddress);

  const indexAddress = market?.isIndexWrapped ? NATIVE_TOKEN_ADDRESS : market?.indexTokenAddress;

  const indexToken = getTokenData(tokensData, indexAddress);
  const longToken = getTokenData(tokensData, market?.longTokenAddress);
  const shortToken = getTokenData(tokensData, market?.shortTokenAddress);

  if (!market || !indexToken || !longToken || !shortToken) {
    if (fallbackToPlaceholder) {
      return "GM: ---/--- [-------]";
    }

    return undefined;
  }

  return `GM: ${indexToken.symbol}/${market.perp} [${longToken.symbol}-${shortToken.symbol}]`;
}

export function getMarketPoolData(poolsData: MarketsPoolsData, marketAddress?: string) {
  if (!marketAddress) return undefined;

  return poolsData[marketAddress];
}

export function getOpenInterest(openInterestData: MarketsOpenInterestData, marketAddress?: string) {
  if (!marketAddress) return undefined;

  return openInterestData[marketAddress];
}

export function getTokenPoolAmount(
  marketsData: MarketsData,
  poolsData: MarketsPoolsData,
  marketAddress?: string,
  tokenAddress?: string
) {
  const pools = getMarketPoolData(poolsData, marketAddress);
  const market = getMarket(marketsData, marketAddress);
  const tokenPoolType = getTokenPoolType(marketsData, marketAddress, tokenAddress);

  if (!market || !pools || !tokenPoolType) return undefined;

  if (tokenPoolType === MarketPoolType.Long) {
    return pools.longPoolAmount;
  }

  if (tokenPoolType === MarketPoolType.Short) {
    return pools.shortPoolAmount;
  }

  return undefined;
}

export function getPoolAmountUsd(
  marketsData: MarketsData,
  poolsData: MarketsPoolsData,
  tokensData: TokensData,
  marketAddress?: string,
  tokenAddress?: string,
  useMaxPrice?: boolean
) {
  const tokenAmount = getTokenPoolAmount(marketsData, poolsData, marketAddress, tokenAddress);

  return getUsdFromTokenAmount(tokensData, tokenAddress, tokenAmount, useMaxPrice);
}

export function getTokenPoolType(marketsData: MarketsData, marketAddress?: string, tokenAddress?: string) {
  const market = getMarket(marketsData, marketAddress);

  if (!market) return undefined;

  if (market.longTokenAddress === tokenAddress || (market.isLongWrapped && tokenAddress === NATIVE_TOKEN_ADDRESS)) {
    return MarketPoolType.Long;
  }

  if (market.shortTokenAddress === tokenAddress || (market.isShortWrapped && tokenAddress === NATIVE_TOKEN_ADDRESS)) {
    return MarketPoolType.Short;
  }

  return undefined;
}

export function getMarketTokenData(marketTokensData: MarketTokensData, marketAddress?: string) {
  if (!marketAddress) return undefined;

  return marketTokensData[marketAddress];
}
