import { expandDecimals, formatAmount } from "lib/numbers";
import { MarketsData, getMarket } from "../markets";
import { TokenPrices, TokensData, convertToUsdByPrice, formatUsdAmount, getTokenData } from "../tokens";
import { AggregatedPositionData, PositionsData } from "./types";
import { BASIS_POINTS_DIVISOR, MAX_LEVERAGE } from "lib/legacy";
import { BigNumber } from "ethers";

export function getPositions(positionsData: PositionsData) {
  return Object.values(positionsData);
}

export function getPosition(positionsData: PositionsData, positionKey?: string) {
  if (!positionKey) return undefined;

  return positionsData[positionKey];
}

export function getPositionKey(account: string, market: string, collateralToken: string, isLong: boolean) {
  return `${account}-${market}-${collateralToken}-${isLong}`;
}

export function getAggregatedPositionData(
  positionsData: PositionsData,
  marketsData: MarketsData,
  tokensData: TokensData,
  positionKey?: string
): AggregatedPositionData | undefined {
  const position = getPosition(positionsData, positionKey);
  const market = getMarket(marketsData, position?.marketAddress);
  const collateralToken = getTokenData(tokensData, position?.collateralTokenAddress);
  const indexToken = getTokenData(tokensData, market?.indexTokenAddress);

  if (!position) return undefined;

  const markPrice = position.isLong ? indexToken?.prices?.minPrice : indexToken?.prices?.maxPrice;
  const pnlPrice = getPriceForPnl(indexToken?.prices, position.isLong, false);
  const averagePrice = indexToken?.prices?.minPrice.add(indexToken?.prices?.maxPrice).div(2);

  const collateralPrice = getPriceForPnl(collateralToken?.prices, position.isLong, false);

  const entryPrice = indexToken
    ? position.sizeInUsd.div(position.sizeInTokens).mul(expandDecimals(1, indexToken.decimals))
    : undefined;

  const currentSizeUsd =
    indexToken && pnlPrice ? convertToUsdByPrice(position.sizeInTokens, indexToken.decimals, pnlPrice) : undefined;

  const collateralUsd =
    collateralToken && collateralPrice
      ? convertToUsdByPrice(position.collateralAmount, collateralToken.decimals, collateralPrice)
      : undefined;

  const collateralUsdAfterFees = collateralUsd;

  // console.log("pos", {
  //   positionKey: position.key,
  //   indexToken: indexToken?.symbol,
  //   indexPrice: formatUsdAmount(pnlPrice),
  //   collateralToken: collateralToken?.symbol,
  //   collateralPrice: formatUsdAmount(collateralPrice),
  //   currentSizeUsd: formatUsdAmount(currentSizeUsd),
  //   sizeInTokens: formatTokenAmount(position.sizeInTokens, indexToken?.decimals),
  //   sizeInUsd: formatUsdAmount(position.sizeInUsd),
  //   collateralAmount: formatTokenAmount(position.collateralAmount, collateralToken?.decimals),
  //   collateralUsd: formatUsdAmount(collateralUsd),
  // });

  const pnl = currentSizeUsd
    ? position.isLong
      ? currentSizeUsd.sub(position.sizeInUsd)
      : position.sizeInUsd.sub(currentSizeUsd)
    : undefined;

  const pnlPercentage = collateralUsd && pnl ? pnl.mul(BASIS_POINTS_DIVISOR).div(collateralUsd) : undefined;

  const netValue = pnl && collateralUsd ? collateralUsd.add(pnl).sub(position.pendingBorrowingFees) : undefined;

  const leverage = getLeverage({
    sizeUsd: currentSizeUsd,
    collateralUsd,
  });

  const liqPrice = getLiquidationPrice({
    currentSizeUsd,
    collateralUsd,
    averagePrice,
    isLong: position.isLong,
    feesUsd: BigNumber.from(0),
  });

  return {
    ...position,
    indexToken,
    collateralToken,
    currentSizeUsd,
    collateralUsd,
    collateralUsdAfterFees,
    averagePrice,
    markPrice,
    pnl,
    pnlPercentage,
    netValue,
    leverage,
    liqPrice,
    entryPrice,
  };
}

