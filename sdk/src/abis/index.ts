import type { JsonFragment } from "ethers";
import { Abi, erc20Abi } from "viem";

import CustomErrorsArbitrumSepolia from "./arbitrumSepolia/CustomErrors.json";
import DataStoreArbitrumSepolia from "./arbitrumSepolia/DataStore.json";
import ExchangeRouterArbitrumSepolia from "./arbitrumSepolia/ExchangeRouter.json";
import GelatoRelayRouterArbitrumSepolia from "./arbitrumSepolia/GelatoRelayRouter.json";
import GlvReaderArbitrumSepolia from "./arbitrumSepolia/GlvReader.json";
import GlvRouterArbitrumSepolia from "./arbitrumSepolia/GlvRouter.json";
import MultichainClaimsRouterArbitrumSepolia from "./arbitrumSepolia/MultichainClaimsRouter.json";
import MultichainGlvRouterArbitrumSepolia from "./arbitrumSepolia/MultichainGlvRouter.json";
import MultichainGmRouterArbitrumSepolia from "./arbitrumSepolia/MultichainGmRouter.json";
import MultichainOrderRouterArbitrumSepolia from "./arbitrumSepolia/MultichainOrderRouter.json";
import MultichainOrderRouterUtilsArbitrumSepolia from "./arbitrumSepolia/MultichainOrderRouterUtils.json";
import MultichainTransferRouterArbitrumSepolia from "./arbitrumSepolia/MultichainTransferRouter.json";
import MultichainUtilsArbitrumSepolia from "./arbitrumSepolia/MultichainUtils.json";
import MultichainVaultArbitrumSepolia from "./arbitrumSepolia/MultichainVault.json";
import ReferralStorageArbitrumSepolia from "./arbitrumSepolia/ReferralStorage.json";
import SubaccountGelatoRelayRouterArbitrumSepolia from "./arbitrumSepolia/SubaccountGelatoRelayRouter.json";
import SubaccountRouterArbitrumSepolia from "./arbitrumSepolia/SubaccountRouter.json";
import SyntheticsReaderArbitrumSepolia from "./arbitrumSepolia/SyntheticsReader.json";
import TimelockArbitrumSepolia from "./arbitrumSepolia/Timelock.json";
import CustomErrors from "./CustomErrors.json";
import DataStore from "./DataStore.json";
import ERC721 from "./ERC721.json";
import EventEmitter from "./EventEmitter.json";
import ExchangeRouter from "./ExchangeRouter.json";
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
  | "CustomErrors"
  | "DataStore"
  | "ERC721"
  | "ERC20"
  | "EventEmitter"
  | "ExchangeRouter"
  | "GlpManager"
  | "GlvReader"
  | "GlvRouter"
  | "GMT"
  | "GmxMigrator"
  | "GovToken"
  | "MintableBaseToken"
  | "Multicall"
  | "OrderBook"
  | "OrderBookReader"
  | "OrderExecutor"
  | "PositionManager"
  | "PositionRouter"
  | "Reader"
  | "ReaderV2"
  | "ReferralStorage"
  | "RewardReader"
  | "RewardRouter"
  | "RewardTracker"
  | "Router-v2"
  | "Router"
  | "SubaccountRouter"
  | "SyntheticsReader"
  | "SyntheticsRouter"
  | "Timelock"
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
  | "CustomErrorsArbitrumSepolia"
  | "DataStoreArbitrumSepolia"
  | "ExchangeRouterArbitrumSepolia"
  | "GelatoRelayRouterArbitrumSepolia"
  | "GlvReaderArbitrumSepolia"
  | "GlvRouterArbitrumSepolia"
  | "MultichainClaimsRouterArbitrumSepolia"
  | "MultichainGlvRouterArbitrumSepolia"
  | "MultichainGmRouterArbitrumSepolia"
  | "MultichainOrderRouterArbitrumSepolia"
  | "MultichainOrderRouterUtilsArbitrumSepolia"
  | "MultichainTransferRouterArbitrumSepolia"
  | "MultichainUtilsArbitrumSepolia"
  | "MultichainVaultArbitrumSepolia"
  | "ReferralStorageArbitrumSepolia"
  | "SubaccountGelatoRelayRouterArbitrumSepolia"
  | "SubaccountRouterArbitrumSepolia"
  | "SyntheticsReaderArbitrumSepolia"
  | "TimelockArbitrumSepolia";

