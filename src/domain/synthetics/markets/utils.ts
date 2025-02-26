import { BASIS_POINTS_DIVISOR, USD_DECIMALS } from "config/factors";
import { GLV_MARKETS } from "config/markets";
import { PRECISION, expandDecimals } from "lib/numbers";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";
import {
  getAvailableUsdLiquidityForCollateral,
  getMarketPnl,
  getOpenInterestUsd,
  getPoolUsdWithoutPnl,
  getReservedUsd,
  getTokenPoolType,
} from "sdk/utils/markets";
import { getCappedPositionImpactUsd } from "../fees";
import { PositionInfo } from "../positions";
import { TokenData, TokensData } from "../tokens/types";
import { convertToTokenAmount, convertToUsd, getMidPrice } from "../tokens/utils";
import { isGlvInfo } from "./glv";
import { GlvInfo, GlvOrMarketInfo, MarketInfo } from "./types";
import { getCappedPoolPnl } from "./utils";

export * from "sdk/utils/markets";

export function getGlvMarketName(chainId: number, address: string) {
  return GLV_MARKETS[chainId]?.[address]?.name;
}

export function getGlvDisplayName(glv: GlvInfo) {
  return glv.name !== undefined ? `GLV: ${glv.name}` : "GLV";
}

export function getGlvOrMarketAddress(marketOrGlvInfo: MarketInfo | GlvInfo): string;
export function getGlvOrMarketAddress(marketOrGlvInfo?: undefined): undefined;
export function getGlvOrMarketAddress(marketOrGlvInfo?: MarketInfo | GlvInfo) {
  if (!marketOrGlvInfo) {
    return undefined;
  }

  return isMarketInfo(marketOrGlvInfo) ? marketOrGlvInfo.marketTokenAddress : marketOrGlvInfo.glvTokenAddress;
}

export function getMarketBadge(chainId: number, market: GlvOrMarketInfo | undefined) {
  if (!market) {
    return undefined;
  }

  if (isGlvInfo(market)) {
    return GLV_MARKETS[chainId]?.[getGlvOrMarketAddress(market)]?.shortening || "GLV";
  }

  return market.isSpotOnly ? undefined : ([market.longToken.symbol, market.shortToken.symbol] as const);
}

export function getGlvMarketSubtitle(chainId: number, address: string) {
  return GLV_MARKETS[chainId]?.[address]?.subtitle || "";
}

export function getGlvMarketShortening(chainId: number, address: string) {
  return GLV_MARKETS[chainId]?.[address]?.shortening || "";
}

function isMarketCollateral(marketInfo: MarketInfo, tokenAddress: string) {
  return getTokenPoolType(marketInfo, tokenAddress) !== undefined;
}

export function isMarketIndexToken({ indexToken }: { indexToken: TokenData }, tokenAddress: string) {
  return tokenAddress === indexToken.address || (tokenAddress === NATIVE_TOKEN_ADDRESS && indexToken.isWrapped);
}

