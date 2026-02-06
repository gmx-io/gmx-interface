import type { Address } from "viem";

import { ContractName, getContract } from "sdk/configs/contracts";

import type { ContractsChainId } from "./chains";

export { getContract } from "sdk/configs/contracts";

export function tryGetContract(chainId: ContractsChainId, name: ContractName): Address | undefined {
  try {
    return getContract(chainId, name);
  } catch (e) {
    return undefined;
  }
}
