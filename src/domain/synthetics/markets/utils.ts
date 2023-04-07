import { BigNumber } from "ethers";
import { PRECISION } from "lib/legacy";
import { applyFactor } from "lib/numbers";
import { convertToContractPrices, convertToUsd, getMidPrice, getTokenData } from "../tokens";
import { TokensData } from "../tokens/types";
import {
  ContractMarketPrices,
  Market,
  MarketPoolType,
  MarketTokensData,
  MarketsData,
  MarketsOpenInterestData,
  MarketsPoolsData,
} from "./types";

export function getMarket(marketsData: MarketsData, marketAddress?: string) {
  if (!marketAddress) return undefined;

  return marketsData[marketAddress];
}

export function getMarketPools(poolsData: MarketsPoolsData, marketAddress?: string) {
  if (!marketAddress) return undefined;

  return poolsData[marketAddress];
}

export function getMarketTokenData(marketTokensData: MarketTokensData, marketAddress?: string) {
  if (!marketAddress) return undefined;

  return marketTokensData[marketAddress];
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
      return `${gmText}---/--- [-------]`;
    }

    return undefined;
  }

  return `${gmText} ${indexToken.symbol}/${market.perp} [${longToken.symbol}-${shortToken.symbol}]`;
}

export function getMarketPoolName(marketsData: MarketsData, tokensData: TokensData, marketAddress?: string) {
  const market = getMarket(marketsData, marketAddress);
  const longToken = getTokenData(tokensData, market?.longTokenAddress);
  const shortToken = getTokenData(tokensData, market?.shortTokenAddress);

  if (!market || !longToken || !shortToken) {
    return undefined;
  }

  return `${longToken.symbol}-${shortToken.symbol}`;
}

