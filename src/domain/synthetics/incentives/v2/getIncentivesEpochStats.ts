import { fetchIncentivesGraphql } from "./client";
import { INCENTIVES_EPOCH_REWARDS_QUERY } from "./queries";

const PAGE_SIZE = 1000;

export async function getIncentivesEpochStats(endpoint: string, epoch: number) {
  let after = "";
  let rewardsUsd = 0n;
  let hasMore = true;
  const accounts = new Set<string>();

  // The indexer exposes settled rewards, but no aggregate payout field.
  while (hasMore) {
    const { incentiveRewards } = await fetchIncentivesGraphql<{
      incentiveRewards: { id: string; account: string; rewardsUsd: string }[];
    }>(endpoint, INCENTIVES_EPOCH_REWARDS_QUERY, { epoch, after, limit: PAGE_SIZE });

    for (const reward of incentiveRewards) {
      rewardsUsd += BigInt(reward.rewardsUsd);
      accounts.add(reward.account);
    }

    hasMore = incentiveRewards.length === PAGE_SIZE;
    if (!hasMore) break;
    const next = incentiveRewards[incentiveRewards.length - 1].id;
    if (next <= after) throw new Error("Rewards pagination did not advance");
    after = next;
  }

  return { rewardsUsd, traderCount: accounts.size };
}
