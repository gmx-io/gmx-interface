import { SyntheticsMarket } from "domain/synthetics/types";
import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI_TESTNET } from "./chains";

const SYNTHETICS_MARKETS: { [chainId: number]: SyntheticsMarket[] } = {
  [ARBITRUM]: [
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
  ],
  [AVALANCHE]: [
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
  ],
  [AVALANCHE_FUJI_TESTNET]: [
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
  ],
};

export function getSyntheticsMarkets(chainId: number) {
  return SYNTHETICS_MARKETS[chainId];
}

export function getSyntheticsMarketByIndexToken(chainId: number, symbol: string) {
  return getSyntheticsMarkets(chainId).find((market) => market.indexTokenSymbol === symbol);
}
