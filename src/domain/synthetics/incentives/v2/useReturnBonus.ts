import useSWR from "swr";
import { getAddress, isAddress } from "viem";

import { fetchIncentivesGraphql } from "./client";
import { RETURN_BONUS_HISTORY_QUERY, RETURN_BONUS_QUERY } from "./queries";
import type { BoostId } from "./types";

export type ReturnBonus = {
  boostIds: BoostId[];
  manualRewardCapUsd: bigint;
  manualRewardConsumedUsd: bigint;
  manualRewardRemainingUsd: bigint;
};

type RawReturnBonus = {
  boostIds: ReturnBonus["boostIds"];
  manualRewardCapUsd: string;
  manualRewardConsumedUsd: string;
  manualRewardRemainingUsd: string;
};

export function useReturnBonus(endpoint: string | undefined, account: string | undefined) {
  return useSWR(
    endpoint && account && isAddress(account) ? ["returnBonus", endpoint, account] : null,
    async ([, url, address]) => {
      const { accountIncentiveStatus: status } = await fetchIncentivesGraphql<{
        accountIncentiveStatus: RawReturnBonus | null;
      }>(url, RETURN_BONUS_QUERY, { account: address });

      if (!status) return null;

      return {
        boostIds: status.boostIds,
        manualRewardCapUsd: BigInt(status.manualRewardCapUsd),
        manualRewardConsumedUsd: BigInt(status.manualRewardConsumedUsd),
        manualRewardRemainingUsd: BigInt(status.manualRewardRemainingUsd),
      } satisfies ReturnBonus;
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );
}

export function useReturnBonusHistory(
  endpoint: string | undefined,
  account: string | undefined,
  programStartTimestamp: number | undefined
) {
  return useSWR(
    endpoint && account && isAddress(account) && programStartTimestamp !== undefined
      ? (["returnBonusHistory", endpoint, account, programStartTimestamp] as const)
      : null,
    async ([, url, address, programStart]) => {
      const { incentiveManualAllocations, tradeActions } = await fetchIncentivesGraphql<{
        incentiveManualAllocations: { lifetimeVolume: string }[];
        tradeActions: { timestamp: number }[];
      }>(url, RETURN_BONUS_HISTORY_QUERY, { account: getAddress(address), programStartTimestamp: programStart });

      const allocation = incentiveManualAllocations[0];
      const lifetimeVolume = allocation ? BigInt(allocation.lifetimeVolume) : null;
      return { lifetimeVolume, hasHistory: (lifetimeVolume ?? 0n) > 0n || tradeActions.length > 0 };
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );
}
