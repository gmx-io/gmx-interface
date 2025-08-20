import { Abi, erc20Abi } from "viem";

import ArbitrumNodeInterface from "./ArbitrumNodeInterface.json";
import ClaimHandler from "./ClaimHandler.json";
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
import LayerZeroProvider from "./LayerZeroProvider.json";
import MintableBaseToken from "./MintableBaseToken.json";
import Multicall from "./Multicall.json";
import MultichainClaimsRouter from "./MultichainClaimsRouter.json";
import MultichainGlvRouter from "./MultichainGlvRouter.json";
import MultichainGmRouter from "./MultichainGmRouter.json";
import MultichainOrderRouter from "./MultichainOrderRouter.json";
import MultichainSubaccountRouter from "./MultichainSubaccountRouter.json";
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
import RelayParams from "./RelayParams.json";
import RewardReader from "./RewardReader.json";
import RewardRouter from "./RewardRouter.json";
import RewardTracker from "./RewardTracker.json";
import RouterV2 from "./Router-v2.json";
import Router from "./Router.json";
import StBTC from "./StBTC.json";
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
  | "DataStore"
  | "ERC20"
  | "ERC20PermitInterface"
  | "ERC721"
  | "EventEmitter"
  | "ExchangeRouter"
  | "GelatoRelayRouter"
  | "GlpManager"
  | "GlvReader"
  | "GlvRouter"
  | "GMT"
  | "GmxMigrator"
  | "GovToken"
  | "LayerZeroProvider"
  | "MintableBaseToken"
  | "Multicall"
  | "MultichainClaimsRouter"
  | "MultichainGlvRouter"
  | "MultichainGmRouter"
  | "MultichainOrderRouter"
  | "MultichainSubaccountRouter"
  | "MultichainTransferRouter"
  | "MultichainUtils"
  | "MultichainVault"
  | "OrderBook"
  | "OrderBookReader"
  | "OrderExecutor"
  | "PositionManager"
  | "PositionRouter"
  | "Reader"
  | "ReaderV2"
  | "ReferralStorage"
  | "RelayParams"
  | "RewardReader"
  | "RewardRouter"
  | "RewardTracker"
  | "Router"
  | "RouterV2"
  | "SubaccountGelatoRelayRouter"
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
  | "AbstractSubaccountApprovalNonceable"
  | "SubaccountGelatoRelayRouter"
  | "ERC20PermitInterface"
  | "GelatoRelayRouter"
  | "ArbitrumNodeInterface"
  | "StBTC"
  | "ClaimHandler";

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
  DataStore: DataStore.abi,
  ERC20: erc20Abi,
  ERC20PermitInterface: ERC20PermitInterface.abi,
  ERC721: ERC721.abi,
  EventEmitter: EventEmitter.abi,
  ExchangeRouter: ExchangeRouter.abi,
  GelatoRelayRouter: GelatoRelayRouter.abi,
  GlpManager: GlpManager.abi,
  GlvReader: GlvReader.abi,
  GlvRouter: GlvRouter.abi,
  GMT: GMT.abi,
  GmxMigrator: GmxMigrator.abi,
  GovToken: GovToken.abi,
  LayerZeroProvider: LayerZeroProvider.abi,
  MintableBaseToken: MintableBaseToken.abi,
  Multicall: Multicall.abi,
  MultichainClaimsRouter: MultichainClaimsRouter.abi,
  MultichainGlvRouter: MultichainGlvRouter.abi,
  MultichainGmRouter: MultichainGmRouter.abi,
  MultichainOrderRouter: MultichainOrderRouter.abi,
  MultichainSubaccountRouter: MultichainSubaccountRouter.abi,
  MultichainTransferRouter: MultichainTransferRouter.abi,
  MultichainUtils: MultichainUtils.abi,
  MultichainVault: MultichainVault.abi,
  OrderBook: OrderBook.abi,
  OrderBookReader: OrderBookReader.abi,
  OrderExecutor: OrderExecutor.abi,
  PositionManager: PositionManager.abi,
  PositionRouter: PositionRouter.abi,
  Reader: Reader.abi,
  ReaderV2: ReaderV2.abi,
  ReferralStorage: ReferralStorage.abi,
  RelayParams: RelayParams.abi,
  RewardReader: RewardReader.abi,
  RewardRouter: RewardRouter.abi,
  RewardTracker: RewardTracker.abi,
  Router: Router.abi,
  RouterV2: RouterV2.abi,
  SubaccountGelatoRelayRouter: SubaccountGelatoRelayRouter.abi,
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
  StBTC: StBTC.abi,
  ClaimHandler: ClaimHandler.abi,
} satisfies Record<AbiId, any> as any;