export function getMarketIndexName(marketsData: MarketsData, tokensData: TokensData, marketAddress?: string) {
  const market = getMarket(marketsData, marketAddress);
  const indexToken = getTokenData(tokensData, market?.indexTokenAddress, "native");

  if (!market || !indexToken) {
    return undefined;
  }

  return `${indexToken.symbol}/${market.perp}`;
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

export function isMarketCollateral(market: Market, tokenAddress: string) {
  return [market.longTokenAddress, market.shortTokenAddress].includes(tokenAddress);
}

export function getOpenInterest(openInterestData: MarketsOpenInterestData, marketAddress?: string) {
  if (!marketAddress) return undefined;

  return openInterestData[marketAddress];
}

export function getMostLiquidMarketForPosition(
  marketsData: MarketsData,
  poolsData: MarketsPoolsData,
  openInterestData: MarketsOpenInterestData,
  tokensData: TokensData,
  indexTokenAddress?: string,
  collateralTokenAddress?: string,
  isLong?: boolean
) {
  if (!indexTokenAddress || typeof isLong === "undefined") return undefined;

  const markets = Object.values(marketsData);

  let bestMarketAddress: string = markets[0]?.marketTokenAddress;
  let bestLiquidity: BigNumber | undefined;

  const shouldIgnoreCollaterals = !collateralTokenAddress;

  for (const market of markets) {
    if (
      (shouldIgnoreCollaterals ||
        [market.longTokenAddress, market.shortTokenAddress].includes(collateralTokenAddress)) &&
      market.indexTokenAddress === indexTokenAddress
    ) {
      const liquidity = getAvailableUsdLiquidityForPosition(
        marketsData,
        poolsData,
        openInterestData,
        tokensData,
        market.marketTokenAddress,
        isLong
      );

      if (liquidity && liquidity.gt(bestLiquidity || 0)) {
        bestMarketAddress = market.marketTokenAddress;
        bestLiquidity = liquidity;
      }
    }
  }

  return getMarket(marketsData, bestMarketAddress);
}

export function getMostLiquidMarketForSwap(
  marketsData: MarketsData,
  poolsData: MarketsPoolsData,
  openInterestData: MarketsOpenInterestData,
  tokensData: TokensData,
  toTokenAddress: string | undefined
) {
  if (!toTokenAddress) return undefined;

  const markets = Object.values(marketsData);

  let bestMarketAddress: string | undefined;
  let bestLiquidity: BigNumber | undefined;

  for (const m of markets) {
    if ([m.longTokenAddress, m.shortTokenAddress].includes(toTokenAddress)) {
      const liquidity = getAvailableUsdLiquidityForCollateral(
        marketsData,
        poolsData,
        openInterestData,
        tokensData,
        m.marketTokenAddress,
        toTokenAddress
      );

      if (liquidity && (!bestLiquidity || liquidity.gt(bestLiquidity))) {
        bestMarketAddress = m.marketTokenAddress;
        bestLiquidity = liquidity;
      }
    }
  }

  return getMarket(marketsData, bestMarketAddress);
}

export function getPoolAmount(
  marketsData: MarketsData,
  poolsData: MarketsPoolsData,
  tokensData: TokensData,
  marketAddress: string | undefined,
  tokenAddress: string | undefined
) {
  const pools = getMarketPools(poolsData, marketAddress);
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

// getPoolUsdWithoutPnl
export function getPoolUsd(
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

export function getReservedUsd(
  marketsData: MarketsData,
  openInterestData: MarketsOpenInterestData,
  tokensData: TokensData,
  marketAddress: string | undefined,
  isLong: boolean
) {
  const market = getMarket(marketsData, marketAddress);
  const openInterest = getOpenInterest(openInterestData, marketAddress);
  const indexToken = getTokenData(tokensData, market?.indexTokenAddress);

  const openInterestValue = isLong ? openInterest?.longInterestInTokens : openInterest?.shortInterestInTokens;

  const price = isLong ? indexToken?.prices?.maxPrice : indexToken?.prices?.minPrice;

  return convertToUsd(openInterestValue, indexToken?.decimals, price);
}

export function getMaxReservedUsd(
  marketsData: MarketsData,
  poolsData: MarketsPoolsData,
  tokensData: TokensData,
  marketAddress: string | undefined,
  isLong: boolean
) {
  const market = getMarket(marketsData, marketAddress);
  const pool = getMarketPools(poolsData, marketAddress);
  const tokenAddress = isLong ? market?.longTokenAddress : market?.shortTokenAddress;

  const poolUsd = getPoolUsd(marketsData, poolsData, tokensData, marketAddress, tokenAddress, "minPrice");
  const reserveFactor = isLong ? pool?.reserveFactorLong : pool?.reserveFactorShort;

  if (!poolUsd || !reserveFactor) return undefined;

  return poolUsd.mul(reserveFactor).div(PRECISION);
}

export function getAvailableUsdLiquidityForPosition(
  marketsData: MarketsData,
  poolsData: MarketsPoolsData,
  openInterestData: MarketsOpenInterestData,
  tokensData: TokensData,
  marketAddress: string | undefined,
  isLong: boolean
) {
  const maxReservedUsd = getMaxReservedUsd(marketsData, poolsData, tokensData, marketAddress, isLong);
  const reservedUsd = getReservedUsd(marketsData, openInterestData, tokensData, marketAddress, isLong);

  if (!maxReservedUsd || !reservedUsd) return undefined;

  return maxReservedUsd.sub(reservedUsd);
}

export function getAvailableUsdLiquidityForCollateral(
  marketsData: MarketsData,
  poolsData: MarketsPoolsData,
  openInterestData: MarketsOpenInterestData,
  tokensData: TokensData,
  marketAddress: string | undefined,
  tokenAddress: string | undefined
) {
  const market = getMarket(marketsData, marketAddress);
  const wrappedToken = getTokenData(tokensData, tokenAddress, "wrapped");

  tokenAddress = wrappedToken?.address;

  if (!market || !tokenAddress || !isMarketCollateral(market, tokenAddress)) return undefined;

  const isLong = market?.longTokenAddress === tokenAddress;

  const reservedUsd = getReservedUsd(marketsData, openInterestData, tokensData, marketAddress, isLong);

  const poolUsd = getPoolUsd(marketsData, poolsData, tokensData, marketAddress, tokenAddress, "minPrice");

  if (!reservedUsd || !poolUsd) return undefined;

  return poolUsd.sub(reservedUsd);
}

// TODO: for deposits / withdrawals in minTokenAmount
export function getPoolValue(
  marketsData: MarketsData,
  openInterestData: MarketsOpenInterestData,
  poolsData: MarketsPoolsData,
  tokensData: TokensData,
  marketAddress: string | undefined,
  maximize: boolean
) {
  const market = getMarket(marketsData, marketAddress);
  const indexToken = getTokenData(tokensData, market?.indexTokenAddress);
  const pool = getMarketPools(poolsData, marketAddress);

  const longPoolUsd = getPoolUsd(
    marketsData,
    poolsData,
    tokensData,
    marketAddress,
    market?.longTokenAddress,
    maximize ? "maxPrice" : "minPrice"
  );

  const shortPoolUsd = getPoolUsd(
    marketsData,
    poolsData,
    tokensData,
    marketAddress,
    market?.shortTokenAddress,
    maximize ? "maxPrice" : "minPrice"
  );

  const totalPoolUsd = longPoolUsd?.add(shortPoolUsd || 0);

  const longBorrowingFees = getTotalBorrowingFees(openInterestData, poolsData, marketAddress, true);
  const shortBorrowingFees = getTotalBorrowingFees(openInterestData, poolsData, marketAddress, false);

  let totalBorrowingFees = longBorrowingFees?.add(shortBorrowingFees || 0);
  totalBorrowingFees =
    totalBorrowingFees && pool ? applyFactor(totalBorrowingFees, pool.borrowingFeeReceiverFactor) : undefined;

  const impactPoolAmount = pool?.positionImpactPoolAmount;

  const impactPoolUsd = convertToUsd(
    impactPoolAmount,
    indexToken?.decimals,
    maximize ? indexToken?.prices?.maxPrice : indexToken?.prices?.minPrice
  );

  const netPnl = maximize ? pool?.netPnlMin : pool?.netPnlMax;

  if (!totalPoolUsd || !totalBorrowingFees || !impactPoolUsd || !netPnl) {
    return undefined;
  }

  const value = totalPoolUsd.add(totalBorrowingFees).add(impactPoolUsd);

  return value.sub(netPnl);
}

export function getCappedPoolPnl(
  poolsData: MarketsPoolsData,
  marketAddress?: string,
  poolPnl?: BigNumber,
  poolUsd?: BigNumber,
  isLong?: boolean
) {
  if (poolPnl?.lt(0)) {
    return poolPnl;
  }

  const pool = getMarketPools(poolsData, marketAddress);

  const maxPnlFactor = isLong ? pool?.maxPnlFactorLong : pool?.maxPnlFactorShort;

  if (!poolUsd || !maxPnlFactor) return undefined;

  const maxPnl = applyFactor(poolUsd, maxPnlFactor);

  return poolPnl?.gt(maxPnl) ? maxPnl : poolPnl;
}

// TODO: fix?
export function getTotalBorrowingFees(
  openInterestData: MarketsOpenInterestData,
  poolsData: MarketsPoolsData,
  marketAddress: string | undefined,
  isLong: boolean
): BigNumber | undefined {
  const pools = getMarketPools(poolsData, marketAddress);
  const openInterest = getOpenInterest(openInterestData, marketAddress);

  const openInterestValue = isLong ? openInterest?.longInterestUsd : openInterest?.shortInterestUsd;

  const cumulativeBorrowingFactor = isLong
    ? pools?.cummulativeBorrowingFactorLong
    : pools?.cummulativeBorrowingFactorShort;

  const totalBorrowing = isLong ? pools?.totalBorrowingLong : pools?.totalBorrowingShort;

  if (!openInterestValue || !cumulativeBorrowingFactor || !totalBorrowing) {
    return undefined;
  }

  return openInterestValue.mul(cumulativeBorrowingFactor).sub(totalBorrowing);
}

export function getClaimableFundingAmount(
  poolsData: MarketsPoolsData,
  marketAddress: string | undefined,
  isLong: boolean
) {
  const pool = getMarketPools(poolsData, marketAddress);

  return isLong ? pool?.claimableFundingAmountLong : pool?.claimableFundingAmountShort;
}

export function getTotalClaimableFundingUsd(
  marketsData: MarketsData,
  poolsData: MarketsPoolsData,
  tokensData: TokensData
) {
  const markets = Object.values(marketsData);

  return markets.reduce((acc, market) => {
    const longToken = getTokenData(tokensData, market.longTokenAddress);
    const shortToken = getTokenData(tokensData, market.shortTokenAddress);

    const amountLong = getClaimableFundingAmount(poolsData, market.marketTokenAddress, true);
    const amountShort = getClaimableFundingAmount(poolsData, market.marketTokenAddress, false);

    const usdLong = convertToUsd(amountLong, longToken?.decimals, longToken?.prices?.minPrice);
    const usdShort = convertToUsd(amountShort, shortToken?.decimals, shortToken?.prices?.minPrice);

    return acc.add(usdLong || 0).add(usdShort || 0);
  }, BigNumber.from(0));
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
): ContractMarketPrices | undefined {
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
