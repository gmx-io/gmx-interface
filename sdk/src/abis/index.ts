import { erc20Abi } from "viem";

import ArbitrumNodeInterface from "./ArbitrumNodeInterface";
import ClaimHandler from "./ClaimHandler";
import CustomErrors from "./CustomErrors";
import DataStore from "./DataStore";
import ERC20PermitInterface from "./ERC20PermitInterface";
import ERC721 from "./ERC721";
import EventEmitter from "./EventEmitter";
import ExchangeRouter from "./ExchangeRouter";
import GelatoRelayRouter from "./GelatoRelayRouter";
import GlpManager from "./GlpManager";
import GlvReader from "./GlvReader";
import GlvRouter from "./GlvRouter";
import GmxMigrator from "./GmxMigrator";
import GovToken from "./GovToken";
import LayerZeroProvider from "./LayerZeroProvider";
import MintableBaseToken from "./MintableBaseToken";
import Multicall from "./Multicall";
import MultichainClaimsRouter from "./MultichainClaimsRouter";
import MultichainGlvRouter from "./MultichainGlvRouter";
import MultichainGmRouter from "./MultichainGmRouter";
import MultichainOrderRouter from "./MultichainOrderRouter";
import MultichainSubaccountRouter from "./MultichainSubaccountRouter";
import MultichainTransferRouter from "./MultichainTransferRouter";
import MultichainUtils from "./MultichainUtils";
import MultichainVault from "./MultichainVault";
import Reader from "./Reader";
import ReaderV2 from "./ReaderV2";
import ReferralStorage from "./ReferralStorage";
import RelayParams from "./RelayParams";
import RewardReader from "./RewardReader";
import RewardRouter from "./RewardRouter";
import RewardTracker from "./RewardTracker";
import SmartAccount from "./SmartAccount";
import StBTC from "./StBTC";
import SubaccountGelatoRelayRouter from "./SubaccountGelatoRelayRouter";
import SubaccountRouter from "./SubaccountRouter";
import SyntheticsReader from "./SyntheticsReader";
import SyntheticsRouter from "./SyntheticsRouter";
import Timelock from "./Timelock";
import Token from "./Token";
import Treasury from "./Treasury";
import UniPool from "./UniPool";
import UniswapV2 from "./UniswapV2";
import UniswapV3Factory from "./UniswapV3Factory";
import UniswapV3Pool from "./UniswapV3Pool";
import UniswapV3PositionManager from "./UniswapV3PositionManager";
import Vault from "./Vault";
import VaultReader from "./VaultReader";
import VaultV2 from "./VaultV2";
import VaultV2b from "./VaultV2b";
import VenusVToken from "./VenusVToken";
import Vester from "./Vester";
import WETH from "./WETH";

const AbstractSubaccountApprovalNonceable = [
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
] as const;

export const abis = {
  AbstractSubaccountApprovalNonceable,
  ArbitrumNodeInterface,
  ClaimHandler,
  CustomErrors,
  DataStore,
  ERC20: erc20Abi,
  ERC20PermitInterface,
  ERC721: ERC721,
  EventEmitter,
  ExchangeRouter,
  GelatoRelayRouter,
  GlpManager,
  GlvReader,
  GlvRouter,
  GmxMigrator,
  GovToken,
  LayerZeroProvider,
  MintableBaseToken,
  Multicall,
  MultichainClaimsRouter,
  MultichainGlvRouter,
  MultichainGmRouter,
  MultichainOrderRouter,
  MultichainSubaccountRouter,
  MultichainTransferRouter,
  MultichainUtils,
  MultichainVault,
  ReferralStorage,
  RelayParams,
  RewardReader,
  RewardRouter,
  RewardTracker,
  SmartAccount,
  StBTC,
  SubaccountGelatoRelayRouter,
  SubaccountRouter,
  SyntheticsReader,
  SyntheticsRouter,
  Timelock,
  Token,
  Reader,
  ReaderV2,
  Treasury,
  UniPool,
  UniswapV2,
  UniswapV3Factory,
  UniswapV3Pool,
  UniswapV3PositionManager,
  Vault,
  VaultReader,
  VaultV2,
  VaultV2b,
  VenusVToken,
  Vester,
  WETH,
} satisfies Record<string, any>;

export type AbiId = keyof typeof abis;
