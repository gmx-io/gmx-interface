import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR } from "lib/legacy";
import { bigNumberify, expandDecimals } from "lib/numbers";
import { PriceImpact, PriceImpactConfigsData } from "../types";

export function getPriceImpactConfig(data: PriceImpactConfigsData, marketAddress?: string) {
  if (!marketAddress) return undefined;

  return data[marketAddress];
}

/**
 * @see https://github.com/gmx-io/gmx-synthetics/blob/updates/contracts/pricing/SwapPricingUtils.sol
 *
 */
export function getPriceImpact(
  priceImpactConfigsData: PriceImpactConfigsData,
  marketAddress?: string,
  currentLong?: BigNumber,
  currentShort?: BigNumber,
  longDelta: BigNumber = BigNumber.from(0),
  shortDelta: BigNumber = BigNumber.from(0)
): PriceImpact | undefined {
  const priceImpactConf = getPriceImpactConfig(priceImpactConfigsData, marketAddress);

  if (!priceImpactConf || !currentLong || !currentShort || (longDelta.eq(0) && shortDelta.eq(0))) return undefined;

  const nextLong = currentLong.add(longDelta);
  const nextShort = currentShort.add(shortDelta);

  const currentDiff = currentLong.sub(currentShort).abs();
  const nextDiff = nextLong.sub(nextShort).abs();

  const isSameSideRebalance = currentLong.lt(currentShort) === nextLong.lt(nextShort);

  const { factorPositive, factorNegative, exponentFactor } = priceImpactConf;

  if (!factorPositive || !factorNegative || !exponentFactor) return undefined;

  let impact: BigNumber | undefined;

  if (isSameSideRebalance) {
    const hasPositiveImpact = nextDiff.lt(currentDiff);
    const factor = hasPositiveImpact ? factorPositive : factorNegative;

    impact = calculateImpactForSameSideRebalance({
      currentDiff,
      nextDiff,
      hasPositiveImpact,
      factor,
      exponentFactor,
    });
  } else {
    impact = calculateImpactForCrossoverRebalance({
      currentDiff,
      nextDiff,
      factorPositive,
      factorNegative,
      exponentFactor,
    });
  }

  if (!impact) return undefined;

  const totalTradeSize = longDelta.abs().add(shortDelta.abs());

  const basisPoints = totalTradeSize.gt(0)
    ? impact.mul(BASIS_POINTS_DIVISOR).div(totalTradeSize).abs()
    : BigNumber.from(0);

  return {
    impact,
    basisPoints,
  };
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

  if (!currentImpact || !nextImpact) return undefined;

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

  if (!positiveImpact || !negativeImpactUsd) {
    return undefined;
  }

  const deltaDiffUsd = positiveImpact.sub(negativeImpactUsd).abs();

  return positiveImpact.gt(negativeImpactUsd) ? deltaDiffUsd : BigNumber.from(0).sub(deltaDiffUsd);
}

// TODO: big numbers + unit tests
export function applyImpactFactor(diff: BigNumber, factor: BigNumber, exponent: BigNumber) {
  // Convert diff and exponent to float js numbers
  const _diff = Number(diff) / 10 ** 30;
  const _exponent = Number(exponent) / 10 ** 30;

  // Pow and convert back to BigNumber with 30 decimals
  let result = bigNumberify(BigInt(Math.round(_diff ** _exponent * 10 ** 30)));

  result = result?.mul(factor).div(expandDecimals(1, 30)).div(2);

  return result;
}
