import { BigNumber } from "ethers";
import { PRECISION } from "lib/legacy";
import { applyFactor } from "lib/numbers";
import { MarketsFeesConfigsData } from "../fees";
import { convertToContractPrices, convertToUsd, getMidPrice, getTokenData } from "../tokens";
import { TokenData, TokensData } from "../tokens/types";
import {
  ContractMarketPrices,
  Market,
  MarketInfo,
  MarketPoolTokens,
  MarketsData,
  MarketsOpenInterestData,
  MarketsPoolsData,
} from "./types";

export function getMarket(marketsData: MarketsData, marketAddress?: string) {
  if (!marketAddress) return undefined;

  return marketsData[marketAddress];
}

export function getMarketInfo(
  data: {
    marketsData: MarketsData;
    poolsData: MarketsPoolsData;
    openInterestData: MarketsOpenInterestData;
    feesConfigs: MarketsFeesConfigsData;
    tokensData: TokensData;
  },
  marketAddress?: string
): MarketInfo | undefined {
  const { marketsData, poolsData, openInterestData, feesConfigs, tokensData } = data;

  if (!marketAddress) return undefined;

  const market = getMarket(marketsData, marketAddress);
  const pool = poolsData[marketAddress];
  const openInterest = openInterestData[marketAddress];
  const feesConfig = feesConfigs[marketAddress];

  const indexToken = getTokenData(tokensData, market?.indexTokenAddress, "native");
  const longToken = getTokenData(tokensData, market?.longTokenAddress);
  const shortToken = getTokenData(tokensData, market?.shortTokenAddress);

  if (!market || !pool || !openInterest || !feesConfig || !indexToken || !longToken || !shortToken) {
    return undefined;
  }

  return {
    ...market,
    ...pool,
    ...openInterest,
    ...feesConfig,
    longToken,
    shortToken,
    indexToken,
  };
}

export function getMarketName(marketInfo: MarketInfo, opts: { includeGM?: boolean } = {}) {
  const { indexToken, longToken, shortToken, perp } = marketInfo;

  let name = `${indexToken.symbol}/${perp} [${longToken.symbol}-${shortToken.symbol}]`;

  if (opts.includeGM) {
    name = `GM: ${name}`;
  }

  return name;
}

export function getTokenPoolType(marketInfo: MarketInfo, tokenAddress?: string) {
  const { longToken, shortToken } = marketInfo;

  if (!tokenAddress) return undefined;

  if (tokenAddress === longToken.address || tokenAddress === longToken.wrappedAddress) {
    return "long";
  }

  if (tokenAddress === shortToken.address || tokenAddress === shortToken.wrappedAddress) {
    return "short";
  }

  return undefined;
}

export function getOppositeCollateral(marketInfo: MarketInfo, tokenAddress?: string) {
  const poolType = getTokenPoolType(marketInfo, tokenAddress);

  if (poolType === "long") {
    return marketInfo.shortToken;
  }

  if (poolType === "short") {
    return marketInfo.longToken;
  }

  return undefined;
}

export function getMarketCollateral(marketInfo: MarketInfo, isLong: boolean) {
  return isLong ? marketInfo.longToken : marketInfo.shortToken;
}

export function getMarketCollateralByAddress(marketInfo: MarketInfo, tokenAddress?: string) {
  const poolType = getTokenPoolType(marketInfo, tokenAddress);

  if (!poolType) return undefined;

  return getMarketCollateral(marketInfo, poolType === "long");
}

export function isMarketCollateral(marketInfo: MarketInfo, tokenAddress?: string) {
  const poolType = getTokenPoolType(marketInfo, tokenAddress);

  return Boolean(poolType);
}

export function getPoolAmount(marketInfo: MarketInfo, tokenAddress?: string) {
  const poolType = getTokenPoolType(marketInfo, tokenAddress);

  if (poolType === "long") {
    return marketInfo.longPoolAmount;
  }

  if (poolType === "short") {
    return marketInfo.shortPoolAmount;
  }

  return undefined;
}

