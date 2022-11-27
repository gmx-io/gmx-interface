import { formatAmount } from "lib/numbers";
import { formatUsdAmount } from "../tokens/utils";
import { PriceImpactData } from "./usePriceImpact";

export function formatPriceImpact(p: PriceImpactData) {
  if (!p.priceImpactBasisPoints.gt(0)) {
    return "...";
  }

  const formattedUsd = formatUsdAmount(p.priceImpactDiff);
  const formattedBp = formatAmount(p.priceImpactBasisPoints, 2, 2);

  return `${formattedBp}% (${formattedUsd})`;
}