export function getLiquidationPrice(p: {
  currentSizeUsd?: BigNumber;
  collateralUsd?: BigNumber;
  feesUsd?: BigNumber;
  averagePrice?: BigNumber;
  isLong?: boolean;
}) {
  if (!p.currentSizeUsd || !p.collateralUsd || !p.averagePrice) return undefined;

  const liqPriceForFees = getLiquidationPriceFromDelta({
    liquidationAmountUsd: p.feesUsd,
    sizeUsd: p.currentSizeUsd,
    collateralUsd: p.collateralUsd,
    averagePrice: p.averagePrice,
    isLong: p.isLong,
  });

  const liqPriceForMaxLeverage = getLiquidationPriceFromDelta({
    liquidationAmountUsd: p.currentSizeUsd.mul(BASIS_POINTS_DIVISOR).div(MAX_LEVERAGE),
    sizeUsd: p.currentSizeUsd,
    collateralUsd: p.collateralUsd,
    averagePrice: p.averagePrice,
    isLong: p.isLong,
  });

  if (!liqPriceForFees) {
    return liqPriceForMaxLeverage;
  }

  if (!liqPriceForMaxLeverage) {
    return liqPriceForFees;
  }

  if (p.isLong) {
    // return the higher price
    return liqPriceForFees.gt(liqPriceForMaxLeverage) ? liqPriceForFees : liqPriceForMaxLeverage;
  }

  // return the lower price
  return liqPriceForFees.lt(liqPriceForMaxLeverage) ? liqPriceForFees : liqPriceForMaxLeverage;
}

export function getLiquidationPriceFromDelta(p: {
  liquidationAmountUsd?: BigNumber;
  sizeUsd?: BigNumber;
  collateralUsd?: BigNumber;
  averagePrice?: BigNumber;
  isLong?: boolean;
}) {
  if (!p.sizeUsd || !p.collateralUsd || !p.averagePrice || !p.liquidationAmountUsd) {
    return undefined;
  }

  if (p.liquidationAmountUsd.gt(p.collateralUsd)) {
    const liquidationDelta = p.liquidationAmountUsd.sub(p.collateralUsd);
    const priceDelta = liquidationDelta.mul(p.averagePrice).div(p.sizeUsd);

    return p.isLong ? p.averagePrice.add(priceDelta) : p.averagePrice.sub(priceDelta);
  }

  const liquidationDelta = p.collateralUsd.sub(p.liquidationAmountUsd);
  const priceDelta = liquidationDelta.mul(p.averagePrice).div(p.sizeUsd);

  return p.isLong ? p.averagePrice.sub(priceDelta) : p.averagePrice.add(priceDelta);
}

export function getLeverage(p: { sizeUsd?: BigNumber; collateralUsd?: BigNumber }) {
  if (!p.sizeUsd?.gt(0) || !p.collateralUsd?.gt(0)) {
    return undefined;
  }

  return p.sizeUsd.mul(BASIS_POINTS_DIVISOR).div(p.collateralUsd);
}

export function getPriceForPnl(tokenPrices?: TokenPrices, isLong?: boolean, maximize?: boolean) {
  if (!tokenPrices) return undefined;

  if (isLong) {
    return maximize ? tokenPrices.maxPrice : tokenPrices.minPrice;
  }

  return maximize ? tokenPrices.minPrice : tokenPrices.maxPrice;
}

export function formatPnl(pnl?: BigNumber, pnlPercentage?: BigNumber) {
  const sign = pnl && pnl.lt(0) ? "-" : "+";

  return `${sign}${formatUsdAmount(pnl?.abs())} (${sign}${formatAmount(pnlPercentage?.abs(), 2, 2)}%)`;
}

export function formatLeverage(leverage: BigNumber) {
  return `${formatAmount(leverage, 4, 2)}x`;
}
