import { SyntheticsMarket } from "domain/synthetics/markets/types";
import { ethers } from "ethers";
import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI_TESTNET } from "./chains";

const { AddressZero } = ethers.constants;

const SYNTHETICS_MARKETS: { [chainId: number]: SyntheticsMarket[] } = {
  [ARBITRUM]: [
    {
      perp: "ETH/USD",
      marketTokenAddress: AddressZero,
      indexTokenSymbol: "ETH",
      longCollateralSymbol: "ETH",
      shortCollateralSymbol: "USDC",
    },
    {
      perp: "BNB/USD",
      marketTokenAddress: AddressZero,
      indexTokenSymbol: "BNB",
      longCollateralSymbol: "ETH",
      shortCollateralSymbol: "USDC",
    },
    {
      perp: "BTC/USD",
      marketTokenAddress: AddressZero,
      indexTokenSymbol: "BTC",
      longCollateralSymbol: "BTC",
      shortCollateralSymbol: "USDC",
    },
    {
      perp: "SOL/USD",
      marketTokenAddress: AddressZero,
      indexTokenSymbol: "SOL",
      longCollateralSymbol: "ETH",
      shortCollateralSymbol: "USDC",
    },
  ],
  [AVALANCHE]: [
    {
      perp: "ETH/USD",
      marketTokenAddress: AddressZero,
      indexTokenSymbol: "ETH",
      longCollateralSymbol: "AVAX",
      shortCollateralSymbol: "USDC",
    },
    {
      perp: "BNB/USD",
      marketTokenAddress: AddressZero,
      indexTokenSymbol: "BNB",
      longCollateralSymbol: "AVAX",
      shortCollateralSymbol: "USDC",
    },
    {
      perp: "BTC/USD",
      marketTokenAddress: AddressZero,
      indexTokenSymbol: "BTC",
      longCollateralSymbol: "BTC",
      shortCollateralSymbol: "USDC",
    },
    {
      perp: "SOL/USD",
      marketTokenAddress: AddressZero,
      indexTokenSymbol: "SOL",
      longCollateralSymbol: "AVAX",
      shortCollateralSymbol: "USDC",
    },
  ],
  [AVALANCHE_FUJI_TESTNET]: [
    {
      perp: "ETH/USD",
      marketTokenAddress: AddressZero,
      indexTokenSymbol: "ETH",
      longCollateralSymbol: "AVAX",
      shortCollateralSymbol: "USDC",
    },
    {
      perp: "BNB/USD",
      marketTokenAddress: AddressZero,
      indexTokenSymbol: "BNB",
      longCollateralSymbol: "AVAX",
      shortCollateralSymbol: "USDC",
    },
    {
      perp: "BTC/USD",
      marketTokenAddress: AddressZero,
      indexTokenSymbol: "BTC",
      longCollateralSymbol: "AVAX",
      shortCollateralSymbol: "USDC",
    },
    {
      perp: "SOL/USD",
      marketTokenAddress: AddressZero,
      indexTokenSymbol: "SOL",
      longCollateralSymbol: "AVAX",
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
