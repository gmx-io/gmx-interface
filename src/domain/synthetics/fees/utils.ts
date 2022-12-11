import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR } from "lib/legacy";
import { bigNumberify, expandDecimals, formatAmount } from "lib/numbers";
import { formatUsdAmount } from "domain/synthetics/tokens";
import { PriceImpact, PriceImpactConfigsData } from "./types";

export function formatFee(feeUsd?: BigNumber, feeBp?: BigNumber) {
  if (!feeUsd?.abs().gt(0)) {
    return "...";
  }

  return feeBp ? `${formatAmount(feeBp, 2, 2)}% (${formatUsdAmount(feeUsd)})` : formatUsdAmount(feeUsd);
}

export function getPriceImpactConfig(data: PriceImpactConfigsData, marketAddress?: string) {
  if (!marketAddress) return undefined;

  return data[marketAddress];
}

/**
 * @see https://github.com/gmx-io/gmx-synthetics/blob/updates/contracts/pricing/SwapPricingUtils.sol
 *
 * TODO: unit tests?
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

  return positiveImpact > negativeImpactUsd ? deltaDiffUsd : BigNumber.from(0).sub(deltaDiffUsd);
}

// TODO: bigNumbers
function applyImpactFactor(diff: BigNumber, factor: BigNumber, exponent: BigNumber) {
  const _exponent = exponent.div(expandDecimals(1, 30)).toNumber();
  const _factor = factor.div(expandDecimals(1, 22)).toNumber() / 10 ** 8;
  const _diff = diff.div(expandDecimals(1, 22)).toNumber() / 10 ** 8;

  const numberValue = (Math.pow(_diff, _exponent) * _factor) / 2;

  let result = parseInt(String(numberValue * 10 ** 8));

  return bigNumberify(result)?.mul(expandDecimals(1, 22));
}

export function decimalToFloat(value, decimals = 0) {
  return expandDecimals(value, 30 - decimals);
}
