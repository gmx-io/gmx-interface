import { Abi, erc20Abi } from "viem";

import ArbitrumNodeInterface from "./ArbitrumNodeInterface.json";
import CustomErrorsArbitrumSepolia from "./arbitrumSepolia/CustomErrors.json";
import DataStoreArbitrumSepolia from "./arbitrumSepolia/DataStore.json";
import ExchangeRouterArbitrumSepolia from "./arbitrumSepolia/ExchangeRouter.json";
import GelatoRelayRouterArbitrumSepolia from "./arbitrumSepolia/GelatoRelayRouter.json";
import GlvReaderArbitrumSepolia from "./arbitrumSepolia/GlvReader.json";
import GlvRouterArbitrumSepolia from "./arbitrumSepolia/GlvRouter.json";
import LayerZeroProviderArbitrumSepolia from "./arbitrumSepolia/LayerZeroProvider.json";
import MultichainClaimsRouterArbitrumSepolia from "./arbitrumSepolia/MultichainClaimsRouter.json";
import MultichainGlvRouterArbitrumSepolia from "./arbitrumSepolia/MultichainGlvRouter.json";
import MultichainGmRouterArbitrumSepolia from "./arbitrumSepolia/MultichainGmRouter.json";
import MultichainOrderRouterArbitrumSepolia from "./arbitrumSepolia/MultichainOrderRouter.json";
import MultichainSubaccountRouterArbitrumSepolia from "./arbitrumSepolia/MultichainSubaccountRouter.json";
import MultichainTransferRouterArbitrumSepolia from "./arbitrumSepolia/MultichainTransferRouter.json";
import MultichainUtilsArbitrumSepolia from "./arbitrumSepolia/MultichainUtils.json";
import MultichainVaultArbitrumSepolia from "./arbitrumSepolia/MultichainVault.json";
import ReferralStorageArbitrumSepolia from "./arbitrumSepolia/ReferralStorage.json";
import RelayParamsArbitrumSepolia from "./arbitrumSepolia/RelayParams.json";
import SubaccountGelatoRelayRouterArbitrumSepolia from "./arbitrumSepolia/SubaccountGelatoRelayRouter.json";
import SubaccountRouterArbitrumSepolia from "./arbitrumSepolia/SubaccountRouter.json";
import SyntheticsReaderArbitrumSepolia from "./arbitrumSepolia/SyntheticsReader.json";
import TimelockArbitrumSepolia from "./arbitrumSepolia/Timelock.json";
import CustomErrors from "./CustomErrors.json";
import DataStore from "./DataStore.json";
import ERC20PermitInterface from "./ERC20PermitInterface.json";
import ERC721 from "./ERC721.json";
import EventEmitter from "./EventEmitter.json";
import ExchangeRouter from "./ExchangeRouter.json";
import GelatoRelayRouter from "./GelatoRelayRouter.json";
import GlpManager from "./GlpManager.json";
import GlvReader from "./GlvReader.json";
import GlvRouter from "./GlvRouter.json";
import GMT from "./GMT.json";
import GmxMigrator from "./GmxMigrator.json";
import GovToken from "./GovToken.json";
import MintableBaseToken from "./MintableBaseToken.json";
import Multicall from "./Multicall.json";
import OrderBook from "./OrderBook.json";
import OrderBookReader from "./OrderBookReader.json";
import OrderExecutor from "./OrderExecutor.json";
import PositionManager from "./PositionManager.json";
import PositionRouter from "./PositionRouter.json";
import Reader from "./Reader.json";
import ReaderV2 from "./ReaderV2.json";
import ReferralStorage from "./ReferralStorage.json";
import RewardReader from "./RewardReader.json";
import RewardRouter from "./RewardRouter.json";
import RewardTracker from "./RewardTracker.json";
import RouterV2 from "./Router-v2.json";
import Router from "./Router.json";
import SubaccountGelatoRelayRouter from "./SubaccountGelatoRelayRouter.json";
import SubaccountRouter from "./SubaccountRouter.json";
import SyntheticsReader from "./SyntheticsReader.json";
import SyntheticsRouter from "./SyntheticsRouter.json";
import Timelock from "./Timelock.json";
import Token from "./Token.json";
import Treasury from "./Treasury.json";
import UniPool from "./UniPool.json";
import UniswapV2 from "./UniswapV2.json";
import Vault from "./Vault.json";
import VaultReader from "./VaultReader.json";
import VaultV2 from "./VaultV2.json";
import VaultV2b from "./VaultV2b.json";
import Vester from "./Vester.json";
import WETH from "./WETH.json";
import YieldFarm from "./YieldFarm.json";
import YieldToken from "./YieldToken.json";

