import useSWR from "swr";
import { isAddress } from "viem";

import { fetchIncentivesGraphql } from "./client";
import { RETURN_BONUS_QUERY, RETURN_BONUS_VOLUME_QUERY } from "./queries";
import type { AccountIncentiveStatus } from "./types";

export type ReturnBonus = Pick<
  AccountIncentiveStatus,
  "boostIds" | "manualRewardCapUsd" | "manualRewardConsumedUsd" | "manualRewardRemainingUsd"
>;

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

export function useReturnBonusVolume(
  endpoint: string | undefined,
  account: string | undefined,
  programStartTimestamp: number | undefined
) {
  return useSWR(
    endpoint && account && isAddress(account) && programStartTimestamp !== undefined
      ? (["returnBonusVolume", endpoint, account, programStartTimestamp] as const)
      : null,
    async ([, url, address, programStart]) => {
      const { incentiveManualAllocations } = await fetchIncentivesGraphql<{
        incentiveManualAllocations: { lifetimeVolume: string }[];
      }>(url, RETURN_BONUS_VOLUME_QUERY, { account: address, programStartTimestamp: programStart });

      const allocation = incentiveManualAllocations[0];
      return allocation ? BigInt(allocation.lifetimeVolume) : null;
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );
}
