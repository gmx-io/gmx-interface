import { SyntheticsMarket } from "./types";

export function getMarketFullName(market: SyntheticsMarket) {
  return `GM ${market.perp} [${market.longCollateralSymbol}-${market.shortCollateralSymbol}]`;
}

export function getMarketKey(market: SyntheticsMarket) {
  return `${market.perp}-${market.longCollateralSymbol}-${market.shortCollateralSymbol}`;
}