export type AbiId =
  | "ArbitrumNodeInterface"
  | "CustomErrors"
  | "CustomErrorsArbitrumSepolia"
  | "DataStore"
  | "DataStoreArbitrumSepolia"
  | "ERC20"
  | "ERC20PermitInterface"
  | "ERC721"
  | "EventEmitter"
  | "ExchangeRouter"
  | "ExchangeRouterArbitrumSepolia"
  | "GelatoRelayRouter"
  | "GelatoRelayRouterArbitrumSepolia"
  | "GlpManager"
  | "GlvReader"
  | "GlvReaderArbitrumSepolia"
  | "GlvRouter"
  | "GlvRouterArbitrumSepolia"
  | "GMT"
  | "GmxMigrator"
  | "GovToken"
  | "LayerZeroProviderArbitrumSepolia"
  | "MintableBaseToken"
  | "Multicall"
  | "MultichainClaimsRouterArbitrumSepolia"
  | "MultichainGlvRouterArbitrumSepolia"
  | "MultichainGmRouterArbitrumSepolia"
  | "MultichainOrderRouterArbitrumSepolia"
  | "MultichainSubaccountRouterArbitrumSepolia"
  | "MultichainTransferRouterArbitrumSepolia"
  | "MultichainUtilsArbitrumSepolia"
  | "MultichainVaultArbitrumSepolia"
  | "OrderBook"
  | "OrderBookReader"
  | "OrderExecutor"
  | "PositionManager"
  | "PositionRouter"
  | "Reader"
  | "ReaderV2"
  | "ReferralStorage"
  | "ReferralStorageArbitrumSepolia"
  | "RelayParamsArbitrumSepolia"
  | "RewardReader"
  | "RewardRouter"
  | "RewardTracker"
  | "Router"
  | "RouterV2"
  | "SubaccountGelatoRelayRouter"
  | "SubaccountGelatoRelayRouterArbitrumSepolia"
  | "SubaccountRouter"
  | "SubaccountRouterArbitrumSepolia"
  | "SyntheticsReader"
  | "SyntheticsReaderArbitrumSepolia"
  | "SyntheticsRouter"
  | "Timelock"
  | "TimelockArbitrumSepolia"
  | "Token"
  | "Treasury"
  | "UniPool"
  | "UniswapV2"
  | "Vault"
  | "VaultReader"
  | "VaultV2"
  | "VaultV2b"
  | "Vester"
  | "WETH"
  | "YieldFarm"
  | "YieldToken"
  | "AbstractUserNonceable"
  | "AbstractSubaccountApprovalNonceable";

/** Copied from ethers to enable compatibility with GMX UI */
interface JsonFragmentType {
  readonly name?: string;
  readonly indexed?: boolean;
  readonly type?: string;
  readonly internalType?: string;
  readonly components?: ReadonlyArray<JsonFragmentType>;
}

interface JsonFragment {
  readonly name?: string;
  readonly type?: string;
  readonly anonymous?: boolean;
  readonly payable?: boolean;
  readonly constant?: boolean;
  readonly stateMutability?: string;
  readonly inputs?: ReadonlyArray<JsonFragmentType>;
  readonly outputs?: ReadonlyArray<JsonFragmentType>;
  readonly gas?: string;
}

