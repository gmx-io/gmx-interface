import type { Address, PublicClient } from "viem";

import type { IRpc, StateOverrideEntry } from "./index";

function mapStateOverride(entries?: StateOverrideEntry[]) {
  return entries?.map((entry) => ({
    address: entry.address as Address,
    stateDiff: entry.stateDiff?.map((diff) => ({
      slot: diff.slot as `0x${string}`,
      value: diff.value as `0x${string}`,
    })),
    balance: entry.balance,
    nonce: entry.nonce,
    code: entry.code as `0x${string}` | undefined,
  }));
}

export function createViemRpc(client: PublicClient): IRpc {
  return {
    estimateGas: async ({ from, to, data, value, stateOverride }) => {
      return client.estimateGas({
        account: from as Address,
        to: to as Address,
        data: data as `0x${string}`,
        value: value ?? 0n,
        stateOverride: mapStateOverride(stateOverride),
      });
    },
    call: async ({ from, to, data, value, stateOverride }) => {
      const result = await client.call({
        account: from as Address,
        to: to as Address,
        data: data as `0x${string}`,
        value: value ?? 0n,
        stateOverride: mapStateOverride(stateOverride),
      });
      return result.data ?? "";
    },
  };
}
