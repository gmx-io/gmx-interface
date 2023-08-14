import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { Token } from "domain/tokens";
import { BigNumber } from "ethers";
import { PRECISION, USD_DECIMALS } from "lib/legacy";
import { applyFactor, expandDecimals } from "lib/numbers";
import { getByKey } from "lib/objects";
import { getCappedPositionImpactUsd } from "../fees";
import { convertToContractTokenPrices, convertToTokenAmount, convertToUsd, getMidPrice } from "../tokens";
import { TokenData, TokensData } from "../tokens/types";
import { ContractMarketPrices, Market, MarketInfo } from "./types";

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

export function getPoolUsdWithoutPnl(
  marketInfo: MarketInfo,
  isLong: boolean,
  priceType: "minPrice" | "maxPrice" | "midPrice"
) {
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

  if (openInterestReserveFactor.lt(reserveFactor)) {
    reserveFactor = openInterestReserveFactor;
  }

  return poolUsd.mul(reserveFactor).div(PRECISION);
}

export function getAvailableUsdLiquidityForPosition(marketInfo: MarketInfo, isLong: boolean) {
  if (marketInfo.isSpotOnly) {
    return BigNumber.from(0);
  }

  const maxReservedUsd = getMaxReservedUsd(marketInfo, isLong);
  const reservedUsd = getReservedUsd(marketInfo, isLong);

  return maxReservedUsd.sub(reservedUsd);
}

export function getAvailableUsdLiquidityForCollateral(marketInfo: MarketInfo, isLong: boolean) {
  const poolUsd = getPoolUsdWithoutPnl(marketInfo, isLong, "minPrice");

  if (marketInfo.isSpotOnly) {
    return poolUsd;
  }

  const reservedUsd = getReservedUsd(marketInfo, isLong);
  const maxReserveFactor = isLong ? marketInfo.reserveFactorLong : marketInfo.reserveFactorShort;

  if (maxReserveFactor.eq(0)) {
    return BigNumber.from(0);
  }

  const minPoolUsd = reservedUsd.mul(PRECISION).div(maxReserveFactor);

  const liqudiity = poolUsd.sub(minPoolUsd);

  return liqudiity;
}

export function getCappedPoolPnl(p: {
  marketInfo: MarketInfo;
  poolUsd: BigNumber;
  isLong: boolean;
  maximize: boolean;
}) {
  const { marketInfo, poolUsd, isLong, maximize } = p;

  let poolPnl: BigNumber;

  if (isLong) {
    poolPnl = maximize ? marketInfo.pnlLongMax : marketInfo.pnlLongMin;
  } else {
    poolPnl = maximize ? marketInfo.pnlShortMax : marketInfo.pnlShortMin;
  }

  if (poolPnl.lt(0)) {
    return poolPnl;
  }

  const maxPnlFactor: BigNumber = isLong
    ? marketInfo.maxPnlFactorForTradersLong
    : marketInfo.maxPnlFactorForTradersShort;

  const maxPnl = applyFactor(poolUsd, maxPnlFactor);

  return poolPnl.gt(maxPnl) ? maxPnl : poolPnl;
}