export const abis: Record<AbiId, readonly (Abi[number] & JsonFragment)[]> = {
  ArbitrumNodeInterface: ArbitrumNodeInterface.abi,
  CustomErrors: CustomErrors.abi,
  CustomErrorsArbitrumSepolia: CustomErrorsArbitrumSepolia.abi,
  DataStore: DataStore.abi,
  DataStoreArbitrumSepolia: DataStoreArbitrumSepolia.abi,
  ERC20: erc20Abi,
  ERC20PermitInterface: ERC20PermitInterface.abi,
  ERC721: ERC721.abi,
  EventEmitter: EventEmitter.abi,
  ExchangeRouter: ExchangeRouter.abi,
  ExchangeRouterArbitrumSepolia: ExchangeRouterArbitrumSepolia.abi,
  GelatoRelayRouter: GelatoRelayRouter.abi,
  GelatoRelayRouterArbitrumSepolia: GelatoRelayRouterArbitrumSepolia.abi,
  GlpManager: GlpManager.abi,
  GlvReader: GlvReader.abi,
  GlvReaderArbitrumSepolia: GlvReaderArbitrumSepolia.abi,
  GlvRouter: GlvRouter.abi,
  GlvRouterArbitrumSepolia: GlvRouterArbitrumSepolia.abi,
  GMT: GMT.abi,
  GmxMigrator: GmxMigrator.abi,
  GovToken: GovToken.abi,
  LayerZeroProviderArbitrumSepolia: LayerZeroProviderArbitrumSepolia.abi,
  MintableBaseToken: MintableBaseToken.abi,
  Multicall: Multicall.abi,
  MultichainClaimsRouterArbitrumSepolia: MultichainClaimsRouterArbitrumSepolia.abi,
  MultichainGlvRouterArbitrumSepolia: MultichainGlvRouterArbitrumSepolia.abi,
  MultichainGmRouterArbitrumSepolia: MultichainGmRouterArbitrumSepolia.abi,
  MultichainOrderRouterArbitrumSepolia: MultichainOrderRouterArbitrumSepolia.abi,
  MultichainSubaccountRouterArbitrumSepolia: MultichainSubaccountRouterArbitrumSepolia.abi,
  MultichainTransferRouterArbitrumSepolia: MultichainTransferRouterArbitrumSepolia.abi,
  MultichainUtilsArbitrumSepolia: MultichainUtilsArbitrumSepolia.abi,
  MultichainVaultArbitrumSepolia: MultichainVaultArbitrumSepolia.abi,
  OrderBook: OrderBook.abi,
  OrderBookReader: OrderBookReader.abi,
  OrderExecutor: OrderExecutor.abi,
  PositionManager: PositionManager.abi,
  PositionRouter: PositionRouter.abi,
  Reader: Reader.abi,
  ReaderV2: ReaderV2.abi,
  ReferralStorage: ReferralStorage.abi,
  ReferralStorageArbitrumSepolia: ReferralStorageArbitrumSepolia.abi,
  RelayParamsArbitrumSepolia: RelayParamsArbitrumSepolia.abi,
  RewardReader: RewardReader.abi,
  RewardRouter: RewardRouter.abi,
  RewardTracker: RewardTracker.abi,
  Router: Router.abi,
  RouterV2: RouterV2.abi,
  SubaccountGelatoRelayRouter: SubaccountGelatoRelayRouter.abi,
  SubaccountGelatoRelayRouterArbitrumSepolia: SubaccountGelatoRelayRouterArbitrumSepolia.abi,
  SubaccountRouter: SubaccountRouter.abi,
  SubaccountRouterArbitrumSepolia: SubaccountRouterArbitrumSepolia.abi,
  SyntheticsReader: SyntheticsReader.abi,
  SyntheticsReaderArbitrumSepolia: SyntheticsReaderArbitrumSepolia.abi,
  SyntheticsRouter: SyntheticsRouter.abi,
  Timelock: Timelock.abi,
  TimelockArbitrumSepolia: TimelockArbitrumSepolia.abi,
  Token: Token.abi,
  Treasury: Treasury.abi,
  UniPool: UniPool.abi,
  UniswapV2: UniswapV2.abi,
  Vault: Vault.abi,
  VaultReader: VaultReader.abi,
  VaultV2: VaultV2.abi,
  VaultV2b: VaultV2b.abi,
  Vester: Vester.abi,
  WETH: WETH.abi,
  YieldFarm: YieldFarm.abi,
  YieldToken: YieldToken.abi,
  AbstractUserNonceable: [
    {
      inputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      name: "userNonces",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  ],
  AbstractSubaccountApprovalNonceable: [
    {
      inputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      name: "subaccountApprovalNonces",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  ],
} satisfies Record<AbiId, any> as any;
