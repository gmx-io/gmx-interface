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

export declare namespace IBaseOrderUtils {
  export type CreateOrderParamsAddressesStruct = {
    receiver: AddressLike;
    cancellationReceiver: AddressLike;
    callbackContract: AddressLike;
    uiFeeReceiver: AddressLike;
    market: AddressLike;
    initialCollateralToken: AddressLike;
    swapPath: AddressLike[];
  };

  export type CreateOrderParamsAddressesStructOutput = [
    receiver: string,
    cancellationReceiver: string,
    callbackContract: string,
    uiFeeReceiver: string,
    market: string,
    initialCollateralToken: string,
    swapPath: string[],
  ] & {
    receiver: string;
    cancellationReceiver: string;
    callbackContract: string;
    uiFeeReceiver: string;
    market: string;
    initialCollateralToken: string;
    swapPath: string[];
  };

  export type CreateOrderParamsNumbersStruct = {
    sizeDeltaUsd: BigNumberish;
    initialCollateralDeltaAmount: BigNumberish;
    triggerPrice: BigNumberish;
    acceptablePrice: BigNumberish;
    executionFee: BigNumberish;
    callbackGasLimit: BigNumberish;
    minOutputAmount: BigNumberish;
    validFromTime: BigNumberish;
  };

  export type CreateOrderParamsNumbersStructOutput = [
    sizeDeltaUsd: bigint,
    initialCollateralDeltaAmount: bigint,
    triggerPrice: bigint,
    acceptablePrice: bigint,
    executionFee: bigint,
    callbackGasLimit: bigint,
    minOutputAmount: bigint,
    validFromTime: bigint,
  ] & {
    sizeDeltaUsd: bigint;
    initialCollateralDeltaAmount: bigint;
    triggerPrice: bigint;
    acceptablePrice: bigint;
    executionFee: bigint;
    callbackGasLimit: bigint;
    minOutputAmount: bigint;
    validFromTime: bigint;
  };

  export type CreateOrderParamsStruct = {
    addresses: IBaseOrderUtils.CreateOrderParamsAddressesStruct;
    numbers: IBaseOrderUtils.CreateOrderParamsNumbersStruct;
    orderType: BigNumberish;
    decreasePositionSwapType: BigNumberish;
    isLong: boolean;
    shouldUnwrapNativeToken: boolean;
    autoCancel: boolean;
    referralCode: BytesLike;
    dataList: BytesLike[];
  };

  export type CreateOrderParamsStructOutput = [
    addresses: IBaseOrderUtils.CreateOrderParamsAddressesStructOutput,
    numbers: IBaseOrderUtils.CreateOrderParamsNumbersStructOutput,
    orderType: bigint,
    decreasePositionSwapType: bigint,
    isLong: boolean,
    shouldUnwrapNativeToken: boolean,
    autoCancel: boolean,
    referralCode: string,
    dataList: string[],
  ] & {
    addresses: IBaseOrderUtils.CreateOrderParamsAddressesStructOutput;
    numbers: IBaseOrderUtils.CreateOrderParamsNumbersStructOutput;
    orderType: bigint;
    decreasePositionSwapType: bigint;
    isLong: boolean;
    shouldUnwrapNativeToken: boolean;
    autoCancel: boolean;
    referralCode: string;
    dataList: string[];
  };
}

