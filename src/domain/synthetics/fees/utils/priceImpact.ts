import { MarketInfo, getTokenPoolType } from "domain/synthetics/markets";
import { TokenData, convertToTokenAmount, convertToUsd, getMidPrice } from "domain/synthetics/tokens";
import { bigMath } from "lib/bigmath";
import {
  BN_ZERO,
  applyFactor,
  bigNumberify,
  expandDecimals,
  getBasisPoints,
  roundUpMagnitudeDivision,
} from "lib/numbers";

export function getPriceImpactByAcceptablePrice(p: {
  sizeDeltaUsd: bigint;
  acceptablePrice: bigint;
  indexPrice: bigint;
  isLong: boolean;
  isIncrease: boolean;
}) {
  const { sizeDeltaUsd, acceptablePrice, indexPrice: markPrice, isLong, isIncrease } = p;

  const shouldFlipPriceDiff = isIncrease ? !isLong : isLong;

  const priceDelta = (markPrice - acceptablePrice) * (shouldFlipPriceDiff ? -1n : 1n);
  const acceptablePriceDeltaBps = markPrice === 0n ? BN_ZERO : getBasisPoints(priceDelta, markPrice);

  const priceImpactDeltaUsd = acceptablePrice === 0n ? BN_ZERO : (sizeDeltaUsd * priceDelta) / acceptablePrice;

  const priceImpactDeltaAmount = markPrice === 0n ? BN_ZERO : priceImpactDeltaUsd / markPrice;

  return {
    priceImpactDeltaUsd,
    priceImpactDeltaAmount,
    priceDelta,
    acceptablePriceDeltaBps,
  };
}

export function applySwapImpactWithCap(marketInfo: MarketInfo, token: TokenData, priceImpactDeltaUsd: bigint) {
  const tokenPoolType = getTokenPoolType(marketInfo, token.address);

  if (!tokenPoolType) {
    throw new Error(`Token ${token.address} is not a collateral of the market ${marketInfo.marketTokenAddress}`);
  }

  const isLongCollateral = tokenPoolType === "long";
  const price = priceImpactDeltaUsd > 0 ? token.prices.maxPrice : token.prices.minPrice;

  let impactDeltaAmount: bigint;

  if (priceImpactDeltaUsd > 0) {
    // round positive impactAmount down, this will be deducted from the swap impact pool for the user
    impactDeltaAmount = convertToTokenAmount(priceImpactDeltaUsd, token.decimals, price)!;

    const maxImpactAmount = isLongCollateral
      ? marketInfo.swapImpactPoolAmountLong
      : marketInfo.swapImpactPoolAmountShort;

    if (impactDeltaAmount > maxImpactAmount) {
      impactDeltaAmount = maxImpactAmount;
    }
  } else {
    // round negative impactAmount up, this will be deducted from the user
    impactDeltaAmount = roundUpMagnitudeDivision(priceImpactDeltaUsd * expandDecimals(1, token.decimals), price);
  }

  return impactDeltaAmount;
}

