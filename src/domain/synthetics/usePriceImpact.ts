import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR, PRECISION, USD_DECIMALS } from "lib/legacy";
import { parseValue } from "lib/numbers";

const EXPONENT_FACTOR = 2;
const FACTOR = 1000000;

function applyImpactFactor(diff: BigNumber) {
  const exp = diff.pow(EXPONENT_FACTOR).div(FACTOR).div(PRECISION);

  return exp;
}

export function usePriceImpact(p: { marketKey: string; shortDeltaUsd?: BigNumber; longDeltaUsd?: BigNumber }) {
  const longInterest: BigNumber = parseValue("1000000", USD_DECIMALS)!;
  const shortInterest: BigNumber = parseValue("2000000", USD_DECIMALS)!;

  const currentPriceImpact = longInterest.sub(shortInterest).abs();

  const longDeltaUsd = p.longDeltaUsd || BigNumber.from(0);
  const shortDeltaUsd = p.shortDeltaUsd || BigNumber.from(0);

  const newLongInterest = longInterest.add(longDeltaUsd);
  const newShortInterest = shortInterest.add(shortDeltaUsd);

  const newPriceImpact = newLongInterest.sub(newShortInterest).abs();

  const hasPositiveImpact = currentPriceImpact.sub(newPriceImpact).gt(0);

  let priceImpactDiff = applyImpactFactor(currentPriceImpact.sub(newPriceImpact));

  priceImpactDiff = hasPositiveImpact ? priceImpactDiff : BigNumber.from(0).sub(priceImpactDiff);

  const totalTradeSize = longDeltaUsd.abs().add(shortDeltaUsd.abs());

  const priceImpactBasisPoints = totalTradeSize.gt(0)
    ? priceImpactDiff.mul(BASIS_POINTS_DIVISOR).div(totalTradeSize).abs()
    : BigNumber.from(0);

  return {
    priceImpactDiff,
    priceImpactBasisPoints,
  };
}
