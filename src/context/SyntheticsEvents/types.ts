import { OrderType, OrderTxnType } from "../../domain/synthetics/orders";

export type SyntheticsEventsContextType = {
  orderStatuses: OrderStatuses;
  depositStatuses: DepositStatuses;
  withdrawalStatuses: WithdrawalStatuses;
  pendingPositionsUpdates: PendingPositionsUpdates;
  positionIncreaseEvents: PositionIncreaseEvent[] | undefined;
  positionDecreaseEvents: PositionDecreaseEvent[] | undefined;
  setPendingOrder: SetPendingOrder;
  setPendingFundingFeeSettlement: SetPendingFundingFeeSettlement;
  setPendingPosition: SetPendingPosition;
  setPendingDeposit: SetPendingDeposit;
  setPendingWithdrawal: SetPendingWithdrawal;
  setOrderStatusViewed: (key: string) => void;
  setDepositStatusViewed: (key: string) => void;
  setWithdrawalStatusViewed: (key: string) => void;
};

export type SetPendingOrder = (data: PendingOrderData | PendingOrderData[]) => void;
export type SetPendingPosition = (update: PendingPositionUpdate) => void;
export type SetPendingDeposit = (data: PendingDepositData) => void;
export type SetPendingWithdrawal = (data: PendingWithdrawalData) => void;
export type SetPendingFundingFeeSettlement = (data: PendingFundingFeeSettlementData) => void;

export type PendingFundingFeeSettlementData = {
  orders: PendingOrderData[];
  positions: PendingPositionUpdate[];
};

export type OrderCreatedEventData = {
  key: string;
  account: string;
  receiver: string;
  callbackContract: string;
  marketAddress: string;
  initialCollateralTokenAddress: string;
  swapPath: string[];
  sizeDeltaUsd: bigint;
  initialCollateralDeltaAmount: bigint;
  contractTriggerPrice: bigint;
  contractAcceptablePrice: bigint;
  executionFee: bigint;
  callbackGasLimit: bigint;
  minOutputAmount: bigint;
  updatedAtBlock: bigint;
  orderType: OrderType;
  isLong: boolean;
  shouldUnwrapNativeToken: boolean;
  isFrozen: boolean;
};

export type PendingOrderData = {
  orderKey?: string;
  account: string;
  marketAddress: string;
  initialCollateralTokenAddress: string;
  swapPath: string[];
  initialCollateralDeltaAmount: bigint;
  minOutputAmount: bigint;
  sizeDeltaUsd: bigint;
  isLong: boolean;
  shouldUnwrapNativeToken: boolean;
  orderType: OrderType;
  txnType: OrderTxnType;
};

export type DepositCreatedEventData = {
  key: string;
  account: string;
  receiver: string;
  callbackContract: string;
  marketAddress: string;
  initialLongTokenAddress: string;
  initialShortTokenAddress: string;
  longTokenSwapPath: string[];
  shortTokenSwapPath: string[];
  initialLongTokenAmount: bigint;
  initialShortTokenAmount: bigint;
  minMarketTokens: bigint;
  updatedAtBlock: bigint;
  executionFee: bigint;
  callbackGasLimit: bigint;
  shouldUnwrapNativeToken: boolean;
};

export type PendingDepositData = {
  account: string;
  marketAddress: string;
  initialLongTokenAddress: string;
  initialShortTokenAddress: string;
  longTokenSwapPath: string[];
  shortTokenSwapPath: string[];
  initialLongTokenAmount: bigint;
  initialShortTokenAmount: bigint;
  minMarketTokens: bigint;
  shouldUnwrapNativeToken: boolean;
};

export type WithdrawalCreatedEventData = {
  key: string;
  account: string;
  receiver: string;
  callbackContract: string;
  marketAddress: string;
  marketTokenAmount: bigint;
  minLongTokenAmount: bigint;
  minShortTokenAmount: bigint;
  updatedAtBlock: bigint;
  executionFee: bigint;
  callbackGasLimit: bigint;
  shouldUnwrapNativeToken: boolean;
};

export type PendingWithdrawalData = {
  account: string;
  marketAddress: string;
  marketTokenAmount: bigint;
  minLongTokenAmount: bigint;
  minShortTokenAmount: bigint;
  shouldUnwrapNativeToken: boolean;
};

export type MultiTransactionStatus<TEventData> = {
  key: string;
  data?: TEventData;
  createdTxnHash?: string;
  cancelledTxnHash?: string;
  updatedTxnHash?: string;
  executedTxnHash?: string;
  createdAt: number;
  isViewed?: boolean;
};

export type OrderStatus = MultiTransactionStatus<OrderCreatedEventData>;
export type DepositStatus = MultiTransactionStatus<DepositCreatedEventData>;
export type WithdrawalStatus = MultiTransactionStatus<WithdrawalCreatedEventData>;

export type PositionIncreaseEvent = {
  positionKey: string;
  contractPositionKey: string;
  account: string;
  marketAddress: string;
  collateralTokenAddress: string;
  sizeInUsd: bigint;
  sizeInTokens: bigint;
  collateralAmount: bigint;
  borrowingFactor: bigint;
  executionPrice: bigint;
  sizeDeltaUsd: bigint;
  sizeDeltaInTokens: bigint;
  longTokenFundingAmountPerSize: bigint;
  shortTokenFundingAmountPerSize: bigint;
  collateralDeltaAmount: bigint;
  isLong: boolean;
  orderType: OrderType;
  orderKey: string;
  increasedAtBlock: bigint;
};

export type PositionDecreaseEvent = {
  positionKey: string;
  contractPositionKey: string;
  account: string;
  marketAddress: string;
  collateralTokenAddress: string;
  sizeInUsd: bigint;
  sizeInTokens: bigint;
  sizeDeltaUsd: bigint;
  sizeDeltaInTokens: bigint;
  collateralAmount: bigint;
  collateralDeltaAmount: bigint;
  borrowingFactor: bigint;
  longTokenFundingAmountPerSize: bigint;
  shortTokenFundingAmountPerSize: bigint;
  pnlUsd: bigint;
  isLong: boolean;
  orderType: OrderType;
  orderKey: string;
  decreasedAtBlock: bigint;
};

export type PendingPositionUpdate = {
  isIncrease: boolean;
  positionKey: string;
  sizeDeltaUsd: bigint;
  sizeDeltaInTokens: bigint;
  collateralDeltaAmount: bigint;
  updatedAt: number;
  updatedAtBlock: bigint;
};

export type OrderStatuses = {
  [key: string]: OrderStatus;
};

export type DepositStatuses = {
  [key: string]: DepositStatus;
};

export type WithdrawalStatuses = {
  [key: string]: WithdrawalStatus;
};

export type PendingPositionsUpdates = {
  [key: string]: PendingPositionUpdate | undefined;
};

export type EventLogItems<T> = {
  [key: string]: T;
};

export type EventLogArrayItems<T> = {
  [key: string]: T[];
};

export type EventLogSection<T> = {
  items: EventLogItems<T>;
  arrayItems: EventLogArrayItems<T>;
};

export type EventLogData = {
  addressItems: EventLogSection<string>;
  uintItems: EventLogSection<bigint>;
  intItems: EventLogSection<bigint>;
  boolItems: EventLogSection<boolean>;
  bytes32Items: EventLogSection<string>;
  bytesItems: EventLogSection<string>;
  stringItems: EventLogSection<string>;
};

export type EventTxnParams = {
  transactionHash: string;
  blockNumber: number;
};
