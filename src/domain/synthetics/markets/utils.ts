import { getMarketConfig } from "config/synthetics";
import { TokenConfigsData } from "../tokens/types";
import { getTokenConfig } from "../tokens/utils";
import { MarketPoolsData, MarketPoolType, MarketsData, MarketTokenPricesData, SyntheticsMarket } from "./types";

export function getMarket(data: MarketsData, marketAddress?: string) {
  if (!marketAddress) return undefined;

  return data.markets[marketAddress];
}

export function getMarkets(data: MarketsData) {
  return Object.keys(data.markets)
    .map((address) => getMarket(data, address))
    .filter(Boolean) as SyntheticsMarket[];
}

export function getMarketName(chainId: number, data: MarketsData & TokenConfigsData, marketAddress?: string) {
  const market = getMarket(data, marketAddress);
  const marketConfig = getMarketConfig(chainId, marketAddress);

  if (!market) return undefined;

  const indexToken = getTokenConfig(data, market.indexTokenAddress);
  const longToken = getTokenConfig(data, market.longTokenAddress);
  const shortToken = getTokenConfig(data, market.shortTokenAddress);

  if (!indexToken || !longToken || !shortToken) return undefined;

  return `GM: ${indexToken.symbol}/${marketConfig?.perp || "USD"} : [${longToken.symbol}/${shortToken.symbol}]`;
}

export function getMarketPoolAmount(data: MarketPoolsData, marketAddress?: string, tokenAddress?: string) {
  if (!marketAddress || !tokenAddress) return undefined;

  return data.marketPools[marketAddress]?.[tokenAddress];
}

export function getMarketTokenPrice(data: MarketTokenPricesData, marketTokenAddress?: string) {
  if (!marketTokenAddress) return undefined;

  return data.marketTokenPrices[marketTokenAddress];
}

export function getMarketKey(market: SyntheticsMarket) {
  return ``;
}

export function getTokenPoolType(market: SyntheticsMarket, tokenAddress: string) {
  if (market.longTokenAddress === tokenAddress) {
    return MarketPoolType.Long;
  }

  if (market.shortTokenAddress === tokenAddress) {
    return MarketPoolType.Short;
  }

  return undefined;
}
