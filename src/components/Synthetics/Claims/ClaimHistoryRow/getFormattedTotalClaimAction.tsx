import { ClaimAction } from "domain/synthetics/claimHistory";
import { BN_ZERO, formatUsd } from "lib/numbers";

export function getFormattedTotalClaimAction(claimAction: ClaimAction) {
  let totalUsd = BN_ZERO;

  for (let i = 0; i < claimAction.amounts.length; i++) {
    const amount = claimAction.amounts[i];
    const price = claimAction.tokenPrices[i];

    const priceUsd = amount.mul(price);
    totalUsd = totalUsd.add(priceUsd);
  }

  const formattedTotalUsd = formatUsd(totalUsd);
  return formattedTotalUsd;
}
