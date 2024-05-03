import { useClaimableBnGMXAmount } from "domain/rewards/useClaimableBnGMXAmount";
import { useUnstakedBnGMXAmount } from "domain/rewards/useUnstakedBnGMXAmount";

export function useAccumulatedBnGMXAmount() {
  const claimableBnGMXAmount = useClaimableBnGMXAmount();
  const unstakedBnGMXAmount = useUnstakedBnGMXAmount();

  return unstakedBnGMXAmount && claimableBnGMXAmount === undefined
    ? undefined
    : claimableBnGMXAmount + unstakedBnGMXAmount;
}
