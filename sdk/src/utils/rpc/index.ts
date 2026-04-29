export { createViemRpc } from "./createViemRpc";

export type StateOverrideEntry = {
  address: string;
  stateDiff?: { slot: string; value: string }[];
  balance?: bigint;
  nonce?: number;
  code?: string;
};

export type RpcCallParams = {
  to: string;
  data: string;
  from?: string;
  value?: bigint;
  gas?: bigint;
  stateOverride?: StateOverrideEntry[];
};

export type RpcEstimateGasParams = RpcCallParams & {
  stateOverride?: StateOverrideEntry[];
};

export interface IRpc {
  estimateGas(params: RpcEstimateGasParams): Promise<bigint>;
  call(params: RpcCallParams): Promise<string>;
}
