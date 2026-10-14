import { metrics, type StakingActionEvent } from "lib/metrics";
import { getTxnErrorOutcome } from "lib/metrics/txnErrorOutcome";

type StakingActionData = StakingActionEvent["data"];

export function sendStakingActionMetric({
  action,
  tokenSymbol,
  chainId,
  error,
}: {
  action: StakingActionData["action"];
  tokenSymbol: string | undefined;
  chainId: number;
  error?: unknown;
}) {
  metrics.pushEvent<StakingActionEvent>({
    event: "staking.action",
    isError: false,
    data: {
      action,
      tokenSymbol,
      chainId,
      outcome: error === undefined ? "sent" : getTxnErrorOutcome(error),
    },
  });
}

export function getRewardsClaimAction({
  shouldStakeGmx,
  totalGmxRewards,
  shouldStakeEsGmx,
  totalEsGmxRewards,
}: {
  shouldStakeGmx: boolean | undefined;
  totalGmxRewards: bigint | undefined;
  shouldStakeEsGmx: boolean | undefined;
  totalEsGmxRewards: bigint | undefined;
}): "claim" | "compound" {
  const isCompound =
    (shouldStakeGmx === true && totalGmxRewards !== undefined && totalGmxRewards > 0n) ||
    (shouldStakeEsGmx === true && totalEsGmxRewards !== undefined && totalEsGmxRewards > 0n);

  return isCompound ? "compound" : "claim";
}
