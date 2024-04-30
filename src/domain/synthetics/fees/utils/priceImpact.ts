import { MarketInfo, getTokenPoolType } from "domain/synthetics/markets";
import { TokenData, convertToTokenAmount, convertToUsd, getMidPrice } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import {
  BN_ZERO,
  applyFactor,
  bigNumberify,
  expandDecimals,
  getBasisPoints,
  roundUpMagnitudeDivision,
} from "lib/numbers";

export function getPriceImpactByAcceptablePrice(p: {
  sizeDeltaUsd: BigNumber;
  acceptablePrice: BigNumber;
  indexPrice: BigNumber;
  isLong: boolean;
  isIncrease: boolean;
}) {
  const { sizeDeltaUsd, acceptablePrice, indexPrice: markPrice, isLong, isIncrease } = p;

  const shouldFlipPriceDiff = isIncrease ? !isLong : isLong;

  const priceDelta = markPrice.sub(acceptablePrice).mul(shouldFlipPriceDiff ? -1 : 1);
  const acceptablePriceDeltaBps = markPrice.isZero() ? BN_ZERO : getBasisPoints(priceDelta, markPrice);

  const priceImpactDeltaUsd = acceptablePrice.isZero() ? BN_ZERO : sizeDeltaUsd.mul(priceDelta).div(acceptablePrice);

  const priceImpactDeltaAmount = markPrice.isZero() ? BN_ZERO : priceImpactDeltaUsd.div(markPrice);

  return {
    priceImpactDeltaUsd,
    priceImpactDeltaAmount,
    priceDelta,
    acceptablePriceDeltaBps,
  };
}

export function applySwapImpactWithCap(marketInfo: MarketInfo, token: TokenData, priceImpactDeltaUsd: BigNumber) {
  const tokenPoolType = getTokenPoolType(marketInfo, token.address);

  if (!tokenPoolType) {
    throw new Error(`Token ${token.address} is not a collateral of the market ${marketInfo.marketTokenAddress}`);
  }

  const isLongCollateral = tokenPoolType === "long";
  const price = priceImpactDeltaUsd.gt(0) ? token.prices.maxPrice : token.prices.minPrice;

  let impactDeltaAmount: BigNumber;

  if (priceImpactDeltaUsd.gt(0)) {
    // round positive impactAmount down, this will be deducted from the swap impact pool for the user
    impactDeltaAmount = convertToTokenAmount(priceImpactDeltaUsd, token.decimals, price)!;

    const maxImpactAmount = isLongCollateral
      ? marketInfo.swapImpactPoolAmountLong
      : marketInfo.swapImpactPoolAmountShort;

    if (impactDeltaAmount.gt(maxImpactAmount)) {
      impactDeltaAmount = maxImpactAmount;
    }
  } else {
    // round negative impactAmount up, this will be deducted from the user
    impactDeltaAmount = roundUpMagnitudeDivision(priceImpactDeltaUsd.mul(expandDecimals(1, token.decimals)), price);
  }

  return impactDeltaAmount;
}

export function getCappedPositionImpactUsd(
  marketInfo: MarketInfo,
  sizeDeltaUsd: BigNumber,
  isLong: boolean,
  opts: { fallbackToZero?: boolean } = {}
) {
  const priceImpactDeltaUsd = getPriceImpactForPosition(marketInfo, sizeDeltaUsd, isLong, opts);

  if (priceImpactDeltaUsd.lt(0)) {
    return priceImpactDeltaUsd;
  }

  const { indexToken } = marketInfo;

  const impactPoolAmount = marketInfo?.positionImpactPoolAmount;

  const maxPriceImpactUsdBasedOnImpactPool = convertToUsd(
    impactPoolAmount,
    indexToken.decimals,
    indexToken.prices.minPrice
  )!;

  let cappedImpactUsd = priceImpactDeltaUsd;

  if (cappedImpactUsd.gt(maxPriceImpactUsdBasedOnImpactPool)) {
    cappedImpactUsd = maxPriceImpactUsdBasedOnImpactPool;
  }

  const maxPriceImpactFactor = marketInfo.maxPositionImpactFactorPositive;
  const maxPriceImpactUsdBasedOnMaxPriceImpactFactor = applyFactor(sizeDeltaUsd.abs(), maxPriceImpactFactor);

  if (cappedImpactUsd.gt(maxPriceImpactUsdBasedOnMaxPriceImpactFactor)) {
    cappedImpactUsd = maxPriceImpactUsdBasedOnMaxPriceImpactFactor;
  }

  return cappedImpactUsd;
}