export function getMaxOpenInterestUsd(marketInfo: MarketInfo, isLong: boolean) {
  return isLong ? marketInfo.maxOpenInterestLong : marketInfo.maxOpenInterestShort;
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

  return result < 0n ? 0n : result;
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

export function getMarketNetPnl(marketInfo: MarketInfo, maximize: boolean) {
  const longPnl = getMarketPnl(marketInfo, true, maximize);
  const shortPnl = getMarketPnl(marketInfo, false, maximize);

  const cappedLongPnl = getCappedPoolPnl({
    marketInfo,
    poolUsd: getPoolUsdWithoutPnl(marketInfo, true, maximize ? "maxPrice" : "minPrice"),
    poolPnl: longPnl,
    isLong: true,
  });

  const cappedShortPnl = getCappedPoolPnl({
    marketInfo,
    poolUsd: getPoolUsdWithoutPnl(marketInfo, false, maximize ? "maxPrice" : "minPrice"),
    poolPnl: shortPnl,
    isLong: false,
  });

  return cappedLongPnl + cappedShortPnl;
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

function getDepositCapacityAmount(marketInfo: MarketInfo, isLong: boolean) {
  const poolAmount = isLong ? marketInfo.longPoolAmount : marketInfo.shortPoolAmount;
  const maxPoolAmount = getStrictestMaxPoolAmountForDeposit(marketInfo, isLong);
  const capacityAmount = maxPoolAmount - poolAmount;

  return bigMath.max(0n, capacityAmount);
}

export function getStrictestMaxPoolAmountForDeposit(marketInfo: MarketInfo, isLong: boolean) {
  const maxPoolUsdForDeposit = isLong ? marketInfo.maxLongPoolUsdForDeposit : marketInfo.maxShortPoolUsdForDeposit;
  const maxPoolAmount = isLong ? marketInfo.maxLongPoolAmount : marketInfo.maxShortPoolAmount;
  const token = isLong ? marketInfo.longToken : marketInfo.shortToken;
  const maxPoolAmountForDeposit = convertToTokenAmount(maxPoolUsdForDeposit, token.decimals, getMidPrice(token.prices));

  if (maxPoolAmountForDeposit === undefined) return maxPoolAmount;

  return bigMath.min(maxPoolAmount, maxPoolAmountForDeposit);
}

export function getStrictestMaxPoolUsdForDeposit(marketInfo: MarketInfo, isLong: boolean) {
  const token = isLong ? marketInfo.longToken : marketInfo.shortToken;
  const maxPoolAmount = getStrictestMaxPoolAmountForDeposit(marketInfo, isLong);

  return convertToUsd(maxPoolAmount, token.decimals, getMidPrice(token.prices))!;
}

export function getMaxPoolUsdForSwap(marketInfo: MarketInfo, isLong: boolean) {
  const token = isLong ? marketInfo.longToken : marketInfo.shortToken;
  const maxPoolAmount = isLong ? marketInfo.maxLongPoolAmount : marketInfo.maxShortPoolAmount;

  return convertToUsd(maxPoolAmount, token.decimals, getMidPrice(token.prices))!;
}

export function getDepositCapacityUsd(marketInfo: MarketInfo, isLong: boolean) {
  const poolUsd = getPoolUsdWithoutPnl(marketInfo, isLong, "midPrice");
  const maxPoolUsd = getStrictestMaxPoolUsdForDeposit(marketInfo, isLong);

  const capacityUsd = maxPoolUsd - poolUsd;

  return bigMath.max(0n, capacityUsd);
}

export function getMintableMarketTokens(marketInfo: MarketInfo, marketToken: TokenData) {
  const longDepositCapacityAmount = getDepositCapacityAmount(marketInfo, true);
  const shortDepositCapacityAmount = getDepositCapacityAmount(marketInfo, false);

  const longDepositCapacityUsd = getDepositCapacityUsd(marketInfo, true);
  const shortDepositCapacityUsd = getDepositCapacityUsd(marketInfo, false);

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
      totalAmount: 0n,
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
  if (supply == 0n && poolValue > 0n) {
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

export function getTotalGlvInfo(tokensData?: TokensData) {
  const defaultResult = {
    balance: 0n,
    balanceUsd: 0n,
  };

  if (!tokensData) {
    return defaultResult;
  }

  const tokens = Object.values(tokensData).filter((token) => token.symbol === "GLV");

  return tokens.reduce((acc, token) => {
    const balanceUsd = convertToUsd(token.balance, token.decimals, token.prices.minPrice);
    acc.balance = acc.balance + (token.balance ?? 0n);
    acc.balanceUsd = acc.balanceUsd + (balanceUsd ?? 0n);
    return acc;
  }, defaultResult);
}

export function getIsZeroPriceImpactMarket(marketInfo: MarketInfo) {
  return marketInfo.positionImpactFactorNegative === 0n;
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

export const isMarketInfo = (market: GlvInfo | MarketInfo): market is MarketInfo => !isGlvInfo(market);
