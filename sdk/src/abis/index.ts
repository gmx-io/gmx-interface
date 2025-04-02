import type { JsonFragment } from "ethers";
import { Abi, erc20Abi } from "viem";

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
import MultichainClaimsRouter from "./MultichainClaimsRouter.json";
import MultichainGlvRouter from "./MultichainGlvRouter.json";
import MultichainGmRouter from "./MultichainGmRouter.json";
import MultichainOrderRouter from "./MultichainOrderRouter.json";
import MultichainOrderRouterUtils from "./MultichainOrderRouterUtils.json";
import MultichainTransferRouter from "./MultichainTransferRouter.json";
import MultichainUtils from "./MultichainUtils.json";
import MultichainVault from "./MultichainVault.json";
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
  | "MultichainClaimsRouter"
  | "MultichainGlvRouter"
  | "MultichainGmRouter"
  | "MultichainOrderRouter"
  | "MultichainOrderRouterUtils"
  | "MultichainTransferRouter"
  | "MultichainUtils"
  | "MultichainVault";

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
  MultichainClaimsRouter: MultichainClaimsRouter.abi,
  MultichainGlvRouter: MultichainGlvRouter.abi,
  MultichainGmRouter: MultichainGmRouter.abi,
  MultichainOrderRouter: MultichainOrderRouter.abi,
  MultichainOrderRouterUtils: MultichainOrderRouterUtils.abi,
  MultichainTransferRouter: MultichainTransferRouter.abi,
  MultichainUtils: MultichainUtils.abi,
  MultichainVault: MultichainVault.abi,
} as any;