export function getPriceImpactForPosition(
  marketInfo: MarketInfo,
  sizeDeltaUsd: BigNumber,
  isLong: boolean,
  opts: { fallbackToZero?: boolean } = {}
) {
  const { longInterestUsd, shortInterestUsd } = marketInfo;

  const { currentLongUsd, currentShortUsd, nextLongUsd, nextShortUsd } = getNextOpenInterestParams({
    currentLongUsd: longInterestUsd,
    currentShortUsd: shortInterestUsd,
    usdDelta: sizeDeltaUsd,
    isLong: isLong!,
  });

  const priceImpactUsd = getPriceImpactUsd({
    currentLongUsd,
    currentShortUsd,
    nextLongUsd,
    nextShortUsd,
    factorPositive: marketInfo.positionImpactFactorPositive,
    factorNegative: marketInfo.positionImpactFactorNegative,
    exponentFactor: marketInfo.positionImpactExponentFactor,
    fallbackToZero: opts.fallbackToZero,
  });

  if (priceImpactUsd.gt(0)) {
    return priceImpactUsd;
  }

  if (!marketInfo.virtualInventoryForPositions.abs().gt(0)) {
    return priceImpactUsd;
  }

  const virtualInventoryParams = getNextOpenInterestForVirtualInventory({
    virtualInventory: marketInfo.virtualInventoryForPositions,
    usdDelta: sizeDeltaUsd,
    isLong: isLong!,
  });

  const priceImpactUsdForVirtualInventory = getPriceImpactUsd({
    currentLongUsd: virtualInventoryParams.currentLongUsd,
    currentShortUsd: virtualInventoryParams.currentShortUsd,
    nextLongUsd: virtualInventoryParams.nextLongUsd,
    nextShortUsd: virtualInventoryParams.nextShortUsd,
    factorPositive: marketInfo.positionImpactFactorPositive,
    factorNegative: marketInfo.positionImpactFactorNegative,
    exponentFactor: marketInfo.positionImpactExponentFactor,
    fallbackToZero: opts.fallbackToZero,
  });

  return priceImpactUsdForVirtualInventory.lt(priceImpactUsd!) ? priceImpactUsdForVirtualInventory : priceImpactUsd;
}

export function getPriceImpactForSwap(
  marketInfo: MarketInfo,
  tokenA: TokenData,
  tokenB: TokenData,
  usdDeltaTokenA: BigNumber,
  usdDeltaTokenB: BigNumber,
  opts: { fallbackToZero?: boolean } = {}
) {
  const tokenAPoolType = getTokenPoolType(marketInfo, tokenA.address);
  const tokenBPoolType = getTokenPoolType(marketInfo, tokenB.address);

  if (
    tokenAPoolType === undefined ||
    tokenBPoolType === undefined ||
    (tokenAPoolType === tokenBPoolType && !marketInfo.isSameCollaterals)
  ) {
    throw new Error(`Invalid tokens to swap ${marketInfo.marketTokenAddress} ${tokenA.address} ${tokenB.address}`);
  }

  const [longToken, shortToken] = tokenAPoolType === "long" ? [tokenA, tokenB] : [tokenB, tokenA];
  const [longDeltaUsd, shortDeltaUsd] =
    tokenAPoolType === "long" ? [usdDeltaTokenA, usdDeltaTokenB] : [usdDeltaTokenB, usdDeltaTokenA];

  const { longPoolUsd, shortPoolUsd, nextLongPoolUsd, nextShortPoolUsd } = getNextPoolAmountsParams({
    marketInfo,
    longToken,
    shortToken,
    longPoolAmount: marketInfo.longPoolAmount,
    shortPoolAmount: marketInfo.shortPoolAmount,
    longDeltaUsd,
    shortDeltaUsd,
  });

  const priceImpactUsd = getPriceImpactUsd({
    currentLongUsd: longPoolUsd,
    currentShortUsd: shortPoolUsd,
    nextLongUsd: nextLongPoolUsd,
    nextShortUsd: nextShortPoolUsd,
    factorPositive: marketInfo.swapImpactFactorPositive,
    factorNegative: marketInfo.swapImpactFactorNegative,
    exponentFactor: marketInfo.swapImpactExponentFactor,
    fallbackToZero: opts.fallbackToZero,
  });

  if (priceImpactUsd.gt(0)) {
    return priceImpactUsd;
  }

  const virtualInventoryLong = marketInfo.virtualPoolAmountForLongToken;
  const virtualInventoryShort = marketInfo.virtualPoolAmountForShortToken;

  if (!virtualInventoryLong.gt(0) || !virtualInventoryShort.gt(0)) {
    return priceImpactUsd;
  }

  const virtualInventoryParams = getNextPoolAmountsParams({
    marketInfo,
    longToken,
    shortToken,
    longPoolAmount: virtualInventoryLong,
    shortPoolAmount: virtualInventoryShort,
    longDeltaUsd,
    shortDeltaUsd,
  });

  const priceImpactUsdForVirtualInventory = getPriceImpactUsd({
    currentLongUsd: virtualInventoryParams.longPoolUsd,
    currentShortUsd: virtualInventoryParams.shortPoolUsd,
    nextLongUsd: virtualInventoryParams.nextLongPoolUsd,
    nextShortUsd: virtualInventoryParams.nextShortPoolUsd,
    factorPositive: marketInfo.swapImpactFactorPositive,
    factorNegative: marketInfo.swapImpactFactorNegative,
    exponentFactor: marketInfo.swapImpactExponentFactor,
    fallbackToZero: opts.fallbackToZero,
  });

  return priceImpactUsdForVirtualInventory.lt(priceImpactUsd!) ? priceImpactUsdForVirtualInventory : priceImpactUsd;
}

