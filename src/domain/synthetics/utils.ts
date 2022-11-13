import { SyntheticsMarket } from "./types";

export function getMarketFullName(market: SyntheticsMarket) {
  return `GM [${market.indexTokenSymbol} : ${market.longCollateralSymbol}/${market.shortCollateralSymbol}]`;
}
