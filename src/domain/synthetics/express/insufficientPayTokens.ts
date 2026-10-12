import type { TokensBalancesUpdates } from "context/TokensBalancesContext/TokensBalancesContextProvider";
import type { TokensData } from "domain/synthetics/tokens";
import { getBalanceByBalanceType } from "domain/synthetics/tokens/utils";
import { TokenBalanceType } from "domain/tokens";

export type PayAmounts = { [tokenAddress: string]: bigint };

export function getPossiblyInsufficientPayTokens({
  payAmounts,
  tokensData,
  optimisticUpdates,
  websocketUpdates,
  balanceType,
}: {
  payAmounts: PayAmounts;
  tokensData: TokensData | undefined;
  optimisticUpdates: TokensBalancesUpdates;
  websocketUpdates: TokensBalancesUpdates;
  balanceType: TokenBalanceType;
}): string[] {
  if (!tokensData) {
    return [];
  }

  return Object.entries(payAmounts)
    .filter(([tokenAddress, requiredAmount]) => {
      const shownBalance = getBalanceByBalanceType(tokensData[tokenAddress], balanceType);

      if (shownBalance === undefined) {
        return false;
      }

      const optimisticUpdate = optimisticUpdates[tokenAddress];
      const isDeductionApplied =
        !websocketUpdates[tokenAddress] &&
        optimisticUpdate?.balanceType === balanceType &&
        optimisticUpdate.diff !== undefined &&
        optimisticUpdate.diff < 0n;

      // the deduction is clamped at zero, so a positive remainder proves the balance covered the amount
      if (isDeductionApplied) {
        return shownBalance === 0n;
      }

      return shownBalance < requiredAmount;
    })
    .map(([tokenAddress]) => tokenAddress);
}
