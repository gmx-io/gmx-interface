import type { IRpc, StateOverrideEntry } from "./index";

type ViemRpcRequest = {
  account: `0x${string}` | undefined;
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
  stateOverride: ReturnType<typeof mapStateOverride>;
};

function mapStateOverride(entries?: StateOverrideEntry[]) {
  return entries?.map((entry) => ({
    address: entry.address as `0x${string}`,
    stateDiff: entry.stateDiff?.map((diff) => ({
      slot: diff.slot as `0x${string}`,
      value: diff.value as `0x${string}`,
    })),
    balance: entry.balance,
    nonce: entry.nonce,
    code: entry.code as `0x${string}` | undefined,
  }));
}

export function createViemRpc(client: {
  estimateGas(params: ViemRpcRequest): Promise<bigint>;
  call(params: ViemRpcRequest): Promise<{ data?: string }>;
}): IRpc {
  return {
    estimateGas: async ({ from, to, data, value, stateOverride }) => {
      return client.estimateGas({
        account: from as `0x${string}` | undefined,
        to: to as `0x${string}`,
        data: data as `0x${string}`,
        value: value ?? 0n,
        stateOverride: mapStateOverride(stateOverride),
      });
    },
    call: async ({ from, to, data, value, stateOverride }) => {
      const result = await client.call({
        account: from as `0x${string}` | undefined,
        to: to as `0x${string}`,
        data: data as `0x${string}`,
        value: value ?? 0n,
        stateOverride: mapStateOverride(stateOverride),
      });
      return result.data ?? "0x";
    },
  };
}
