import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { Token } from "domain/tokens";
import { PRECISION, USD_DECIMALS } from "lib/legacy";
import { applyFactor, expandDecimals } from "lib/numbers";
import { getByKey } from "lib/objects";
import { getCappedPositionImpactUsd } from "../fees";
import { convertToContractTokenPrices, convertToTokenAmount, convertToUsd, getMidPrice } from "../tokens";
import { TokenData, TokensData } from "../tokens/types";
import { ContractMarketPrices, Market, MarketInfo } from "./types";
import { PositionInfo } from "../positions";
import { bigMath } from "lib/bigmath";
import { BASIS_POINTS_DIVISOR } from "config/factors";

export function getMarketFullName(p: { longToken: Token; shortToken: Token; indexToken: Token; isSpotOnly: boolean }) {
  const { indexToken, longToken, shortToken, isSpotOnly } = p;

  return `${getMarketIndexName({ indexToken, isSpotOnly })} [${getMarketPoolName({ longToken, shortToken })}]`;
}

export function getMarketIndexName(p: { indexToken: Token; isSpotOnly: boolean }) {
  const { indexToken, isSpotOnly } = p;

  if (isSpotOnly) {
    return `SWAP-ONLY`;
  }

  return `${indexToken.baseSymbol || indexToken.symbol}/USD`;
}

export function getMarketPoolName(p: { longToken: Token; shortToken: Token }) {
  const { longToken, shortToken } = p;

  if (longToken.address === shortToken.address) {
    return longToken.symbol;
  }

  return `${longToken.symbol}-${shortToken.symbol}`;
}

/**
 * Apart from usual cases, returns `long` for single token backed markets.
 */
