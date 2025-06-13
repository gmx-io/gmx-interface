import { Contract, ContractRunner, ethers, InterfaceAbi } from "ethers";
import type { Address } from "viem";

import { ContractName, getContract } from "sdk/configs/contracts";
import { GlvRouter__factory } from "typechain-types";
import { DataStore__factory } from "typechain-types/factories/DataStore__factory";
import { ExchangeRouter__factory } from "typechain-types/factories/ExchangeRouter__factory";
import { Multicall__factory } from "typechain-types/factories/Multicall__factory";

import { ContractsChainId } from "./chains";

const { ZeroAddress } = ethers;

export { getContract } from "sdk/configs/contracts";

export const XGMT_EXCLUDED_ACCOUNTS = [
  "0x330eef6b9b1ea6edd620c825c9919dc8b611d5d5",
  "0xd9b1c23411adbb984b1c4be515fafc47a12898b2",
  "0xa633158288520807f91ccc98aa58e0ea43acb400",
  "0xffd0a93b4362052a336a7b22494f1b77018dd34b",
];

function makeGetContract<T extends { abi: InterfaceAbi; connect: (address: string) => unknown }>(
  name: ContractName,
  factory: T
) {
  return (chainId: ContractsChainId, provider?: ContractRunner) =>
    new Contract(getContract(chainId, name), factory.abi, provider) as unknown as ReturnType<T["connect"]>;
}

export const getDataStoreContract = makeGetContract("DataStore", DataStore__factory);
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