function getNextOpenInterestForVirtualInventory(p: {
  virtualInventory: BigNumber;
  usdDelta: BigNumber;
  isLong: boolean;
}) {
  const { virtualInventory, usdDelta, isLong } = p;

  let currentLongUsd = BigInt(0);
  let currentShortUsd = BigInt(0);

  if (virtualInventory.gt(0)) {
    currentShortUsd = virtualInventory;
  } else {
    currentLongUsd = virtualInventory.mul(-1);
  }

  if (usdDelta.lt(0)) {
    const offset = usdDelta.abs();
    currentLongUsd = currentLongUsd.add(offset);
    currentShortUsd = currentShortUsd.add(offset);
  }

  return getNextOpenInterestParams({
    currentLongUsd,
    currentShortUsd,
    usdDelta,
    isLong,
  });
}

function getNextOpenInterestParams(p: {
  currentLongUsd: BigNumber;
  currentShortUsd: BigNumber;
  usdDelta: BigNumber;
  isLong: boolean;
}) {
  const { currentLongUsd, currentShortUsd, usdDelta, isLong } = p;

  let nextLongUsd = currentLongUsd;
  let nextShortUsd = currentShortUsd;

  if (isLong) {
    nextLongUsd = currentLongUsd?.add(usdDelta || 0);
  } else {
    nextShortUsd = currentShortUsd?.add(usdDelta || 0);
  }

  return {
    currentLongUsd,
    currentShortUsd,
    nextLongUsd,
    nextShortUsd,
  };
}

export function getNextPoolAmountsParams(p: {
  marketInfo: MarketInfo;
  longToken: TokenData;
  shortToken: TokenData;
  longPoolAmount: BigNumber;
  shortPoolAmount: BigNumber;
  longDeltaUsd: BigNumber;
  shortDeltaUsd: BigNumber;
}) {
  const { marketInfo, longToken, shortToken, longPoolAmount, shortPoolAmount, longDeltaUsd, shortDeltaUsd } = p;

  const longPrice = getMidPrice(longToken.prices);
  const shortPrice = getMidPrice(shortToken.prices);

  const longPoolUsd = convertToUsd(longPoolAmount, longToken.decimals, longPrice)!;
  const shortPoolUsd = convertToUsd(shortPoolAmount, shortToken.decimals, shortPrice)!;

  const longPoolUsdAdjustment = convertToUsd(marketInfo.longPoolAmountAdjustment, longToken.decimals, longPrice)!;
  const shortPoolUsdAdjustment = convertToUsd(marketInfo.shortPoolAmountAdjustment, shortToken.decimals, shortPrice)!;

  const nextLongPoolUsd = longPoolUsd.add(longDeltaUsd).add(longPoolUsdAdjustment);
  const nextShortPoolUsd = shortPoolUsd.add(shortDeltaUsd).add(shortPoolUsdAdjustment);

  return {
    longPoolUsd,
    shortPoolUsd,
    nextLongPoolUsd,
    nextShortPoolUsd,
  };
}

