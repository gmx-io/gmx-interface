import { Contract, ContractRunner, InterfaceAbi } from "ethers";
import type { Address } from "viem";

import { ContractName, getContract } from "sdk/configs/contracts";
import { DataStore__factory } from "typechain-types/factories/DataStore__factory";
import { Multicall__factory } from "typechain-types/factories/Multicall__factory";

import type { ContractsChainId } from "./chains";

export { getContract } from "sdk/configs/contracts";

function makeGetContract<T extends { abi: InterfaceAbi; connect: (address: string) => unknown }>(
  name: ContractName,
  factory: T
) {
  return (chainId: ContractsChainId, provider?: ContractRunner) =>
    new Contract(getContract(chainId, name), factory.abi, provider) as unknown as ReturnType<T["connect"]>;
}

/**
 * @deprecated
 */
export const getDataStoreContract = makeGetContract("DataStore", DataStore__factory);
/**
 * @deprecated
 */
export const getMulticallContract = makeGetContract("Multicall", Multicall__factory);

export function tryGetContract(chainId: ContractsChainId, name: ContractName): Address | undefined {
  try {
    return getContract(chainId, name);
  } catch (e) {
    return undefined;
  }
}
