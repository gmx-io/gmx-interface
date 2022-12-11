import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { TokensData } from "../tokens/types";
import { getTokenData } from "../tokens/utils";
import { MarketPoolType, MarketsData, MarketsPoolsData, MarketTokensData } from "./types";

export function getMarket(marketsData: MarketsData, marketAddress?: string) {
  if (!marketAddress) return undefined;

  return marketsData[marketAddress];
}

export function getMarkets(marketsData: MarketsData) {
  return Object.keys(marketsData).map((address) => getMarket(marketsData, address)!);
}

export function getMarketName(marketsData: MarketsData, tokensData: TokensData, marketAddress?: string) {
  const market = getMarket(marketsData, marketAddress);

  if (!market) return undefined;

  const indexToken = getTokenData(tokensData, market.indexTokenAddress);
  const longToken = getTokenData(tokensData, market.longTokenAddress);
  const shortToken = getTokenData(tokensData, market.shortTokenAddress);

  if (!indexToken || !longToken || !shortToken) return undefined;

  return `GM: ${indexToken.symbol}/${market.perp} : [${longToken.symbol}/${shortToken.symbol}]`;
}

export function getMarketPoolData(poolsData: MarketsPoolsData, marketAddress?: string) {
  if (!marketAddress) return undefined;

  return poolsData[marketAddress];
}

export function getTokenPoolAmount(
  marketsData: MarketsData,
  poolsData: MarketsPoolsData,
  marketAddress: string,
  tokenAddress: string
) {
  const pools = getMarketPoolData(poolsData, marketAddress);
  const market = getMarket(marketsData, marketAddress);

  if (!market || !pools) return undefined;

  if (tokenAddress === market.longTokenAddress) {
    return pools.longPoolAmount;
  }

  if (tokenAddress === market.shortTokenAddress) {
    return pools.shortPoolAmount;
  }

  return undefined;
}

export function getTokenPoolType(
  marketsData: MarketsData,
  tokensData: TokensData,
  marketAddress?: string,
  tokenAddress?: string
) {
  const market = getMarket(marketsData, marketAddress);
  const token = getTokenData(tokensData, tokenAddress);

  if (!market) return undefined;

  if (
    market.longTokenAddress === tokenAddress ||
    (market.longTokenAddress === NATIVE_TOKEN_ADDRESS && token?.isWrapped)
  ) {
    return MarketPoolType.Long;
  }

  if (market.shortTokenAddress === tokenAddress) {
    return MarketPoolType.Short;
  }

  return undefined;
}

export function getMarketTokenData(marketTokensData: MarketTokensData, marketAddress?: string) {
  if (!marketAddress) return undefined;

  return marketTokensData[marketAddress];
}
