import { convertToContractPrices, convertToUsd, getMidPrice, getTokenData } from "../tokens";
import { TokensData } from "../tokens/types";
import {
  Market,
  MarketPoolType,
  MarketTokensData,
  MarketsData,
  MarketsOpenInterestData,
  MarketsPoolsData,
} from "./types";
import { BigNumber } from "ethers";

export function getMarket(marketsData: MarketsData, marketAddress?: string) {
  if (!marketAddress) return undefined;

  return marketsData[marketAddress];
}

export function getMarkets(marketsData: MarketsData) {
  return Object.values(marketsData);
}

export function getMarketPoolData(poolsData: MarketsPoolsData, marketAddress?: string) {
  if (!marketAddress) return undefined;

  return poolsData[marketAddress];
}

export function getMarketTokenData(marketTokensData: MarketTokensData, marketAddress?: string) {
  if (!marketAddress) return undefined;

  return marketTokensData[marketAddress];
}

export function getMarketByTokens(marketsData: MarketsData, indexToken?: string, collateralToken?: string) {
  const markets = getMarkets(marketsData);

  return markets.find((market) => {
    const byIndex = indexToken ? market.indexTokenAddress === indexToken : true;

    const byCollateral = collateralToken
      ? [market.longTokenAddress, market.shortTokenAddress].includes(collateralToken)
      : true;

    return byIndex && byCollateral;
  });
}

export function getMarketName(
  marketsData: MarketsData,
  tokensData: TokensData,
  marketAddress?: string,
  fallbackToPlaceholder?: boolean,
  includeGm: boolean = true
) {
  const market = getMarket(marketsData, marketAddress);

  const indexToken = getTokenData(tokensData, market?.indexTokenAddress, "native");
  const longToken = getTokenData(tokensData, market?.longTokenAddress);
  const shortToken = getTokenData(tokensData, market?.shortTokenAddress);

  const gmText = includeGm ? "GM: " : "";

  if (!market || !indexToken || !longToken || !shortToken) {
    if (fallbackToPlaceholder) {
      return `${gmText} ---/--- [-------]`;
    }

    return undefined;
  }

  return `${gmText} ${indexToken.symbol}/${market.perp} [${longToken.symbol}-${shortToken.symbol}]`;
}

export function getOppositeCollateral(market?: Market, collateralToken?: string) {
  if (market?.longTokenAddress === collateralToken) {
    return market?.shortTokenAddress;
  }

  if (market?.shortTokenAddress === collateralToken) {
    return market?.longTokenAddress;
  }

  return undefined;
}

export function getOpenInterest(openInterestData: MarketsOpenInterestData, marketAddress?: string) {
  if (!marketAddress) return undefined;

  return openInterestData[marketAddress];
}

export function getPoolAmount(
  marketsData: MarketsData,
  poolsData: MarketsPoolsData,
  tokensData: TokensData,
  marketAddress: string | undefined,
  tokenAddress: string | undefined
) {
  const pools = getMarketPoolData(poolsData, marketAddress);
  const tokenPoolType = getTokenPoolType(marketsData, tokensData, marketAddress, tokenAddress);

  if (!pools || !tokenPoolType) return undefined;

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
  marketAddress: string | undefined,
  tokenAddress: string | undefined,
  priceType: "minPrice" | "maxPrice" | "midPrice"
) {
  const tokenAmount = getPoolAmount(marketsData, poolsData, tokensData, marketAddress, tokenAddress);
  const token = getTokenData(tokensData, tokenAddress);

  let price: BigNumber | undefined;

  if (priceType === "minPrice") {
    price = token?.prices?.minPrice;
  }

  if (priceType === "maxPrice") {
    price = token?.prices?.maxPrice;
  }

  if (priceType === "midPrice") {
    price = getMidPrice(token?.prices);
  }

  return convertToUsd(tokenAmount, token?.decimals, price);
}

export function getTokenPoolType(
  marketsData: MarketsData,
  tokensData: TokensData,
  marketAddress: string | undefined,
  tokenAddress: string | undefined
) {
  const market = getMarket(marketsData, marketAddress);
  const token = getTokenData(tokensData, tokenAddress, "wrapped");

  if (!market || !token) return undefined;

  if (market.longTokenAddress === token.address) {
    return MarketPoolType.Long;
  }

  if (market.shortTokenAddress === token.address) {
    return MarketPoolType.Short;
  }

  return undefined;
}

export function getContractMarketPrices(
  marketsData: MarketsData,
  tokensData: TokensData,
  marketAddress: string | undefined
) {
  const market = getMarket(marketsData, marketAddress)!;

  const longToken = getTokenData(tokensData, market.longTokenAddress);
  const shortToken = getTokenData(tokensData, market.shortTokenAddress);
  const indexToken = getTokenData(tokensData, market.indexTokenAddress);

  if (!longToken?.prices || !shortToken?.prices || !indexToken?.prices) return undefined;

  const marketPrices = {
    indexTokenPrice: convertToContractPrices(indexToken.prices, indexToken.decimals),
    longTokenPrice: convertToContractPrices(longToken.prices, longToken.decimals),
    shortTokenPrice: convertToContractPrices(shortToken.prices, shortToken.decimals),
  };

  return marketPrices;
}