export function getMostLiquidMarketForPosition(
  marketsInfo: MarketInfo[],
  indexTokenAddress: string,
  collateralTokenAddress: string | undefined,
  isLong: boolean,
  isIncrease: boolean
) {
  let bestMarket: MarketInfo | undefined;
  let bestLiquidity: BigNumber | undefined;

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

export function getMinPriceImpactMarket(
  marketsInfo: MarketInfo[],
  indexTokenAddress: string,
  isLong: boolean,
  isIncrease: boolean,
  sizeDeltaUsd: BigNumber
) {
  let bestMarket: MarketInfo | undefined;
  // minimize negative impact
  let bestImpactDeltaUsd: BigNumber | undefined;

  for (const marketInfo of marketsInfo) {
    const liquidity = getAvailableUsdLiquidityForPosition(marketInfo, isLong);

    if (isMarketIndexToken(marketInfo, indexTokenAddress) && liquidity.gt(sizeDeltaUsd)) {
      const priceImpactDeltaUsd = getCappedPositionImpactUsd(marketInfo, sizeDeltaUsd, isLong);

      if (!bestImpactDeltaUsd || priceImpactDeltaUsd.gt(bestImpactDeltaUsd)) {
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

    return acc.add(usdLong || 0).add(usdShort || 0);
  }, BigNumber.from(0));
}

export function getMaxPoolUsd(marketInfo: MarketInfo, isLong: boolean) {
  if (isLong) {
    return convertToUsd(
      marketInfo.maxLongPoolAmount,
      marketInfo.longToken.decimals,
      getMidPrice(marketInfo.longToken.prices)
    )!;
  } else {
    return convertToUsd(
      marketInfo.maxShortPoolAmount,
      marketInfo.shortToken.decimals,
      getMidPrice(marketInfo.shortToken.prices)
    )!;
  }
}

export function getDepositCollateralCapacityAmount(marketInfo: MarketInfo, isLong: boolean) {
  const poolAmount = isLong ? marketInfo.longPoolAmount : marketInfo.shortPoolAmount;
  const maxPoolAmount = isLong ? marketInfo.maxLongPoolAmount : marketInfo.maxShortPoolAmount;

  const capacityAmount = maxPoolAmount.sub(poolAmount);

  return capacityAmount.gt(0) ? capacityAmount : BigNumber.from(0);
}

export function getDepositCollateralCapacityUsd(marketInfo: MarketInfo, isLong: boolean) {
  const poolUsd = getPoolUsdWithoutPnl(marketInfo, isLong, "midPrice");
  const maxPoolUsd = getMaxPoolUsd(marketInfo, isLong);

  const capacityUsd = maxPoolUsd.sub(poolUsd);

  return capacityUsd.gt(0) ? capacityUsd : BigNumber.from(0);
}

export function getMintableMarketTokens(marketInfo: MarketInfo, marketToken: TokenData) {
  const longDepositCapacityAmount = getDepositCollateralCapacityAmount(marketInfo, true);
  const shortDepositCapacityAmount = getDepositCollateralCapacityAmount(marketInfo, false);

  const longDepositCapacityUsd = getDepositCollateralCapacityUsd(marketInfo, true);
  const shortDepositCapacityUsd = getDepositCollateralCapacityUsd(marketInfo, false);

  const mintableUsd = longDepositCapacityUsd.add(shortDepositCapacityUsd);
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

export function usdToMarketTokenAmount(marketInfo: MarketInfo, marketToken: TokenData, usdValue: BigNumber) {
  const supply = marketToken.totalSupply!;
  const poolValue = marketInfo.poolValueMax!;
  // if the supply and poolValue is zero, use 1 USD as the token price
  if (supply.eq(0) && poolValue.eq(0)) {
    return convertToTokenAmount(usdValue, marketToken.decimals, expandDecimals(1, USD_DECIMALS))!;
  }

  // if the supply is zero and the poolValue is more than zero,
  // then include the poolValue for the amount of tokens minted so that
  // the market token price after mint would be 1 USD
  if (supply.eq(0) && poolValue.gt(0)) {
    return convertToTokenAmount(usdValue.add(poolValue), marketToken.decimals, expandDecimals(1, USD_DECIMALS))!;
  }

  if (poolValue.eq(0)) {
    return BigNumber.from(0);
  }

  return supply.mul(usdValue).div(poolValue);
}

export function marketTokenAmountToUsd(marketInfo: MarketInfo, marketToken: TokenData, amount: BigNumber) {
  const supply = marketToken.totalSupply!;
  const poolValue = marketInfo.poolValueMax!;

  const price = supply.eq(0)
    ? expandDecimals(1, USD_DECIMALS)
    : poolValue.mul(expandDecimals(1, marketToken.decimals)).div(supply);

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