export interface SubaccountRouterInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "addSubaccount"
      | "cancelOrder"
      | "createOrder"
      | "dataStore"
      | "eventEmitter"
      | "multicall"
      | "orderHandler"
      | "orderVault"
      | "removeSubaccount"
      | "roleStore"
      | "router"
      | "sendNativeToken"
      | "sendTokens"
      | "sendWnt"
      | "setMaxAllowedSubaccountActionCount"
      | "setSubaccountAutoTopUpAmount"
      | "setSubaccountExpiresAt"
      | "updateOrder"
  ): FunctionFragment;

  getEvent(nameOrSignatureOrTopic: "TokenTransferReverted"): EventFragment;

  encodeFunctionData(functionFragment: "addSubaccount", values: [AddressLike]): string;
  encodeFunctionData(functionFragment: "cancelOrder", values: [BytesLike]): string;
  encodeFunctionData(
    functionFragment: "createOrder",
    values: [AddressLike, IBaseOrderUtils.CreateOrderParamsStruct]
  ): string;
  encodeFunctionData(functionFragment: "dataStore", values?: undefined): string;
  encodeFunctionData(functionFragment: "eventEmitter", values?: undefined): string;
  encodeFunctionData(functionFragment: "multicall", values: [BytesLike[]]): string;
  encodeFunctionData(functionFragment: "orderHandler", values?: undefined): string;
  encodeFunctionData(functionFragment: "orderVault", values?: undefined): string;
  encodeFunctionData(functionFragment: "removeSubaccount", values: [AddressLike]): string;
  encodeFunctionData(functionFragment: "roleStore", values?: undefined): string;
  encodeFunctionData(functionFragment: "router", values?: undefined): string;
  encodeFunctionData(functionFragment: "sendNativeToken", values: [AddressLike, BigNumberish]): string;
  encodeFunctionData(functionFragment: "sendTokens", values: [AddressLike, AddressLike, BigNumberish]): string;
  encodeFunctionData(functionFragment: "sendWnt", values: [AddressLike, BigNumberish]): string;
  encodeFunctionData(
    functionFragment: "setMaxAllowedSubaccountActionCount",
    values: [AddressLike, BytesLike, BigNumberish]
  ): string;
  encodeFunctionData(functionFragment: "setSubaccountAutoTopUpAmount", values: [AddressLike, BigNumberish]): string;
  encodeFunctionData(
    functionFragment: "setSubaccountExpiresAt",
    values: [AddressLike, BytesLike, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "updateOrder",
    values: [BytesLike, BigNumberish, BigNumberish, BigNumberish, BigNumberish, BigNumberish, boolean]
  ): string;

  decodeFunctionResult(functionFragment: "addSubaccount", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "cancelOrder", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "createOrder", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "dataStore", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "eventEmitter", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "multicall", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "orderHandler", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "orderVault", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "removeSubaccount", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "roleStore", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "router", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "sendNativeToken", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "sendTokens", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "sendWnt", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setMaxAllowedSubaccountActionCount", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setSubaccountAutoTopUpAmount", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setSubaccountExpiresAt", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "updateOrder", data: BytesLike): Result;
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

export interface SubaccountRouter extends BaseContract {
  connect(runner?: ContractRunner | null): SubaccountRouter;
  waitForDeployment(): Promise<this>;

  interface: SubaccountRouterInterface;

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

  addSubaccount: TypedContractMethod<[subaccount: AddressLike], [void], "payable">;

  cancelOrder: TypedContractMethod<[key: BytesLike], [void], "payable">;

  createOrder: TypedContractMethod<
    [account: AddressLike, params: IBaseOrderUtils.CreateOrderParamsStruct],
    [string],
    "payable"
  >;

  dataStore: TypedContractMethod<[], [string], "view">;

  eventEmitter: TypedContractMethod<[], [string], "view">;

  multicall: TypedContractMethod<[data: BytesLike[]], [string[]], "payable">;

  orderHandler: TypedContractMethod<[], [string], "view">;

  orderVault: TypedContractMethod<[], [string], "view">;

  removeSubaccount: TypedContractMethod<[subaccount: AddressLike], [void], "payable">;

  roleStore: TypedContractMethod<[], [string], "view">;

  router: TypedContractMethod<[], [string], "view">;

  sendNativeToken: TypedContractMethod<[receiver: AddressLike, amount: BigNumberish], [void], "payable">;

  sendTokens: TypedContractMethod<[token: AddressLike, receiver: AddressLike, amount: BigNumberish], [void], "payable">;

  sendWnt: TypedContractMethod<[receiver: AddressLike, amount: BigNumberish], [void], "payable">;

  setMaxAllowedSubaccountActionCount: TypedContractMethod<
    [subaccount: AddressLike, actionType: BytesLike, maxAllowedCount: BigNumberish],
    [void],
    "payable"
  >;

  setSubaccountAutoTopUpAmount: TypedContractMethod<[subaccount: AddressLike, amount: BigNumberish], [void], "payable">;

  setSubaccountExpiresAt: TypedContractMethod<
    [subaccount: AddressLike, actionType: BytesLike, expiresAt: BigNumberish],
    [void],
    "payable"
  >;

  updateOrder: TypedContractMethod<
    [
      key: BytesLike,
      sizeDeltaUsd: BigNumberish,
      acceptablePrice: BigNumberish,
      triggerPrice: BigNumberish,
      minOutputAmount: BigNumberish,
      validFromTime: BigNumberish,
      autoCancel: boolean,
    ],
    [void],
    "payable"
  >;

  getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;

  getFunction(nameOrSignature: "addSubaccount"): TypedContractMethod<[subaccount: AddressLike], [void], "payable">;
  getFunction(nameOrSignature: "cancelOrder"): TypedContractMethod<[key: BytesLike], [void], "payable">;
  getFunction(
    nameOrSignature: "createOrder"
  ): TypedContractMethod<[account: AddressLike, params: IBaseOrderUtils.CreateOrderParamsStruct], [string], "payable">;
  getFunction(nameOrSignature: "dataStore"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "eventEmitter"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "multicall"): TypedContractMethod<[data: BytesLike[]], [string[]], "payable">;
  getFunction(nameOrSignature: "orderHandler"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "orderVault"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "removeSubaccount"): TypedContractMethod<[subaccount: AddressLike], [void], "payable">;
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
  getFunction(
    nameOrSignature: "setMaxAllowedSubaccountActionCount"
  ): TypedContractMethod<
    [subaccount: AddressLike, actionType: BytesLike, maxAllowedCount: BigNumberish],
    [void],
    "payable"
  >;
  getFunction(
    nameOrSignature: "setSubaccountAutoTopUpAmount"
  ): TypedContractMethod<[subaccount: AddressLike, amount: BigNumberish], [void], "payable">;
  getFunction(
    nameOrSignature: "setSubaccountExpiresAt"
  ): TypedContractMethod<[subaccount: AddressLike, actionType: BytesLike, expiresAt: BigNumberish], [void], "payable">;
  getFunction(
    nameOrSignature: "updateOrder"
  ): TypedContractMethod<
    [
      key: BytesLike,
      sizeDeltaUsd: BigNumberish,
      acceptablePrice: BigNumberish,
      triggerPrice: BigNumberish,
      minOutputAmount: BigNumberish,
      validFromTime: BigNumberish,
      autoCancel: boolean,
    ],
    [void],
    "payable"
  >;

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
