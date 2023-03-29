import { BigNumber } from "ethers";
import { PRECISION } from "lib/legacy";
import { applyFactor } from "lib/numbers";
import { convertToContractTokenPrices, convertToUsd, getMidPrice, getTokenData } from "../tokens";
import { TokensData } from "../tokens/types";
import { ContractMarketPrices, Market, MarketInfo } from "./types";
import { Token } from "domain/tokens";
import { NATIVE_TOKEN_ADDRESS } from "config/tokens";

export function getMarketFullName(p: { longToken: Token; shortToken: Token; indexToken: Token }) {
  const { indexToken } = p;

  return `${indexToken.symbol}/USD ${getMarketPoolName(p)}`;
}

export function getMarketPoolName(p: { longToken: Token; shortToken: Token }) {
  const { longToken, shortToken } = p;

  return `[${longToken.symbol}-${shortToken.symbol}]`;
}

export function getTokenPoolType(marketInfo: MarketInfo, tokenAddress: string) {
  const { longToken, shortToken } = marketInfo;

  if (tokenAddress === longToken.address || (tokenAddress === NATIVE_TOKEN_ADDRESS && longToken.isWrapped)) {
    return "long";
  }

  if (tokenAddress === shortToken.address || (tokenAddress === NATIVE_TOKEN_ADDRESS && shortToken.isWrapped)) {
    return "short";
  }

  return undefined;
}

export function getOppositeCollateral(marketInfo: MarketInfo, tokenAddress: string) {
  const poolType = getTokenPoolType(marketInfo, tokenAddress);

  if (poolType === "long") {
    return marketInfo.shortToken;
  }

  if (poolType === "short") {
    return marketInfo.longToken;
  }

  return undefined;
}

export function isMarketCollateral(marketInfo: MarketInfo, tokenAddress: string) {
  return getTokenPoolType(marketInfo, tokenAddress) !== undefined;
}

export function isMarketIndexToken(marketInfo: MarketInfo, tokenAddress: string) {
  return (
    tokenAddress === marketInfo.indexToken.address ||
    (tokenAddress === NATIVE_TOKEN_ADDRESS && marketInfo.indexToken.isWrapped)
  );
}

export function getMarketCollateral(marketInfo: MarketInfo, isLong: boolean) {
  return isLong ? marketInfo.longToken : marketInfo.shortToken;
}

export function getPoolUsd(marketInfo: MarketInfo, isLong: boolean, priceType: "minPrice" | "maxPrice" | "midPrice") {
  const poolAmount = isLong ? marketInfo.longPoolAmount : marketInfo.shortPoolAmount;
  const token = isLong ? marketInfo.longToken : marketInfo.shortToken;

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

  const price = isLong ? indexToken.prices.maxPrice : indexToken.prices.minPrice;

  return convertToUsd(openInterestValue, indexToken?.decimals, price)!;
}

export function getMaxReservedUsd(marketInfo: MarketInfo, isLong: boolean) {
  const poolUsd = getPoolUsd(marketInfo, isLong, "minPrice");
  const reserveFactor = isLong ? marketInfo.reserveFactorLong : marketInfo.reserveFactorShort;

  return poolUsd.mul(reserveFactor).div(PRECISION);
}

export function getAvailableUsdLiquidityForPosition(marketInfo: MarketInfo, isLong: boolean) {
  const maxReservedUsd = getMaxReservedUsd(marketInfo, isLong);
  const reservedUsd = getReservedUsd(marketInfo, isLong);

  return maxReservedUsd.sub(reservedUsd);
}

export function getAvailableUsdLiquidityForCollateral(marketInfo: MarketInfo, isLong: boolean) {
  const reservedUsd = getReservedUsd(marketInfo, isLong);

  const poolUsd = getPoolUsd(marketInfo, isLong, "minPrice");

  return poolUsd.sub(reservedUsd);
}

// TODO: for deposits / withdrawals in minTokenAmount
export function getPoolValue(marketInfo: MarketInfo, maximize: boolean) {
  const longPoolUsd = getPoolUsd(marketInfo, true, maximize ? "maxPrice" : "minPrice");
  const shortPoolUsd = getPoolUsd(marketInfo, false, maximize ? "maxPrice" : "minPrice");

  const totalPoolUsd = longPoolUsd.add(shortPoolUsd);

  const longBorrowingFees = getTotalBorrowingFees(marketInfo, true);
  const shortBorrowingFees = getTotalBorrowingFees(marketInfo, false);

  let totalBorrowingFees = longBorrowingFees.add(shortBorrowingFees);
  totalBorrowingFees = applyFactor(totalBorrowingFees, marketInfo.borrowingFeeReceiverFactor);

  const impactPoolAmount = marketInfo?.positionImpactPoolAmount;

  const impactPoolUsd = convertToUsd(
    impactPoolAmount,
    marketInfo.indexToken.decimals,
    maximize ? marketInfo.indexToken.prices.maxPrice : marketInfo.indexToken.prices.minPrice
  )!;

  const netPnl = maximize ? marketInfo.netPnlMin : marketInfo.netPnlMax;

  const value = totalPoolUsd.add(totalBorrowingFees).add(impactPoolUsd);

  return value.sub(netPnl);
}

