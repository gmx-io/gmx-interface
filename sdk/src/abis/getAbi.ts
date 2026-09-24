import GlvReaderArbitrumSepolia from "./GlvReaderArbitrumSepolia";
import { type AbiId, abis } from "./index";
import SyntheticsReaderArbitrumSepolia from "./SyntheticsReaderArbitrumSepolia";
import { ARBITRUM_SEPOLIA } from "../configs/chainIds";

type ChainAbi<T extends AbiId> = T extends "SyntheticsReader"
  ? (typeof abis)[T] | typeof SyntheticsReaderArbitrumSepolia
  : T extends "GlvReader"
    ? (typeof abis)[T] | typeof GlvReaderArbitrumSepolia
    : (typeof abis)[T];

export function getAbi<T extends AbiId>(chainId: number, abiId: T): ChainAbi<T>;
export function getAbi(chainId: number, abiId: AbiId) {
  if (chainId === ARBITRUM_SEPOLIA) {
    if (abiId === "SyntheticsReader") {
      return SyntheticsReaderArbitrumSepolia;
    }

    if (abiId === "GlvReader") {
      return GlvReaderArbitrumSepolia;
    }
  }

  return abis[abiId];
}
