import { useMemo } from "react";

import { MarketInfo, getIsFundingClaimInsufficientBalance } from "domain/synthetics/markets";
import { convertToUsd } from "domain/synthetics/tokens";

export function useClaimableFunding(markets: MarketInfo[]) {
  return useMemo(() => {
    let totalClaimableFundingUsd = 0n;
    let claimableFundingUsd = 0n;
    let hasInsufficientBalance = false;
    let hasClaimable = false;

    for (const market of markets) {
      const { longToken, shortToken } = market;

      const fundingLongUsd = convertToUsd(
        market.claimableFundingAmountLong,
        longToken.decimals,
        longToken.prices.minPrice
      );
      const fundingShortUsd = convertToUsd(
        market.claimableFundingAmountShort,
        shortToken.decimals,
        shortToken.prices.minPrice
      );

      const marketTotal = (fundingLongUsd ?? 0n) + (fundingShortUsd ?? 0n);
      totalClaimableFundingUsd += marketTotal;

      const longInsufficient = getIsFundingClaimInsufficientBalance(market, true);
      const shortInsufficient = getIsFundingClaimInsufficientBalance(market, false);

      if (longInsufficient || shortInsufficient) {
        hasInsufficientBalance = true;
      }

      if (!longInsufficient) {
        claimableFundingUsd += fundingLongUsd ?? 0n;
      }
      if (!shortInsufficient) {
        claimableFundingUsd += fundingShortUsd ?? 0n;
      }
      if ((!longInsufficient && (fundingLongUsd ?? 0n) > 0n) || (!shortInsufficient && (fundingShortUsd ?? 0n) > 0n)) {
        hasClaimable = true;
      }
    }

    return {
      totalClaimableFundingUsd,
      claimableFundingUsd,
      hasInsufficientBalance,
      allInsufficient: hasInsufficientBalance && !hasClaimable,
    };
  }, [markets]);
}