export const abis: Record<AbiId, readonly (Abi[number] & JsonFragment)[]> = {
  CustomErrors: CustomErrors.abi,
  DataStore: DataStore.abi,
  ERC721: ERC721.abi,
  ERC20: erc20Abi,
  EventEmitter: EventEmitter.abi,
  ExchangeRouter: ExchangeRouter.abi,
  GlpManager: GlpManager.abi,
  GlvReader: GlvReader.abi,
  GlvRouter: GlvRouter.abi,
  GMT: GMT.abi,
  GmxMigrator: GmxMigrator.abi,
  GovToken: GovToken.abi,
  MintableBaseToken: MintableBaseToken.abi,
  Multicall: Multicall.abi,
  OrderBook: OrderBook.abi,
  OrderBookReader: OrderBookReader.abi,
  OrderExecutor: OrderExecutor.abi,
  PositionManager: PositionManager.abi,
  PositionRouter: PositionRouter.abi,
  Reader: Reader.abi,
  ReaderV2: ReaderV2.abi,
  ReferralStorage: ReferralStorage.abi,
  RewardReader: RewardReader.abi,
  RewardRouter: RewardRouter.abi,
  RewardTracker: RewardTracker.abi,
  RouterV2: RouterV2.abi,
  Router: Router.abi,
  SubaccountRouter: SubaccountRouter.abi,
  SyntheticsReader: SyntheticsReader.abi,
  SyntheticsRouter: SyntheticsRouter.abi,
  Timelock: Timelock.abi,
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
  CustomErrorsArbitrumSepolia: CustomErrorsArbitrumSepolia.abi,
  DataStoreArbitrumSepolia: DataStoreArbitrumSepolia.abi,
  ExchangeRouterArbitrumSepolia: ExchangeRouterArbitrumSepolia.abi,
  GelatoRelayRouterArbitrumSepolia: GelatoRelayRouterArbitrumSepolia.abi,
  GlvReaderArbitrumSepolia: GlvReaderArbitrumSepolia.abi,
  GlvRouterArbitrumSepolia: GlvRouterArbitrumSepolia.abi,
  MultichainClaimsRouterArbitrumSepolia: MultichainClaimsRouterArbitrumSepolia.abi,
  MultichainGlvRouterArbitrumSepolia: MultichainGlvRouterArbitrumSepolia.abi,
  MultichainGmRouterArbitrumSepolia: MultichainGmRouterArbitrumSepolia.abi,
  MultichainOrderRouterArbitrumSepolia: MultichainOrderRouterArbitrumSepolia.abi,
  MultichainOrderRouterUtilsArbitrumSepolia: MultichainOrderRouterUtilsArbitrumSepolia.abi,
  MultichainTransferRouterArbitrumSepolia: MultichainTransferRouterArbitrumSepolia.abi,
  MultichainUtilsArbitrumSepolia: MultichainUtilsArbitrumSepolia.abi,
  MultichainVaultArbitrumSepolia: MultichainVaultArbitrumSepolia.abi,
  SyntheticsReaderArbitrumSepolia: SyntheticsReaderArbitrumSepolia.abi,
  ReferralStorageArbitrumSepolia: ReferralStorageArbitrumSepolia.abi,
  SubaccountGelatoRelayRouterArbitrumSepolia: SubaccountGelatoRelayRouterArbitrumSepolia.abi,
  SubaccountRouterArbitrumSepolia: SubaccountRouterArbitrumSepolia.abi,
  TimelockArbitrumSepolia: TimelockArbitrumSepolia.abi,
} as any;
