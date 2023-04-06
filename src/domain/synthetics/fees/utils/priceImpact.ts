import { MarketInfo, getPoolUsd, getTokenPoolType } from "domain/synthetics/markets";
import { convertToTokenAmount, convertToUsd, getMidPrice } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { applyFactor, bigNumberify, expandDecimals, roundUpDivision } from "lib/numbers";

export function applySwapImpactWithCap(marketInfo: MarketInfo, tokenAddress: string, priceImpactDeltaUsd: BigNumber) {
  const tokenPoolType = getTokenPoolType(marketInfo, tokenAddress);

  if (!tokenPoolType) {
    throw new Error(`Token ${tokenAddress} is not a collateral of market ${marketInfo.marketTokenAddress}`);
  }

  const token = tokenPoolType === "long" ? marketInfo.longToken : marketInfo.shortToken;
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
    impactDeltaAmount = roundUpDivision(priceImpactDeltaUsd.mul(expandDecimals(1, token.decimals)), price);
  }

  return impactDeltaAmount;
}

export function getCappedPositionImpactUsd(
  marketInfo: MarketInfo,
  priceImpactDeltaUsd: BigNumber,
  sizeDeltaUsd: BigNumber
) {
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
  const maxPriceImpactUsdBasedOnMaxPriceImpactFactor = applyFactor(sizeDeltaUsd, maxPriceImpactFactor);

  if (cappedImpactUsd.gt(maxPriceImpactUsdBasedOnMaxPriceImpactFactor)) {
    cappedImpactUsd = maxPriceImpactUsdBasedOnMaxPriceImpactFactor;
  }

  return cappedImpactUsd;
}

export function getPriceImpactForPosition(marketInfo: MarketInfo, sizeDeltaUsd: BigNumber, isLong: boolean) {
  const { longInterestUsd, shortInterestUsd } = marketInfo;

  const longDeltaUsd = isLong ? sizeDeltaUsd : BigNumber.from(0);
  const shortDeltaUsd = !isLong ? sizeDeltaUsd : BigNumber.from(0);

  return getPriceImpactUsd({
    currentLongUsd: longInterestUsd,
    currentShortUsd: shortInterestUsd,
    longDeltaUsd,
    shortDeltaUsd,
    factorPositive: marketInfo.positionImpactFactorPositive,
    factorNegative: marketInfo.positionImpactFactorNegative,
    exponentFactor: marketInfo.positionImpactExponentFactor,
  });
}

export function getPriceImpactForSwap(
  marketInfo: MarketInfo,
  fromTokenAddress: string,
  fromDeltaAmount: BigNumber,
  toDeltaAmount: BigNumber
) {
  const { longToken, shortToken } = marketInfo;

  const longPoolUsd = getPoolUsd(marketInfo, true, "midPrice");
  const shortPoolUsd = getPoolUsd(marketInfo, false, "midPrice");

  const fromTokenPoolType = getTokenPoolType(marketInfo, fromTokenAddress);

  const longDeltaAmount = fromTokenPoolType === "long" ? fromDeltaAmount : toDeltaAmount;
  const shortDeltaAmount = fromTokenAddress === "short" ? fromDeltaAmount : toDeltaAmount;

  const longDeltaUsd = convertToUsd(longDeltaAmount, longToken.decimals, getMidPrice(longToken.prices))!;
  const shortDeltaUsd = convertToUsd(shortDeltaAmount, shortToken.decimals, getMidPrice(shortToken.prices))!;

  return getPriceImpactUsd({
    currentLongUsd: longPoolUsd,
    currentShortUsd: shortPoolUsd,
    longDeltaUsd,
    shortDeltaUsd,
    factorPositive: marketInfo.swapImpactFactorPositive,
    factorNegative: marketInfo.swapImpactFactorNegative,
    exponentFactor: marketInfo.swapImpactExponentFactor,
  });
}

/**
 * @see https://github.com/gmx-io/gmx-synthetics/blob/updates/contracts/pricing/SwapPricingUtils.sol
 */
export function getPriceImpactUsd(p: {
  currentLongUsd: BigNumber;
  currentShortUsd: BigNumber;
  longDeltaUsd: BigNumber;
  shortDeltaUsd: BigNumber;
  factorPositive: BigNumber;
  factorNegative: BigNumber;
  exponentFactor: BigNumber;
}) {
  const nextLong = p.currentLongUsd.add(p.longDeltaUsd);
  const nextShort = p.currentShortUsd.add(p.shortDeltaUsd);

  if (nextLong.lt(0) || nextShort.lt(0)) {
    throw new Error("Negative pool amount");
  }

  const currentDiff = p.currentLongUsd.sub(p.currentShortUsd).abs();
  const nextDiff = nextLong.sub(nextShort).abs();

  const isSameSideRebalance = p.currentLongUsd.lt(p.currentShortUsd) === nextLong.lt(nextShort);

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

  return hasPositiveImpact ? deltaDiff : BigNumber.from(0).sub(deltaDiff);
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

  return positiveImpact.gt(negativeImpactUsd) ? deltaDiffUsd : BigNumber.from(0).sub(deltaDiffUsd);
}

export function applyImpactFactor(diff: BigNumber, factor: BigNumber, exponent: BigNumber) {
  // Convert diff and exponent to float js numbers
  const _diff = Number(diff) / 10 ** 30;
  const _exponent = Number(exponent) / 10 ** 30;

  // Pow and convert back to BigNumber with 30 decimals
  let result = bigNumberify(BigInt(Math.round(_diff ** _exponent * 10 ** 30)))!;

  result = result.mul(factor).div(expandDecimals(1, 30)).div(2);

  return result;
}
