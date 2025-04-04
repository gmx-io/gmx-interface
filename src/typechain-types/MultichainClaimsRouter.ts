/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumberish,
  BytesLike,
  FunctionFragment,
  Result,
  Interface,
  EventFragment,
  AddressLike,
  ContractRunner,
  ContractMethod,
  Listener,
} from "ethers";
import type {
  TypedContractEvent,
  TypedDeferredTopicFilter,
  TypedEventLog,
  TypedLogDescription,
  TypedListener,
  TypedContractMethod,
} from "./common";

export declare namespace MultichainRouter {
  export type BaseConstructorParamsStruct = {
    router: AddressLike;
    roleStore: AddressLike;
    dataStore: AddressLike;
    eventEmitter: AddressLike;
    oracle: AddressLike;
    orderVault: AddressLike;
    orderHandler: AddressLike;
    externalHandler: AddressLike;
    multichainVault: AddressLike;
  };

  export type BaseConstructorParamsStructOutput = [
    router: string,
    roleStore: string,
    dataStore: string,
    eventEmitter: string,
    oracle: string,
    orderVault: string,
    orderHandler: string,
    externalHandler: string,
    multichainVault: string,
  ] & {
    router: string;
    roleStore: string;
    dataStore: string;
    eventEmitter: string;
    oracle: string;
    orderVault: string;
    orderHandler: string;
    externalHandler: string;
    multichainVault: string;
  };
}

export declare namespace OracleUtils {
  export type SetPricesParamsStruct = {
    tokens: AddressLike[];
    providers: AddressLike[];
    data: BytesLike[];
  };

  export type SetPricesParamsStructOutput = [tokens: string[], providers: string[], data: string[]] & {
    tokens: string[];
    providers: string[];
    data: string[];
  };
}

export declare namespace RelayUtils {
  export type ExternalCallsStruct = {
    externalCallTargets: AddressLike[];
    externalCallDataList: BytesLike[];
    refundTokens: AddressLike[];
    refundReceivers: AddressLike[];
  };

  export type ExternalCallsStructOutput = [
    externalCallTargets: string[],
    externalCallDataList: string[],
    refundTokens: string[],
    refundReceivers: string[],
  ] & {
    externalCallTargets: string[];
    externalCallDataList: string[];
    refundTokens: string[];
    refundReceivers: string[];
  };

  export type TokenPermitStruct = {
    owner: AddressLike;
    spender: AddressLike;
    value: BigNumberish;
    deadline: BigNumberish;
    v: BigNumberish;
    r: BytesLike;
    s: BytesLike;
    token: AddressLike;
  };

  export type TokenPermitStructOutput = [
    owner: string,
    spender: string,
    value: bigint,
    deadline: bigint,
    v: bigint,
    r: string,
    s: string,
    token: string,
  ] & {
    owner: string;
    spender: string;
    value: bigint;
    deadline: bigint;
    v: bigint;
    r: string;
    s: string;
    token: string;
  };

  export type FeeParamsStruct = {
    feeToken: AddressLike;
    feeAmount: BigNumberish;
    feeSwapPath: AddressLike[];
  };

  export type FeeParamsStructOutput = [feeToken: string, feeAmount: bigint, feeSwapPath: string[]] & {
    feeToken: string;
    feeAmount: bigint;
    feeSwapPath: string[];
  };

  export type RelayParamsStruct = {
    oracleParams: OracleUtils.SetPricesParamsStruct;
    externalCalls: RelayUtils.ExternalCallsStruct;
    tokenPermits: RelayUtils.TokenPermitStruct[];
    fee: RelayUtils.FeeParamsStruct;
    userNonce: BigNumberish;
    deadline: BigNumberish;
    signature: BytesLike;
    desChainId: BigNumberish;
  };

  export type RelayParamsStructOutput = [
    oracleParams: OracleUtils.SetPricesParamsStructOutput,
    externalCalls: RelayUtils.ExternalCallsStructOutput,
    tokenPermits: RelayUtils.TokenPermitStructOutput[],
    fee: RelayUtils.FeeParamsStructOutput,
    userNonce: bigint,
    deadline: bigint,
    signature: string,
    desChainId: bigint,
  ] & {
    oracleParams: OracleUtils.SetPricesParamsStructOutput;
    externalCalls: RelayUtils.ExternalCallsStructOutput;
    tokenPermits: RelayUtils.TokenPermitStructOutput[];
    fee: RelayUtils.FeeParamsStructOutput;
    userNonce: bigint;
    deadline: bigint;
    signature: string;
    desChainId: bigint;
  };
}