/**
 * @see https://github.com/gmx-io/gmx-synthetics/blob/updates/contracts/pricing/SwapPricingUtils.sol
 */
export function getPriceImpactUsd(p: {
  currentLongUsd: BigNumber;
  currentShortUsd: BigNumber;
  nextLongUsd: BigNumber;
  nextShortUsd: BigNumber;
  factorPositive: BigNumber;
  factorNegative: BigNumber;
  exponentFactor: BigNumber;
  fallbackToZero?: boolean;
}) {
  const { nextLongUsd, nextShortUsd } = p;

  if (nextLongUsd.lt(0) || nextShortUsd.lt(0)) {
    if (p.fallbackToZero) {
      return BigInt(0);
    } else {
      throw new Error("Negative pool amount");
    }
  }

  const currentDiff = p.currentLongUsd.sub(p.currentShortUsd).abs();
  const nextDiff = nextLongUsd.sub(nextShortUsd).abs();

  const isSameSideRebalance = p.currentLongUsd.lt(p.currentShortUsd) === nextLongUsd.lt(nextShortUsd);

  let impactUsd: BigNumber;

  if (isSameSideRebalance) {
    const hasPositiveImpact = nextDiff.lt(currentDiff);
    const factor = hasPositiveImpact ? p.factorPositive : p.factorNegative;

    impactUsd = calculateImpactForSameSideRebalance({
      currentDiff,
      nextDiff,
      hasPositiveImpact,
      factor,
      exponentFactor: p.exponentFactor,
    });
  } else {
    impactUsd = calculateImpactForCrossoverRebalance({
      currentDiff,
      nextDiff,
      factorPositive: p.factorPositive,
      factorNegative: p.factorNegative,
      exponentFactor: p.exponentFactor,
    });
  }

  return impactUsd;
}

/**
 *  @see https://github.com/gmx-io/gmx-synthetics/blob/5fd9991ff2c37ae5f24f03bc9c132730b012ebf2/contracts/pricing/PricingUtils.sol
 */
export function calculateImpactForSameSideRebalance(p: {
  currentDiff: BigNumber;
  nextDiff: BigNumber;
  hasPositiveImpact: boolean;
  factor: BigNumber;
  exponentFactor: BigNumber;
}) {
  const { currentDiff, nextDiff, hasPositiveImpact, factor, exponentFactor } = p;

  const currentImpact = applyImpactFactor(currentDiff, factor, exponentFactor);
  const nextImpact = applyImpactFactor(nextDiff, factor, exponentFactor);

  const deltaDiff = currentImpact.sub(nextImpact).abs();

  return hasPositiveImpact ? deltaDiff : BigInt(0).sub(deltaDiff);
}

/**
 *  @see  https://github.com/gmx-io/gmx-synthetics/blob/5fd9991ff2c37ae5f24f03bc9c132730b012ebf2/contracts/pricing/PricingUtils.sol
 */
export function calculateImpactForCrossoverRebalance(p: {
  currentDiff: BigNumber;
  nextDiff: BigNumber;
  factorPositive: BigNumber;
  factorNegative: BigNumber;
  exponentFactor: BigNumber;
}) {
  const { currentDiff, nextDiff, factorNegative, factorPositive, exponentFactor } = p;

  const positiveImpact = applyImpactFactor(currentDiff, factorPositive, exponentFactor);
  const negativeImpactUsd = applyImpactFactor(nextDiff, factorNegative, exponentFactor);

  const deltaDiffUsd = positiveImpact.sub(negativeImpactUsd).abs();

  return positiveImpact.gt(negativeImpactUsd) ? deltaDiffUsd : BigInt(0).sub(deltaDiffUsd);
}

export function applyImpactFactor(diff: BigNumber, factor: BigNumber, exponent: BigNumber) {
  // Convert diff and exponent to float js numbers
  const _diff = Number(diff) / 10 ** 30;
  const _exponent = Number(exponent) / 10 ** 30;

  // Pow and convert back to BigNumber with 30 decimals
  let result = bigNumberify(BigInt(Math.round(_diff ** _exponent * 10 ** 30)))!;

  result = result.mul(factor).div(expandDecimals(1, 30));

  return result;
}
