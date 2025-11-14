import { bigMath } from "sdk/utils/bigmath";
import { PRECISION, USD_DECIMALS, expandDecimals } from "sdk/utils/numbers";

const MIN_ORDER_USD = expandDecimals(1_000_000, USD_DECIMALS);
const PRICE_IMPACT_THRESHOLD = PRECISION / 500n; // 0.2%

export function getTwapRecommendation({
  enabled,
  sizeDeltaUsd,
  priceImpactPrecise,
}: {
  enabled?: boolean;
  sizeDeltaUsd?: bigint;
  priceImpactPrecise?: bigint;
}): boolean {
  if (!enabled) {
    return false;
  }

  if (sizeDeltaUsd === undefined || bigMath.abs(sizeDeltaUsd) < MIN_ORDER_USD) {
    return false;
  }

  if (priceImpactPrecise === undefined || priceImpactPrecise >= 0n) {
    return false;
  }

  return bigMath.abs(priceImpactPrecise) > PRICE_IMPACT_THRESHOLD;
}