export function getTokenPoolType(marketInfo: MarketInfo, tokenAddress: string): "long" | "short" | undefined {
  const { longToken, shortToken } = marketInfo;

  if (longToken.address === shortToken.address && tokenAddress === longToken.address) {
    return "long";
  }

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

function isMarketCollateral(marketInfo: MarketInfo, tokenAddress: string) {
  return getTokenPoolType(marketInfo, tokenAddress) !== undefined;
}

export function isMarketIndexToken(marketInfo: MarketInfo, tokenAddress: string) {
  return (
    tokenAddress === marketInfo.indexToken.address ||
    (tokenAddress === NATIVE_TOKEN_ADDRESS && marketInfo.indexToken.isWrapped)
  );
}

export function getPoolUsdWithoutPnl(
  marketInfo: MarketInfo,
  isLong: boolean,
  priceType: "minPrice" | "maxPrice" | "midPrice"
) {
  const poolAmount = isLong ? marketInfo.longPoolAmount : marketInfo.shortPoolAmount;
  const token = isLong ? marketInfo.longToken : marketInfo.shortToken;

  let price: bigint | undefined;

  if (priceType === "minPrice") {
    price = token.prices?.minPrice;
  } else if (priceType === "maxPrice") {
    price = token.prices?.maxPrice;
  } else {
    price = getMidPrice(token.prices);
  }

  return convertToUsd(poolAmount, token.decimals, price)!;
}

export function getMaxOpenInterestUsd(marketInfo: MarketInfo, isLong: boolean) {
  return isLong ? marketInfo.maxOpenInterestLong : marketInfo.maxOpenInterestShort;
}

export function getOpenInterestUsd(marketInfo: MarketInfo, isLong: boolean) {
  return isLong ? marketInfo.longInterestUsd : marketInfo.shortInterestUsd;
}

export function getReservedUsd(marketInfo: MarketInfo, isLong: boolean) {
  const { indexToken } = marketInfo;

  if (isLong) {
    return convertToUsd(marketInfo.longInterestInTokens, marketInfo.indexToken.decimals, indexToken.prices.maxPrice)!;
  } else {
    return marketInfo.shortInterestUsd;
  }
}

export function getMaxReservedUsd(marketInfo: MarketInfo, isLong: boolean) {
  const poolUsd = getPoolUsdWithoutPnl(marketInfo, isLong, "minPrice");

  let reserveFactor = isLong ? marketInfo.reserveFactorLong : marketInfo.reserveFactorShort;

  const openInterestReserveFactor = isLong
    ? marketInfo.openInterestReserveFactorLong
    : marketInfo.openInterestReserveFactorShort;

  if (openInterestReserveFactor < reserveFactor) {
    reserveFactor = openInterestReserveFactor;
  }

  return (poolUsd * reserveFactor) / PRECISION;
}

export function getAvailableUsdLiquidityForPosition(marketInfo: MarketInfo, isLong: boolean) {
  if (marketInfo.isSpotOnly) {
    return 0n;
  }

  const maxReservedUsd = getMaxReservedUsd(marketInfo, isLong);
  const reservedUsd = getReservedUsd(marketInfo, isLong);

  const maxOpenInterest = getMaxOpenInterestUsd(marketInfo, isLong);
  const currentOpenInterest = getOpenInterestUsd(marketInfo, isLong);

  const availableLiquidityBasedOnMaxReserve = maxReservedUsd - reservedUsd;
  const availableLiquidityBasedOnMaxOpenInterest = maxOpenInterest - currentOpenInterest;

  const result =
    availableLiquidityBasedOnMaxReserve < availableLiquidityBasedOnMaxOpenInterest
      ? availableLiquidityBasedOnMaxReserve
      : availableLiquidityBasedOnMaxOpenInterest;

  return result < 0 ? 0n : result;
}

export function getAvailableUsdLiquidityForCollateral(marketInfo: MarketInfo, isLong: boolean) {
  const poolUsd = getPoolUsdWithoutPnl(marketInfo, isLong, "minPrice");

  if (marketInfo.isSpotOnly) {
    return poolUsd;
  }

  const reservedUsd = getReservedUsd(marketInfo, isLong);
  const maxReserveFactor = isLong ? marketInfo.reserveFactorLong : marketInfo.reserveFactorShort;

  if (maxReserveFactor === 0n) {
    return 0n;
  }

  const minPoolUsd = (reservedUsd * PRECISION) / maxReserveFactor;

  const liquidity = poolUsd - minPoolUsd;

  return liquidity;
}

export function getUsedLiquidity(marketInfo: MarketInfo, isLong: boolean): [bigint, bigint] {
  if (marketInfo.isSpotOnly) {
    return [0n, 0n];
  }

  const reservedUsd = getReservedUsd(marketInfo, isLong);
  const maxReservedUsd = getMaxReservedUsd(marketInfo, isLong);

  const openInterestUsd = getOpenInterestUsd(marketInfo, isLong);
  const maxOpenInterestUsd = getMaxOpenInterestUsd(marketInfo, isLong);

  const isReserveSmaller = maxReservedUsd - reservedUsd < maxOpenInterestUsd - openInterestUsd;

  return isReserveSmaller ? [reservedUsd, maxReservedUsd] : [openInterestUsd, maxOpenInterestUsd];
}

export function getCappedPoolPnl(p: { marketInfo: MarketInfo; poolUsd: bigint; isLong: boolean; maximize: boolean }) {
  const { marketInfo, poolUsd, isLong, maximize } = p;

  let poolPnl: bigint;

  if (isLong) {
    poolPnl = maximize ? marketInfo.pnlLongMax : marketInfo.pnlLongMin;
  } else {
    poolPnl = maximize ? marketInfo.pnlShortMax : marketInfo.pnlShortMin;
  }

  if (poolPnl < 0) {
    return poolPnl;
  }

  const maxPnlFactor: bigint = isLong ? marketInfo.maxPnlFactorForTradersLong : marketInfo.maxPnlFactorForTradersShort;
  const maxPnl = applyFactor(poolUsd, maxPnlFactor);

  return poolPnl > maxPnl ? maxPnl : poolPnl;
}

export function getMostLiquidMarketForPosition(
  marketsInfo: MarketInfo[],
  indexTokenAddress: string,
  collateralTokenAddress: string | undefined,
  isLong: boolean
) {
  let bestMarket: MarketInfo | undefined;
  let bestLiquidity: bigint | undefined;

  for (const marketInfo of marketsInfo) {
    if (marketInfo.isSpotOnly) {
      continue;
    }

    let isCandidate = isMarketIndexToken(marketInfo, indexTokenAddress);

    if (collateralTokenAddress) {
      isCandidate = isMarketCollateral(marketInfo, collateralTokenAddress);
    }

    if (isCandidate) {
      const liquidity = getAvailableUsdLiquidityForPosition(marketInfo, isLong);

      if (liquidity !== undefined && liquidity > (bestLiquidity ?? 0)) {
        bestMarket = marketInfo;
        bestLiquidity = liquidity;
      }
    }
  }

  return bestMarket;
}

export function getMinPriceImpactMarket(
  marketsInfo: MarketInfo[],
  indexTokenAddress: string,
  isLong: boolean,
  isIncrease: boolean,
  sizeDeltaUsd: bigint
) {
  let bestMarket: MarketInfo | undefined;
  // minimize negative impact
  let bestImpactDeltaUsd: bigint | undefined;

  for (const marketInfo of marketsInfo) {
    const liquidity = getAvailableUsdLiquidityForPosition(marketInfo, isLong);

    if (isMarketIndexToken(marketInfo, indexTokenAddress) && liquidity > sizeDeltaUsd) {
      const priceImpactDeltaUsd = getCappedPositionImpactUsd(marketInfo, sizeDeltaUsd, isLong);

      if (bestImpactDeltaUsd === undefined || priceImpactDeltaUsd > bestImpactDeltaUsd) {
        bestMarket = marketInfo;
        bestImpactDeltaUsd = priceImpactDeltaUsd;
      }
    }
  }

  return {
    bestMarket,
    bestImpactDeltaUsd,
  };
}

export function getTotalClaimableFundingUsd(markets: MarketInfo[]) {
  return markets.reduce((acc, market) => {
    const { longToken, shortToken } = market;

    const amountLong = market.claimableFundingAmountLong;
    const amountShort = market.claimableFundingAmountShort;

    const usdLong = convertToUsd(amountLong, longToken.decimals, longToken.prices.minPrice);
    const usdShort = convertToUsd(amountShort, shortToken.decimals, shortToken.prices.minPrice);

    return acc + (usdLong ?? 0n) + (usdShort ?? 0n);
  }, 0n);
}

export function getTotalAccruedFundingUsd(positions: PositionInfo[]) {
  return positions.reduce((acc, position) => {
    if (position.pendingClaimableFundingFeesUsd != undefined) return acc + position.pendingClaimableFundingFeesUsd;

    return acc;
  }, 0n);
}

export function getMaxPoolUsdForDeposit(marketInfo: MarketInfo, isLong: boolean) {
  const token = isLong ? marketInfo.longToken : marketInfo.shortToken;
  const maxPoolAmount = getMaxPoolAmountForDeposit(marketInfo, isLong);

  return convertToUsd(maxPoolAmount, token.decimals, getMidPrice(token.prices))!;
}

export function getDepositCollateralCapacityAmount(marketInfo: MarketInfo, isLong: boolean) {
  const poolAmount = isLong ? marketInfo.longPoolAmount : marketInfo.shortPoolAmount;
  const maxPoolAmount = getMaxPoolAmountForDeposit(marketInfo, isLong);

  const capacityAmount = maxPoolAmount - poolAmount;

  return capacityAmount > 0 ? capacityAmount : 0n;
}

export function getMaxPoolAmountForDeposit(marketInfo: MarketInfo, isLong: boolean) {
  const maxAmountForDeposit = isLong ? marketInfo.maxLongPoolAmountForDeposit : marketInfo.maxShortPoolAmountForDeposit;
  const maxAmountForSwap = isLong ? marketInfo.maxLongPoolAmount : marketInfo.maxShortPoolAmount;

  return maxAmountForDeposit < maxAmountForSwap ? maxAmountForDeposit : maxAmountForSwap;
}

export function getDepositCollateralCapacityUsd(marketInfo: MarketInfo, isLong: boolean) {
  const poolUsd = getPoolUsdWithoutPnl(marketInfo, isLong, "midPrice");
  const maxPoolUsd = getMaxPoolUsdForDeposit(marketInfo, isLong);

  const capacityUsd = maxPoolUsd - poolUsd;

  return capacityUsd > 0 ? capacityUsd : 0n;
}

export function getMintableMarketTokens(marketInfo: MarketInfo, marketToken: TokenData) {
  const longDepositCapacityAmount = getDepositCollateralCapacityAmount(marketInfo, true);
  const shortDepositCapacityAmount = getDepositCollateralCapacityAmount(marketInfo, false);

  const longDepositCapacityUsd = getDepositCollateralCapacityUsd(marketInfo, true);
  const shortDepositCapacityUsd = getDepositCollateralCapacityUsd(marketInfo, false);

  const mintableUsd = longDepositCapacityUsd + shortDepositCapacityUsd;
  const mintableAmount = usdToMarketTokenAmount(marketInfo, marketToken, mintableUsd);

  return {
    mintableAmount,
    mintableUsd,
    longDepositCapacityUsd,
    shortDepositCapacityUsd,
    longDepositCapacityAmount,
    shortDepositCapacityAmount,
  };
}

export function getSellableMarketToken(marketInfo: MarketInfo, marketToken: TokenData) {
  const { longToken, shortToken, longPoolAmount, shortPoolAmount } = marketInfo;
  const longPoolUsd = convertToUsd(longPoolAmount, longToken.decimals, longToken.prices.maxPrice)!;
  const shortPoolUsd = convertToUsd(shortPoolAmount, shortToken.decimals, shortToken.prices.maxPrice)!;
  const longCollateralLiquidityUsd = getAvailableUsdLiquidityForCollateral(marketInfo, true);
  const shortCollateralLiquidityUsd = getAvailableUsdLiquidityForCollateral(marketInfo, false);

  const factor = expandDecimals(1, 8);

  if (
    longPoolUsd == 0n ||
    shortPoolUsd == 0n ||
    longCollateralLiquidityUsd == 0n ||
    shortCollateralLiquidityUsd == 0n
  ) {
    return {
      maxLongSellableUsd: 0n,
      maxShortSellableUsd: 0n,
      total: 0n,
    };
  }

  const ratio = bigMath.mulDiv(longPoolUsd, factor, shortPoolUsd);
  let maxLongSellableUsd: bigint;
  let maxShortSellableUsd: bigint;

  if (bigMath.mulDiv(shortCollateralLiquidityUsd, ratio, factor) <= longCollateralLiquidityUsd) {
    maxLongSellableUsd = bigMath.mulDiv(shortCollateralLiquidityUsd, ratio, factor);
    maxShortSellableUsd = shortCollateralLiquidityUsd;
  } else {
    maxLongSellableUsd = longCollateralLiquidityUsd;
    maxShortSellableUsd = (longCollateralLiquidityUsd / ratio) * factor;
  }

  const maxLongSellableAmount = usdToMarketTokenAmount(marketInfo, marketToken, maxLongSellableUsd);
  const maxShortSellableAmount = usdToMarketTokenAmount(marketInfo, marketToken, maxShortSellableUsd);

  return {
    maxLongSellableUsd,
    maxShortSellableUsd,
    maxLongSellableAmount,
    maxShortSellableAmount,
    totalUsd: maxLongSellableUsd + maxShortSellableUsd,
    totalAmount: maxLongSellableAmount + maxShortSellableAmount,
  };
}

export function usdToMarketTokenAmount(marketInfo: MarketInfo, marketToken: TokenData, usdValue: bigint) {
  const supply = marketToken.totalSupply!;
  const poolValue = marketInfo.poolValueMax!;
  // if the supply and poolValue is zero, use 1 USD as the token price
  if (supply == 0n && poolValue == 0n) {
    return convertToTokenAmount(usdValue, marketToken.decimals, expandDecimals(1, USD_DECIMALS))!;
  }

  // if the supply is zero and the poolValue is more than zero,
  // then include the poolValue for the amount of tokens minted so that
  // the market token price after mint would be 1 USD
  if (supply == 0n && poolValue > 0) {
    return convertToTokenAmount(usdValue + poolValue, marketToken.decimals, expandDecimals(1, USD_DECIMALS))!;
  }

  if (poolValue == 0n) {
    return 0n;
  }

  return bigMath.mulDiv(supply, usdValue, poolValue);
}

export function marketTokenAmountToUsd(marketInfo: MarketInfo, marketToken: TokenData, amount: bigint) {
  const supply = marketToken.totalSupply!;
  const poolValue = marketInfo.poolValueMax!;

  const price =
    supply == 0n
      ? expandDecimals(1, USD_DECIMALS)
      : bigMath.mulDiv(poolValue, expandDecimals(1, marketToken.decimals), supply);

  return convertToUsd(amount, marketToken.decimals, price)!;
}

export function getContractMarketPrices(tokensData: TokensData, market: Market): ContractMarketPrices | undefined {
  const indexToken = getByKey(tokensData, market.indexTokenAddress);
  const longToken = getByKey(tokensData, market.longTokenAddress);
  const shortToken = getByKey(tokensData, market.shortTokenAddress);

  if (!indexToken || !longToken || !shortToken) {
    return undefined;
  }

  return {
    indexTokenPrice: convertToContractTokenPrices(indexToken.prices, indexToken.decimals),
    longTokenPrice: convertToContractTokenPrices(longToken.prices, longToken.decimals),
    shortTokenPrice: convertToContractTokenPrices(shortToken.prices, shortToken.decimals),
  };
}

export function getTotalGmInfo(tokensData?: TokensData) {
  const defaultResult = {
    balance: 0n,
    balanceUsd: 0n,
  };

  if (!tokensData) {
    return defaultResult;
  }

  const tokens = Object.values(tokensData).filter((token) => token.symbol === "GM");

  return tokens.reduce((acc, token) => {
    const balanceUsd = convertToUsd(token.balance, token.decimals, token.prices.minPrice);
    acc.balance = acc.balance + (token.balance ?? 0n);
    acc.balanceUsd = acc.balanceUsd + (balanceUsd ?? 0n);
    return acc;
  }, defaultResult);
}

export function getMaxLeverageByMinCollateralFactor(minCollateralFactor: bigint | undefined) {
  if (minCollateralFactor === undefined) return 100 * BASIS_POINTS_DIVISOR;
  if (minCollateralFactor === 0n) return 100 * BASIS_POINTS_DIVISOR;

  const x = Number(PRECISION / minCollateralFactor);
  const rounded = Math.round(x / 10) * 10;
  return rounded * BASIS_POINTS_DIVISOR;
}

export function getMaxAllowedLeverageByMinCollateralFactor(minCollateralFactor: bigint | undefined) {
  return getMaxLeverageByMinCollateralFactor(minCollateralFactor) / 2;
}

export function getTradeboxLeverageSliderMarks(maxLeverage: number) {
  const allowedLeverage = Math.round(maxLeverage / 2 / BASIS_POINTS_DIVISOR);

  if (allowedLeverage >= 125) {
    return [0.1, 1, 2, 5, 10, 25, 50, 75, 100, allowedLeverage];
  } else if (allowedLeverage >= 120) {
    return [0.1, 1, 2, 5, 10, 15, 30, 60, 90, 120];
  } else if (allowedLeverage >= 110) {
    return [0.1, 1, 2, 5, 10, 25, 50, 75, 100, 110];
  } else if (allowedLeverage >= 100) {
    return [0.1, 1, 2, 5, 10, 15, 25, 50, 75, 100];
  } else if (allowedLeverage >= 90) {
    return [0.1, 1, 2, 5, 10, 15, 30, 60, 90];
  } else if (allowedLeverage >= 80) {
    return [0.1, 1, 2, 5, 10, 15, 30, 60, 80];
  } else if (allowedLeverage >= 75) {
    return [0.1, 1, 2, 5, 10, 15, 30, 50, 75];
  } else if (allowedLeverage >= 70) {
    return [0.1, 1, 2, 5, 10, 15, 30, 50, 70];
  } else if (allowedLeverage >= 60) {
    return [0.1, 1, 2, 5, 10, 15, 25, 50, 60];
  } else if (allowedLeverage >= 50) {
    return [0.1, 1, 2, 5, 10, 15, 25, 50];
  } else if (allowedLeverage >= 30) {
    return [0.1, 1, 2, 5, 10, 15, 30];
  } else {
    return [0.1, 1, 2, 5, 10];
  }
}
