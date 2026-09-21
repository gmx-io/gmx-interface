import GlvReaderV2_2_1 from "./GlvReaderV2_2_1";
import { type AbiId, abis } from "./index";
import SyntheticsReaderV2_2_1 from "./SyntheticsReaderV2_2_1";
import { isContractsV2_2_1 } from "../configs/contracts";

const contractsV2_2_1Abis = {
  GlvReader: GlvReaderV2_2_1,
  SyntheticsReader: SyntheticsReaderV2_2_1,
} satisfies Partial<Record<AbiId, unknown>>;

type ContractsV2_2_1AbiId = keyof typeof contractsV2_2_1Abis;

type ChainAbi<T extends AbiId> = T extends ContractsV2_2_1AbiId
  ? (typeof abis)[T] | (typeof contractsV2_2_1Abis)[T]
  : (typeof abis)[T];

function isContractsV2_2_1AbiId(abiId: AbiId): abiId is ContractsV2_2_1AbiId {
  return abiId in contractsV2_2_1Abis;
}

export function getAbi<T extends AbiId>(chainId: number, abiId: T): ChainAbi<T>;
export function getAbi(chainId: number, abiId: AbiId) {
  if (isContractsV2_2_1(chainId) && isContractsV2_2_1AbiId(abiId)) {
    return contractsV2_2_1Abis[abiId];
  }

  return abis[abiId];
}