export function getCappedPoolPnl(marketInfo: MarketInfo, isLong: boolean, maximize: boolean) {
  let poolPnl: BigNumber;

  if (isLong) {
    poolPnl = maximize ? marketInfo.pnlLongMax : marketInfo.pnlLongMin;
  } else {
    poolPnl = maximize ? marketInfo.pnlShortMax : marketInfo.pnlShortMin;
  }

  const poolUsd = getPoolUsd(marketInfo, isLong, maximize ? "maxPrice" : "minPrice");

  if (poolPnl.lt(0)) {
    return poolPnl;
  }

  const maxPnlFactor = isLong ? marketInfo.maxPnlFactorLong : marketInfo.maxPnlFactorShort;

  const maxPnl = applyFactor(poolUsd, maxPnlFactor);

  return poolPnl.gt(maxPnl) ? maxPnl : poolPnl;
}

export function getTotalBorrowingFees(marketInfo: MarketInfo, isLong: boolean): BigNumber {
  const openInterestValue = isLong ? marketInfo.longInterestUsd : marketInfo.shortInterestUsd;

  const cumulativeBorrowingFactor = isLong
    ? marketInfo.cummulativeBorrowingFactorLong
    : marketInfo.cummulativeBorrowingFactorShort;

  const totalBorrowing = isLong ? marketInfo.totalBorrowingLong : marketInfo.totalBorrowingShort;

  return openInterestValue.mul(cumulativeBorrowingFactor).sub(totalBorrowing);
}

export function getMostLiquidMarketForPosition(
  marketsInfo: MarketInfo[],
  indexTokenAddress: string,
  collateralTokenAddress: string | undefined,
  isLong: boolean
) {
  let bestMarket: MarketInfo | undefined;
  let bestLiquidity: BigNumber | undefined;

  for (const marketInfo of marketsInfo) {
    let isCandidate = isMarketIndexToken(marketInfo, indexTokenAddress);

    if (collateralTokenAddress) {
      isCandidate = isMarketCollateral(marketInfo, collateralTokenAddress);
    }

    if (isCandidate) {
      const liquidity = getAvailableUsdLiquidityForPosition(marketInfo, isLong);

      if (liquidity && liquidity.gt(bestLiquidity || 0)) {
        bestMarket = marketInfo;
        bestLiquidity = liquidity;
      }
    }
  }

  return bestMarket;
}

export function getMostLiquidMarketForSwap(marketsInfo: MarketInfo[], toTokenAddress: string) {
  let bestMarket: MarketInfo | undefined;
  let bestLiquidity: BigNumber | undefined;

  for (const marketInfo of marketsInfo) {
    if (isMarketCollateral(marketInfo, toTokenAddress)) {
      const liquidity = getAvailableUsdLiquidityForCollateral(
        marketInfo,
        getTokenPoolType(marketInfo, toTokenAddress) === "long"
      );

      if (liquidity && (!bestLiquidity || liquidity.gt(bestLiquidity))) {
        bestMarket = marketInfo;
        bestLiquidity = liquidity;
      }
    }
  }

  return bestMarket;
}

export function getClaimableFundingAmount(marketInfo: MarketInfo, isLong: boolean) {
  return isLong ? marketInfo.claimableFundingAmountLong : marketInfo.claimableFundingAmountShort;
}

export function getTotalClaimableFundingUsd(markets: MarketInfo[]) {
  return markets.reduce((acc, market) => {
    const { longToken, shortToken } = market;

    const amountLong = getClaimableFundingAmount(market, true);
    const amountShort = getClaimableFundingAmount(market, false);

    const usdLong = convertToUsd(amountLong, longToken?.decimals, longToken?.prices?.minPrice);
    const usdShort = convertToUsd(amountShort, shortToken?.decimals, shortToken?.prices?.minPrice);

    return acc.add(usdLong || 0).add(usdShort || 0);
  }, BigNumber.from(0));
}

export function getContractMarketPrices(tokensData: TokensData, market: Market): ContractMarketPrices {
  const indexToken = getTokenData(tokensData, market.indexTokenAddress)!;
  const longToken = getTokenData(tokensData, market.longTokenAddress)!;
  const shortToken = getTokenData(tokensData, market.shortTokenAddress)!;

  return {
    indexTokenPrice: convertToContractTokenPrices(indexToken.prices, indexToken.decimals),
    longTokenPrice: convertToContractTokenPrices(longToken.prices, longToken.decimals),
    shortTokenPrice: convertToContractTokenPrices(shortToken.prices, shortToken.decimals),
  };
}
