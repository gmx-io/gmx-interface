import type { Address, PublicClient } from "viem";

import type { IRpc } from "./index";

export function createViemRpc(client: PublicClient): IRpc {
  return {
    estimateGas: async ({ from, to, data, value, stateOverride }) => {
      return client.estimateGas({
        account: from as Address,
        to: to as Address,
        data: data as `0x${string}`,
        value: value ?? 0n,
        stateOverride: stateOverride?.map((entry) => ({
          address: entry.address as Address,
          stateDiff: entry.stateDiff?.map((diff) => ({
            slot: diff.slot as `0x${string}`,
            value: diff.value as `0x${string}`,
          })),
        })),
      });
    },
    call: async ({ from, to, data, value }) => {
      const result = await client.call({
        account: from as Address,
        to: to as Address,
        data: data as `0x${string}`,
        value: value ?? 0n,
      });
      return result.data ?? "";
    },
  };
}