export function getPoolUsd(
  marketInfo: MarketInfo,
  tokenAddress: string | undefined,
  priceType: "minPrice" | "maxPrice" | "midPrice"
) {
  const poolType = getTokenPoolType(marketInfo, tokenAddress);
  const poolAmount = getPoolAmount(marketInfo, tokenAddress);
  const token = getMarketCollateral(marketInfo, poolType === "long");

  if (!poolAmount || !token?.prices || !poolType) return undefined;

  let price: BigNumber;

  if (priceType === "minPrice") {
    price = token.prices?.minPrice;
  } else if (priceType === "maxPrice") {
    price = token.prices?.maxPrice;
  } else {
    price = getMidPrice(token.prices);
  }

  return convertToUsd(poolAmount, token.decimals, price)!;
}

export function getReservedUsd(marketInfo: MarketInfo, isLong: boolean) {
  const { indexToken } = marketInfo;

  const openInterestValue = isLong ? marketInfo.longInterestInTokens : marketInfo.shortInterestInTokens;

  const price = isLong ? indexToken.prices?.maxPrice : indexToken.prices?.minPrice;

  return convertToUsd(openInterestValue, indexToken?.decimals, price);
}

export function getMaxReservedUsd(marketInfo: MarketInfo, isLong: boolean) {
  const tokenAddress = isLong ? marketInfo.longTokenAddress : marketInfo.shortTokenAddress;

  const poolUsd = getPoolUsd(marketInfo, tokenAddress, "minPrice");
  const reserveFactor = isLong ? marketInfo.reserveFactorLong : marketInfo.reserveFactorShort;

  return poolUsd?.mul(reserveFactor).div(PRECISION);
}

export function getAvailableUsdLiquidityForPosition(marketInfo: MarketInfo, isLong: boolean) {
  const maxReservedUsd = getMaxReservedUsd(marketInfo, isLong);
  const reservedUsd = getReservedUsd(marketInfo, isLong);

  if (!maxReservedUsd || !reservedUsd) return undefined;

  return maxReservedUsd.sub(reservedUsd);
}

export function getAvailableUsdLiquidityForCollateral(marketInfo: MarketInfo, tokenAddress?: string) {
  const poolType = getTokenPoolType(marketInfo, tokenAddress);

  if (!poolType) return undefined;

  const isLong = poolType === "long";

  const reservedUsd = getReservedUsd(marketInfo, isLong);

  const poolUsd = getPoolUsd(marketInfo, tokenAddress, "minPrice");

  if (!reservedUsd || !poolUsd) return undefined;

  return poolUsd.sub(reservedUsd);
}

export function getCappedPoolPnl(marketInfo: MarketInfo, poolPnl?: BigNumber, poolUsd?: BigNumber, isLong?: boolean) {
  if (poolPnl?.lt(0)) {
    return poolPnl;
  }

  const maxPnlFactor = isLong ? marketInfo.maxPnlFactorLong : marketInfo.maxPnlFactorShort;

  if (!poolUsd) return undefined;

  const maxPnl = applyFactor(poolUsd, maxPnlFactor);

  return poolPnl?.gt(maxPnl) ? maxPnl : poolPnl;
}

export function getTotalBorrowingFees(marketInfo: MarketInfo, isLong: boolean): BigNumber | undefined {
  const openInterestValue = isLong ? marketInfo.longInterestUsd : marketInfo.shortInterestUsd;

  const cumulativeBorrowingFactor = isLong
    ? marketInfo.cummulativeBorrowingFactorLong
    : marketInfo.cummulativeBorrowingFactorShort;

  const totalBorrowing = isLong ? marketInfo.totalBorrowingLong : marketInfo.totalBorrowingShort;

  if (!openInterestValue || !cumulativeBorrowingFactor || !totalBorrowing) return undefined;

  return openInterestValue.mul(cumulativeBorrowingFactor).sub(totalBorrowing);
}