export function getCappedPositionImpactUsd(
  marketInfo: MarketInfo,
  sizeDeltaUsd: bigint,
  isLong: boolean,
  opts: { fallbackToZero?: boolean } = {}
) {
  const priceImpactDeltaUsd = getPriceImpactForPosition(marketInfo, sizeDeltaUsd, isLong, opts);

  if (priceImpactDeltaUsd < 0) {
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

  if (cappedImpactUsd > maxPriceImpactUsdBasedOnImpactPool) {
    cappedImpactUsd = maxPriceImpactUsdBasedOnImpactPool;
  }

  const maxPriceImpactFactor = marketInfo.maxPositionImpactFactorPositive;
  const maxPriceImpactUsdBasedOnMaxPriceImpactFactor = applyFactor(bigMath.abs(sizeDeltaUsd), maxPriceImpactFactor);

  if (cappedImpactUsd > maxPriceImpactUsdBasedOnMaxPriceImpactFactor) {
    cappedImpactUsd = maxPriceImpactUsdBasedOnMaxPriceImpactFactor;
  }

  return cappedImpactUsd;
}

export function getPriceImpactForPosition(
  marketInfo: MarketInfo,
  sizeDeltaUsd: bigint,
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

  if (priceImpactUsd > 0) {
    return priceImpactUsd;
  }

  if (bigMath.abs(marketInfo.virtualInventoryForPositions) <= 0) {
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

  return priceImpactUsdForVirtualInventory < priceImpactUsd! ? priceImpactUsdForVirtualInventory : priceImpactUsd;
}

export function getPriceImpactForSwap(
  marketInfo: MarketInfo,
  tokenA: TokenData,
  tokenB: TokenData,
  usdDeltaTokenA: bigint,
  usdDeltaTokenB: bigint,
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

  if (priceImpactUsd > 0) {
    return priceImpactUsd;
  }

  const virtualInventoryLong = marketInfo.virtualPoolAmountForLongToken;
  const virtualInventoryShort = marketInfo.virtualPoolAmountForShortToken;

  if (virtualInventoryLong <= 0 || virtualInventoryShort <= 0) {
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

  return priceImpactUsdForVirtualInventory < priceImpactUsd! ? priceImpactUsdForVirtualInventory : priceImpactUsd;
}

function getNextOpenInterestForVirtualInventory(p: { virtualInventory: bigint; usdDelta: bigint; isLong: boolean }) {
  const { virtualInventory, usdDelta, isLong } = p;

  let currentLongUsd = 0n;
  let currentShortUsd = 0n;

  if (virtualInventory > 0) {
    currentShortUsd = virtualInventory;
  } else {
    currentLongUsd = virtualInventory * -1n;
  }

  if (usdDelta < 0) {
    const offset = bigMath.abs(usdDelta);
    currentLongUsd = currentLongUsd + offset;
    currentShortUsd = currentShortUsd + offset;
  }

  return getNextOpenInterestParams({
    currentLongUsd,
    currentShortUsd,
    usdDelta,
    isLong,
  });
}

function getNextOpenInterestParams(p: {
  currentLongUsd: bigint;
  currentShortUsd: bigint;
  usdDelta: bigint;
  isLong: boolean;
}) {
  const { currentLongUsd, currentShortUsd, usdDelta, isLong } = p;

  let nextLongUsd = currentLongUsd;
  let nextShortUsd = currentShortUsd;

  if (isLong) {
    nextLongUsd = (currentLongUsd ?? 0n) + (usdDelta ?? 0n);
  } else {
    nextShortUsd = (currentShortUsd ?? 0n) + (usdDelta ?? 0n);
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
  longPoolAmount: bigint;
  shortPoolAmount: bigint;
  longDeltaUsd: bigint;
  shortDeltaUsd: bigint;
}) {
  const { marketInfo, longToken, shortToken, longPoolAmount, shortPoolAmount, longDeltaUsd, shortDeltaUsd } = p;

  const longPrice = getMidPrice(longToken.prices);
  const shortPrice = getMidPrice(shortToken.prices);

  const longPoolUsd = convertToUsd(longPoolAmount, longToken.decimals, longPrice)!;
  const shortPoolUsd = convertToUsd(shortPoolAmount, shortToken.decimals, shortPrice)!;

  const longPoolUsdAdjustment = convertToUsd(marketInfo.longPoolAmountAdjustment, longToken.decimals, longPrice)!;
  const shortPoolUsdAdjustment = convertToUsd(marketInfo.shortPoolAmountAdjustment, shortToken.decimals, shortPrice)!;

  const nextLongPoolUsd = longPoolUsd + longDeltaUsd + longPoolUsdAdjustment;
  const nextShortPoolUsd = shortPoolUsd + shortDeltaUsd + shortPoolUsdAdjustment;

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
  currentLongUsd: bigint;
  currentShortUsd: bigint;
  nextLongUsd: bigint;
  nextShortUsd: bigint;
  factorPositive: bigint;
  factorNegative: bigint;
  exponentFactor: bigint;
  fallbackToZero?: boolean;
}) {
  const { nextLongUsd, nextShortUsd } = p;

  if (nextLongUsd < 0 || nextShortUsd < 0) {
    if (p.fallbackToZero) {
      return 0n;
    } else {
      throw new Error("Negative pool amount");
    }
  }

  const currentDiff = bigMath.abs(p.currentLongUsd - p.currentShortUsd);
  const nextDiff = bigMath.abs(nextLongUsd - nextShortUsd);

  const isSameSideRebalance = p.currentLongUsd < p.currentShortUsd === nextLongUsd < nextShortUsd;

  let impactUsd: bigint;

  if (isSameSideRebalance) {
    const hasPositiveImpact = nextDiff < currentDiff;
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
  currentDiff: bigint;
  nextDiff: bigint;
  hasPositiveImpact: boolean;
  factor: bigint;
  exponentFactor: bigint;
}) {
  const { currentDiff, nextDiff, hasPositiveImpact, factor, exponentFactor } = p;

  const currentImpact = applyImpactFactor(currentDiff, factor, exponentFactor);
  const nextImpact = applyImpactFactor(nextDiff, factor, exponentFactor);

  const deltaDiff = bigMath.abs(currentImpact - nextImpact);

  return hasPositiveImpact ? deltaDiff : -deltaDiff;
}

/**
 *  @see  https://github.com/gmx-io/gmx-synthetics/blob/5fd9991ff2c37ae5f24f03bc9c132730b012ebf2/contracts/pricing/PricingUtils.sol
 */
export function calculateImpactForCrossoverRebalance(p: {
  currentDiff: bigint;
  nextDiff: bigint;
  factorPositive: bigint;
  factorNegative: bigint;
  exponentFactor: bigint;
}) {
  const { currentDiff, nextDiff, factorNegative, factorPositive, exponentFactor } = p;

  const positiveImpact = applyImpactFactor(currentDiff, factorPositive, exponentFactor);
  const negativeImpactUsd = applyImpactFactor(nextDiff, factorNegative, exponentFactor);

  const deltaDiffUsd = bigMath.abs(positiveImpact - negativeImpactUsd);

  return positiveImpact > negativeImpactUsd ? deltaDiffUsd : -deltaDiffUsd;
}

export function applyImpactFactor(diff: bigint, factor: bigint, exponent: bigint) {
  // Convert diff and exponent to float js numbers
  const _diff = Number(diff) / 10 ** 30;
  const _exponent = Number(exponent) / 10 ** 30;

  // Pow and convert back to BigInt with 30 decimals
  let result = bigNumberify(BigInt(Math.round(_diff ** _exponent * 10 ** 30)))!;

  result = (result * factor) / expandDecimals(1, 30);

  return result;
}
