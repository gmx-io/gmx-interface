import ExchangeRouterV2_2_1 from "./ExchangeRouterV2_2_1";
import GelatoRelayRouterV2_2_1 from "./GelatoRelayRouterV2_2_1";
import GlvReaderV2_2_1 from "./GlvReaderV2_2_1";
import { type AbiId, abis } from "./index";
import MultichainClaimsRouterV2_2_1 from "./MultichainClaimsRouterV2_2_1";
import MultichainGlvRouterV2_2_1 from "./MultichainGlvRouterV2_2_1";
import MultichainGmRouterV2_2_1 from "./MultichainGmRouterV2_2_1";
import MultichainOrderRouterV2_2_1 from "./MultichainOrderRouterV2_2_1";
import MultichainSubaccountRouterV2_2_1 from "./MultichainSubaccountRouterV2_2_1";
import MultichainTransferRouterV2_2_1 from "./MultichainTransferRouterV2_2_1";
import SubaccountGelatoRelayRouterV2_2_1 from "./SubaccountGelatoRelayRouterV2_2_1";
import SyntheticsReaderV2_2_1 from "./SyntheticsReaderV2_2_1";
import { isContractsV2_2_1 } from "../configs/contracts";

const contractsV2_2_1Abis = {
  ExchangeRouter: ExchangeRouterV2_2_1,
  GelatoRelayRouter: GelatoRelayRouterV2_2_1,
  GlvReader: GlvReaderV2_2_1,
  MultichainClaimsRouter: MultichainClaimsRouterV2_2_1,
  MultichainGlvRouter: MultichainGlvRouterV2_2_1,
  MultichainGmRouter: MultichainGmRouterV2_2_1,
  MultichainOrderRouter: MultichainOrderRouterV2_2_1,
  MultichainSubaccountRouter: MultichainSubaccountRouterV2_2_1,
  MultichainTransferRouter: MultichainTransferRouterV2_2_1,
  SubaccountGelatoRelayRouter: SubaccountGelatoRelayRouterV2_2_1,
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
