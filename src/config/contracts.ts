import { Contract, ContractRunner, ethers, InterfaceAbi } from "ethers";
import type { Address } from "viem";

import { ContractName, getContract } from "sdk/configs/contracts";
import { GlvRouter__factory } from "typechain-types";
import { ExchangeRouter__factory } from "typechain-types/factories/ExchangeRouter__factory";
import { Multicall__factory } from "typechain-types/factories/Multicall__factory";

import type { ContractsChainId } from "./chains";

const { ZeroAddress } = ethers;

export { getContract } from "sdk/configs/contracts";

function makeGetContract<T extends { abi: InterfaceAbi; connect: (address: string) => unknown }>(
  name: ContractName,
  factory: T
) {
  return (chainId: ContractsChainId, provider?: ContractRunner) =>
    new Contract(getContract(chainId, name), factory.abi, provider) as unknown as ReturnType<T["connect"]>;
}

export const getMulticallContract = makeGetContract("Multicall", Multicall__factory);
export const getExchangeRouterContract = makeGetContract("ExchangeRouter", ExchangeRouter__factory);
export const getGlvRouterContract = makeGetContract("GlvRouter", GlvRouter__factory);

export const getZeroAddressContract = (provider?: ContractRunner) => new Contract(ZeroAddress, [], provider);

export function tryGetContract(chainId: ContractsChainId, name: ContractName): Address | undefined {
  try {
    return getContract(chainId, name);
  } catch (e) {
    return undefined;
  }
}
