import { MarketPoolType, SyntheticsMarket } from "./types";

export function getMarketTokenFullName(market: SyntheticsMarket) {
  return `GM ${market.perp} [${market.longCollateralSymbol}-${market.shortCollateralSymbol}]`;
}

export function getMarketKey(market: SyntheticsMarket) {
  return `${market.perp}-${market.longCollateralSymbol}-${market.shortCollateralSymbol}`;
}

export function getTokenPoolType(market: SyntheticsMarket, symbol: string) {
  if (market.longCollateralSymbol === symbol) {
    return MarketPoolType.Long;
  }

  if (market.shortCollateralSymbol === symbol) {
    return MarketPoolType.Short;
  }

  return undefined;
}
