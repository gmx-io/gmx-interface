import { useClaimableBnGMXAmount } from "domain/rewards/useClaimableBnGMXAmount";
import { useUnstakedBnGMXAmount } from "domain/rewards/useUnstakedBnGMXAmount";

export function useAccumulatedBnGMXAmount() {
  const claimableBnGMXAmount = useClaimableBnGMXAmount();
  const unstakedBnGMXAmount = useUnstakedBnGMXAmount();

  return (claimableBnGMXAmount ?? 0n) + (unstakedBnGMXAmount ?? 0n);
}
