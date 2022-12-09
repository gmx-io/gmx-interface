import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR } from "lib/legacy";
import { bigNumberify, expandDecimals, formatAmount } from "lib/numbers";
import { MarketPoolsData, MarketsData } from "../markets/types";
import { getMarket, getMarketPoolAmount } from "../markets/utils";
import { formatUsdAmount } from "../tokens/utils";
import { PriceImpactConfigsData, PriceImpactData } from "./types";

export function getPriceImpactConfig(data: PriceImpactConfigsData, marketAddress?: string) {
  if (!marketAddress) return undefined;

  return data.priceImpactConfigs[marketAddress];
}

/**
 * @see https://github.com/gmx-io/gmx-synthetics/blob/updates/contracts/pricing/SwapPricingUtils.sol
 * TODO: unit tests?
 */
export function getPriceImpact(
  data: PriceImpactConfigsData & MarketPoolsData & MarketsData,
  marketAddress?: string,
  longDelta: BigNumber = BigNumber.from(0),
  shortDelta: BigNumber = BigNumber.from(0)
): PriceImpactData | undefined {
  const market = getMarket(data, marketAddress);
  const longPool = getMarketPoolAmount(data, market?.marketTokenAddress, market?.longTokenAddress);
  const shortPool = getMarketPoolAmount(data, market?.marketTokenAddress, market?.shortTokenAddress);
  const priceImpactConf = getPriceImpactConfig(data, market?.marketTokenAddress);

  if (!market || !shortPool || !longPool || !priceImpactConf || (longDelta.eq(0) && shortDelta.eq(0))) return undefined;

  const nextLongPool = longPool.add(longDelta);
  const nextShortPool = shortPool.add(shortDelta);

  const currentDiff = longPool.sub(shortPool).abs();
  const nextDiff = nextLongPool.sub(nextShortPool).abs();

  const isSameSideRebalance = longPool.lt(shortPool) === nextLongPool.lt(nextShortPool);

  const { factorPositive, factorNegative, exponentFactor } = priceImpactConf;

  let priceImpact: BigNumber | undefined;

  if (isSameSideRebalance) {
    const hasPositiveImpact = nextDiff.lt(currentDiff);
    const factor = hasPositiveImpact ? factorPositive : factorNegative;

    priceImpact = calculateImpactForSameSideRebalance({
      currentDiff,
      nextDiff,
      hasPositiveImpact,
      factor,
      exponentFactor,
    });
  } else {
    priceImpact = calculateImpactForCrossoverRebalance({
      currentDiff,
      nextDiff,
      factorPositive,
      factorNegative,
      exponentFactor,
    });
  }

  if (!priceImpact) return undefined;

  const totalTradeSize = longDelta.abs().add(shortDelta.abs());

  const priceImpactBasisPoints = totalTradeSize.gt(0)
    ? priceImpact.mul(BASIS_POINTS_DIVISOR).div(totalTradeSize).abs()
    : BigNumber.from(0);

  return {
    priceImpact,
    priceImpactBasisPoints,
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

export function formatFee(feeUsd?: BigNumber, feeBp?: BigNumber) {
  if (!feeUsd?.abs().gt(0)) {
    return "...";
  }

  return feeBp ? `${formatAmount(feeBp, 2, 2)}% (${formatUsdAmount(feeUsd)})` : formatUsdAmount(feeUsd);
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
