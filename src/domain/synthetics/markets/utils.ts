import { BigNumber } from "ethers";
import { PRECISION } from "lib/legacy";
import { applyFactor } from "lib/numbers";
import { convertToContractTokenPrices, convertToUsd, getMidPrice, getTokenData } from "../tokens";
import { TokensData } from "../tokens/types";
import { ContractMarketPrices, Market, MarketInfo, PnlFactorType } from "./types";
import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { Token } from "domain/tokens";
import { VirtualInventoryForPositionsData, getCappedPositionImpactUsd, getPriceImpactForPosition } from "../fees";

export function getMarketFullName(p: { longToken: Token; shortToken: Token; indexToken: Token; isSpotOnly: boolean }) {
  const { indexToken, longToken, shortToken, isSpotOnly } = p;

  return `${getMarketIndexName({ indexToken, isSpotOnly })} ${getMarketPoolName({ longToken, shortToken })}`;
}

export function getMarketIndexName(p: { indexToken: Token; isSpotOnly: boolean }) {
  const { indexToken, isSpotOnly } = p;

  if (isSpotOnly) {
    return `SPOT`;
  }

  return `${indexToken.baseSymbol || indexToken.symbol}/USD`;
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

  if (isLong) {
    return convertToUsd(marketInfo.longInterestInTokens, marketInfo.indexToken.decimals, indexToken.prices.maxPrice)!;
  } else {
    return marketInfo.shortInterestUsd;
  }
}

export function getMaxReservedUsd(marketInfo: MarketInfo, isLong: boolean) {
  const poolUsd = getPoolUsd(marketInfo, isLong, "minPrice");
  const reserveFactor = isLong ? marketInfo.reserveFactorLong : marketInfo.reserveFactorShort;

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
  const reservedUsd = getReservedUsd(marketInfo, isLong);

  const poolUsd = getPoolUsd(marketInfo, isLong, "minPrice");

  return poolUsd.sub(reservedUsd);
}

export function getCappedPoolPnl(p: {
  marketInfo: MarketInfo;
  poolUsd: BigNumber;
  isLong: boolean;
  maximize: boolean;
  pnlFactorType: PnlFactorType;
}) {
  const { marketInfo, poolUsd, isLong, pnlFactorType, maximize } = p;

  let poolPnl: BigNumber;

  if (isLong) {
    poolPnl = maximize ? marketInfo.pnlLongMax : marketInfo.pnlLongMin;
  } else {
    poolPnl = maximize ? marketInfo.pnlShortMax : marketInfo.pnlShortMin;
  }

  if (poolPnl.lt(0)) {
    return poolPnl;
  }

  let maxPnlFactor: BigNumber;

  if (pnlFactorType === "FOR_TRADERS") {
    maxPnlFactor = isLong ? marketInfo.maxPnlFactorForTradersLong : marketInfo.maxPnlFactorForTradersShort;
  } else if (pnlFactorType === "FOR_DEPOSITS") {
    maxPnlFactor = isLong ? marketInfo.maxPnlFactorForDepositsLong : marketInfo.maxPnlFactorForDepositsShort;
  } else {
    maxPnlFactor = isLong ? marketInfo.maxPnlFactorForWithdrawalsLong : marketInfo.maxPnlFactorForWithdrawalsShort;
  }

  const maxPnl = applyFactor(poolUsd, maxPnlFactor);

  return poolPnl.gt(maxPnl) ? maxPnl : poolPnl;
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
  virtualInventoryForPositions: VirtualInventoryForPositionsData,
  indexTokenAddress: string,
  isLong: boolean,
  sizeDeltaUsd: BigNumber
) {
  let bestMarket: MarketInfo | undefined;
  // minimize negative impact
  let bestImpactDeltaUsd: BigNumber | undefined;

  for (const marketInfo of marketsInfo) {
    const liquidity = getAvailableUsdLiquidityForPosition(marketInfo, isLong);

    if (isMarketIndexToken(marketInfo, indexTokenAddress) && liquidity.gt(sizeDeltaUsd)) {
      let priceImpactDeltaUsd = getPriceImpactForPosition(
        marketInfo,
        virtualInventoryForPositions,
        sizeDeltaUsd,
        isLong
      );
      priceImpactDeltaUsd = getCappedPositionImpactUsd(marketInfo, priceImpactDeltaUsd, sizeDeltaUsd);

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

export function getClaimableFundingAmount(marketInfo: MarketInfo, isLong: boolean) {
  return isLong ? marketInfo.claimableFundingAmountLong : marketInfo.claimableFundingAmountShort;
}

export function getTotalClaimableFundingUsd(markets: MarketInfo[]) {
  return markets.reduce((acc, market) => {
    const { longToken, shortToken } = market;

    const amountLong = getClaimableFundingAmount(market, true);
    const amountShort = getClaimableFundingAmount(market, false);

    const usdLong = convertToUsd(amountLong, longToken.decimals, longToken.prices.minPrice)!;
    const usdShort = convertToUsd(amountShort, shortToken.decimals, shortToken.prices.minPrice)!;

    return acc.add(usdLong).add(usdShort);
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
