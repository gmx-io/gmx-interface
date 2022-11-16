import { SyntheticsMarket } from "domain/synthetics/types";

const SYNTHETICS_LP_TOKEN = {
  symbol: "GM",
  name: "GMX Market tokens",
  decimals: 18,
};

const SYNTHETICS_MARKETS: SyntheticsMarket[] = [
  {
    perp: "ETH/USD",
    indexTokenSymbol: "ETH",
    longCollateralSymbol: "ETH",
    shortCollateralSymbol: "USDC",
  },
  {
    perp: "BNB/USD",
    indexTokenSymbol: "BNB",
    longCollateralSymbol: "ETH",
    shortCollateralSymbol: "USDC",
  },
  {
    perp: "BTC/USD",
    indexTokenSymbol: "BTC",
    longCollateralSymbol: "BTC",
    shortCollateralSymbol: "USDC",
  },
  {
    perp: "SOL/USD",
    indexTokenSymbol: "SOL",
    longCollateralSymbol: "ETH",
    shortCollateralSymbol: "USDC",
  },
];

export function getSyntheticsMarkets() {
  return SYNTHETICS_MARKETS;
}

export function getSyntheticsMarketByIndexToken(symbol: string) {
  return SYNTHETICS_MARKETS.find((market) => market.indexTokenSymbol === symbol);
}