// TODO: for deposits / withdrawals in minTokenAmount
export function getPoolValue(marketInfo: MarketInfo, maximize: boolean) {
  const longPoolUsd = getPoolUsd(marketInfo, marketInfo.longTokenAddress, maximize ? "maxPrice" : "minPrice");
  const shortPoolUsd = getPoolUsd(marketInfo, marketInfo?.shortTokenAddress, maximize ? "maxPrice" : "minPrice");

  const longBorrowingFees = getTotalBorrowingFees(marketInfo, true);
  const shortBorrowingFees = getTotalBorrowingFees(marketInfo, false);

  const impactPoolAmount = marketInfo.positionImpactPoolAmount;

  const netPnl = maximize ? marketInfo.netPnlMin : marketInfo.netPnlMax;

  if (!longPoolUsd || !shortPoolUsd || !longBorrowingFees || !shortBorrowingFees || !impactPoolAmount || !netPnl) {
    return undefined;
  }

  const value = longPoolUsd.add(shortPoolUsd).add(longBorrowingFees).add(shortBorrowingFees).add(impactPoolAmount);

  return value.sub(netPnl);
}

export function getMostLiquidMarketForPosition(
  markets: MarketInfo[],
  indexTokenAddress?: string,
  collateralTokenAddress?: string,
  isLong?: boolean
) {
  if (!indexTokenAddress || typeof isLong === "undefined" || !markets.length) return undefined;

  let bestMarket: MarketInfo | undefined;
  let bestLiquidity: BigNumber | undefined;

  const shouldIgnoreCollaterals = !collateralTokenAddress;

  for (const marketInfo of markets) {
    if (
      (shouldIgnoreCollaterals ||
        [marketInfo.longTokenAddress, marketInfo.shortTokenAddress].includes(collateralTokenAddress)) &&
      marketInfo.indexTokenAddress === indexTokenAddress
    ) {
      const liquidity = getAvailableUsdLiquidityForPosition(marketInfo, isLong);

      if (liquidity && liquidity.gt(bestLiquidity || 0)) {
        bestMarket = marketInfo;
        bestLiquidity = liquidity;
      }
    }
  }

  return bestMarket;
}

export function getMostLiquidMarketForSwap(markets: MarketInfo[], toTokenAddress: string | undefined) {
  if (!toTokenAddress || !markets.length) return undefined;

  let bestMarket: MarketInfo | undefined;
  let bestLiquidity: BigNumber | undefined;

  for (const m of markets) {
    if ([m.longTokenAddress, m.shortTokenAddress].includes(toTokenAddress)) {
      const liquidity = getAvailableUsdLiquidityForCollateral(m, toTokenAddress);

      if (liquidity && (!bestLiquidity || liquidity.gt(bestLiquidity))) {
        bestMarket = m;
        bestLiquidity = liquidity;
      }
    }
  }

  return bestMarket;
}

export function getClaimableFundingAmount(marketInfo: MarketInfo, isLong: boolean) {
  return isLong ? marketInfo.claimableFundingAmountLong : marketInfo.claimableFundingAmountShort;
}

export function getTotalClaimableFundingUsd(markets: MarketInfo[], tokensData: TokensData) {
  return markets.reduce((acc, market) => {
    const longToken = getTokenData(tokensData, market.longTokenAddress);
    const shortToken = getTokenData(tokensData, market.shortTokenAddress);

    const amountLong = getClaimableFundingAmount(market, true);
    const amountShort = getClaimableFundingAmount(market, false);

    const usdLong = convertToUsd(amountLong, longToken?.decimals, longToken?.prices?.minPrice);
    const usdShort = convertToUsd(amountShort, shortToken?.decimals, shortToken?.prices?.minPrice);

    return acc.add(usdLong || 0).add(usdShort || 0);
  }, BigNumber.from(0));
}

export function getContractMarketPrices(tokensData: TokensData, market: Market): ContractMarketPrices | undefined {
  const indexToken = getTokenData(tokensData, market.indexTokenAddress);
  const longToken = getTokenData(tokensData, market.longTokenAddress);
  const shortToken = getTokenData(tokensData, market.shortTokenAddress);

  if (!longToken?.prices || !shortToken?.prices || !indexToken?.prices) return undefined;

  return {
    indexTokenPrice: convertToContractPrices(indexToken.prices, indexToken.decimals),
    longTokenPrice: convertToContractPrices(longToken.prices, longToken.decimals),
    shortTokenPrice: convertToContractPrices(shortToken.prices, shortToken.decimals),
  };
}