export interface MultichainClaimsRouterInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "DOMAIN_SEPARATOR_NAME_HASH"
      | "DOMAIN_SEPARATOR_TYPEHASH"
      | "DOMAIN_SEPARATOR_VERSION_HASH"
      | "claimAffiliateRewards"
      | "claimCollateral"
      | "claimFundingFees"
      | "dataStore"
      | "eventEmitter"
      | "externalHandler"
      | "multicall"
      | "multichainVault"
      | "oracle"
      | "orderHandler"
      | "orderVault"
      | "roleStore"
      | "router"
      | "sendNativeToken"
      | "sendTokens"
      | "sendWnt"
      | "userNonces"
  ): FunctionFragment;

  getEvent(nameOrSignatureOrTopic: "TokenTransferReverted"): EventFragment;

  encodeFunctionData(functionFragment: "DOMAIN_SEPARATOR_NAME_HASH", values?: undefined): string;
  encodeFunctionData(functionFragment: "DOMAIN_SEPARATOR_TYPEHASH", values?: undefined): string;
  encodeFunctionData(functionFragment: "DOMAIN_SEPARATOR_VERSION_HASH", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "claimAffiliateRewards",
    values: [RelayUtils.RelayParamsStruct, AddressLike, BigNumberish, AddressLike[], AddressLike[], AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "claimCollateral",
    values: [
      RelayUtils.RelayParamsStruct,
      AddressLike,
      BigNumberish,
      AddressLike[],
      AddressLike[],
      BigNumberish[],
      AddressLike,
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "claimFundingFees",
    values: [RelayUtils.RelayParamsStruct, AddressLike, BigNumberish, AddressLike[], AddressLike[], AddressLike]
  ): string;
  encodeFunctionData(functionFragment: "dataStore", values?: undefined): string;
  encodeFunctionData(functionFragment: "eventEmitter", values?: undefined): string;
  encodeFunctionData(functionFragment: "externalHandler", values?: undefined): string;
  encodeFunctionData(functionFragment: "multicall", values: [BytesLike[]]): string;
  encodeFunctionData(functionFragment: "multichainVault", values?: undefined): string;
  encodeFunctionData(functionFragment: "oracle", values?: undefined): string;
  encodeFunctionData(functionFragment: "orderHandler", values?: undefined): string;
  encodeFunctionData(functionFragment: "orderVault", values?: undefined): string;
  encodeFunctionData(functionFragment: "roleStore", values?: undefined): string;
  encodeFunctionData(functionFragment: "router", values?: undefined): string;
  encodeFunctionData(functionFragment: "sendNativeToken", values: [AddressLike, BigNumberish]): string;
  encodeFunctionData(functionFragment: "sendTokens", values: [AddressLike, AddressLike, BigNumberish]): string;
  encodeFunctionData(functionFragment: "sendWnt", values: [AddressLike, BigNumberish]): string;
  encodeFunctionData(functionFragment: "userNonces", values: [AddressLike]): string;

  decodeFunctionResult(functionFragment: "DOMAIN_SEPARATOR_NAME_HASH", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "DOMAIN_SEPARATOR_TYPEHASH", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "DOMAIN_SEPARATOR_VERSION_HASH", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "claimAffiliateRewards", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "claimCollateral", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "claimFundingFees", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "dataStore", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "eventEmitter", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "externalHandler", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "multicall", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "multichainVault", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "oracle", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "orderHandler", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "orderVault", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "roleStore", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "router", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "sendNativeToken", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "sendTokens", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "sendWnt", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "userNonces", data: BytesLike): Result;
}

export namespace TokenTransferRevertedEvent {
  export type InputTuple = [reason: string, returndata: BytesLike];
  export type OutputTuple = [reason: string, returndata: string];
  export interface OutputObject {
    reason: string;
    returndata: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export interface MultichainClaimsRouter extends BaseContract {
  connect(runner?: ContractRunner | null): MultichainClaimsRouter;
  waitForDeployment(): Promise<this>;

  interface: MultichainClaimsRouterInterface;

  queryFilter<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;
  queryFilter<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;

  on<TCEvent extends TypedContractEvent>(event: TCEvent, listener: TypedListener<TCEvent>): Promise<this>;
  on<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  once<TCEvent extends TypedContractEvent>(event: TCEvent, listener: TypedListener<TCEvent>): Promise<this>;
  once<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  listeners<TCEvent extends TypedContractEvent>(event: TCEvent): Promise<Array<TypedListener<TCEvent>>>;
  listeners(eventName?: string): Promise<Array<Listener>>;
  removeAllListeners<TCEvent extends TypedContractEvent>(event?: TCEvent): Promise<this>;

  DOMAIN_SEPARATOR_NAME_HASH: TypedContractMethod<[], [string], "view">;

  DOMAIN_SEPARATOR_TYPEHASH: TypedContractMethod<[], [string], "view">;

  DOMAIN_SEPARATOR_VERSION_HASH: TypedContractMethod<[], [string], "view">;

  claimAffiliateRewards: TypedContractMethod<
    [
      relayParams: RelayUtils.RelayParamsStruct,
      account: AddressLike,
      srcChainId: BigNumberish,
      markets: AddressLike[],
      tokens: AddressLike[],
      receiver: AddressLike,
    ],
    [bigint[]],
    "nonpayable"
  >;

  claimCollateral: TypedContractMethod<
    [
      relayParams: RelayUtils.RelayParamsStruct,
      account: AddressLike,
      srcChainId: BigNumberish,
      markets: AddressLike[],
      tokens: AddressLike[],
      timeKeys: BigNumberish[],
      receiver: AddressLike,
    ],
    [bigint[]],
    "nonpayable"
  >;

  claimFundingFees: TypedContractMethod<
    [
      relayParams: RelayUtils.RelayParamsStruct,
      account: AddressLike,
      srcChainId: BigNumberish,
      markets: AddressLike[],
      tokens: AddressLike[],
      receiver: AddressLike,
    ],
    [bigint[]],
    "nonpayable"
  >;

  dataStore: TypedContractMethod<[], [string], "view">;

  eventEmitter: TypedContractMethod<[], [string], "view">;

  externalHandler: TypedContractMethod<[], [string], "view">;

  /**
   * Receives and executes a batch of function calls on this contract.
   */
  multicall: TypedContractMethod<[data: BytesLike[]], [string[]], "payable">;

  multichainVault: TypedContractMethod<[], [string], "view">;

  oracle: TypedContractMethod<[], [string], "view">;

  orderHandler: TypedContractMethod<[], [string], "view">;

  orderVault: TypedContractMethod<[], [string], "view">;

  roleStore: TypedContractMethod<[], [string], "view">;

  router: TypedContractMethod<[], [string], "view">;

  sendNativeToken: TypedContractMethod<[receiver: AddressLike, amount: BigNumberish], [void], "payable">;

  sendTokens: TypedContractMethod<[token: AddressLike, receiver: AddressLike, amount: BigNumberish], [void], "payable">;

  sendWnt: TypedContractMethod<[receiver: AddressLike, amount: BigNumberish], [void], "payable">;

  userNonces: TypedContractMethod<[arg0: AddressLike], [bigint], "view">;

  getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;

  getFunction(nameOrSignature: "DOMAIN_SEPARATOR_NAME_HASH"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "DOMAIN_SEPARATOR_TYPEHASH"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "DOMAIN_SEPARATOR_VERSION_HASH"): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "claimAffiliateRewards"
  ): TypedContractMethod<
    [
      relayParams: RelayUtils.RelayParamsStruct,
      account: AddressLike,
      srcChainId: BigNumberish,
      markets: AddressLike[],
      tokens: AddressLike[],
      receiver: AddressLike,
    ],
    [bigint[]],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "claimCollateral"
  ): TypedContractMethod<
    [
      relayParams: RelayUtils.RelayParamsStruct,
      account: AddressLike,
      srcChainId: BigNumberish,
      markets: AddressLike[],
      tokens: AddressLike[],
      timeKeys: BigNumberish[],
      receiver: AddressLike,
    ],
    [bigint[]],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "claimFundingFees"
  ): TypedContractMethod<
    [
      relayParams: RelayUtils.RelayParamsStruct,
      account: AddressLike,
      srcChainId: BigNumberish,
      markets: AddressLike[],
      tokens: AddressLike[],
      receiver: AddressLike,
    ],
    [bigint[]],
    "nonpayable"
  >;
  getFunction(nameOrSignature: "dataStore"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "eventEmitter"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "externalHandler"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "multicall"): TypedContractMethod<[data: BytesLike[]], [string[]], "payable">;
  getFunction(nameOrSignature: "multichainVault"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "oracle"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "orderHandler"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "orderVault"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "roleStore"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "router"): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "sendNativeToken"
  ): TypedContractMethod<[receiver: AddressLike, amount: BigNumberish], [void], "payable">;
  getFunction(
    nameOrSignature: "sendTokens"
  ): TypedContractMethod<[token: AddressLike, receiver: AddressLike, amount: BigNumberish], [void], "payable">;
  getFunction(
    nameOrSignature: "sendWnt"
  ): TypedContractMethod<[receiver: AddressLike, amount: BigNumberish], [void], "payable">;
  getFunction(nameOrSignature: "userNonces"): TypedContractMethod<[arg0: AddressLike], [bigint], "view">;

  getEvent(
    key: "TokenTransferReverted"
  ): TypedContractEvent<
    TokenTransferRevertedEvent.InputTuple,
    TokenTransferRevertedEvent.OutputTuple,
    TokenTransferRevertedEvent.OutputObject
  >;

  filters: {
    "TokenTransferReverted(string,bytes)": TypedContractEvent<
      TokenTransferRevertedEvent.InputTuple,
      TokenTransferRevertedEvent.OutputTuple,
      TokenTransferRevertedEvent.OutputObject
    >;
    TokenTransferReverted: TypedContractEvent<
      TokenTransferRevertedEvent.InputTuple,
      TokenTransferRevertedEvent.OutputTuple,
      TokenTransferRevertedEvent.OutputObject
    >;
  };
}
