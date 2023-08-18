import { BigNumber } from "ethers";
import { OrderType } from "../../domain/synthetics/orders";

export type SyntheticsEventsContextType = {
  orderStatuses: OrderStatuses;
  depositStatuses: DepositStatuses;
  withdrawalStatuses: WithdrawalStatuses;
  pendingPositionsUpdates: PendingPositionsUpdates;
  positionIncreaseEvents: PositionIncreaseEvent[];
  positionDecreaseEvents: PositionDecreaseEvent[];
  setPendingOrder: SetPendingOrder;
  setPendingPosition: SetPendingPosition;
  setPendingDeposit: SetPendingDeposit;
  setPendingWithdrawal: SetPendingWithdrawal;
  setOrderStatusViewed: (key: string) => void;
  setDepositStatusViewed: (key: string) => void;
  setWithdrawalStatusViewed: (key: string) => void;
};

export type SetPendingOrder = (data: PendingOrderData) => void;
export type SetPendingPosition = (update: PendingPositionUpdate) => void;
export type SetPendingDeposit = (data: PendingDepositData) => void;
export type SetPendingWithdrawal = (data: PendingWithdrawalData) => void;

export type OrderCreatedEventData = {
  key: string;
  account: string;
  receiver: string;
  callbackContract: string;
  marketAddress: string;
  initialCollateralTokenAddress: string;
  swapPath: string[];
  sizeDeltaUsd: BigNumber;
  initialCollateralDeltaAmount: BigNumber;
  contractTriggerPrice: BigNumber;
  contractAcceptablePrice: BigNumber;
  executionFee: BigNumber;
  callbackGasLimit: BigNumber;
  minOutputAmount: BigNumber;
  updatedAtBlock: BigNumber;
  orderType: OrderType;
  isLong: boolean;
  shouldUnwrapNativeToken: boolean;
  isFrozen: boolean;
};

export type PendingOrderData = {
  account: string;
  marketAddress: string;
  initialCollateralTokenAddress: string;
  swapPath: string[];
  initialCollateralDeltaAmount: BigNumber;
  minOutputAmount: BigNumber;
  sizeDeltaUsd: BigNumber;
  isLong: boolean;
  shouldUnwrapNativeToken: boolean;
  orderType: OrderType;
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
  initialLongTokenAmount: BigNumber;
  initialShortTokenAmount: BigNumber;
  minMarketTokens: BigNumber;
  updatedAtBlock: BigNumber;
  executionFee: BigNumber;
  callbackGasLimit: BigNumber;
  shouldUnwrapNativeToken: boolean;
};

export type PendingDepositData = {
  account: string;
  marketAddress: string;
  initialLongTokenAddress: string;
  initialShortTokenAddress: string;
  longTokenSwapPath: string[];
  shortTokenSwapPath: string[];
  initialLongTokenAmount: BigNumber;
  initialShortTokenAmount: BigNumber;
  minMarketTokens: BigNumber;
  shouldUnwrapNativeToken: boolean;
};

export type WithdrawalCreatedEventData = {
  key: string;
  account: string;
  receiver: string;
  callbackContract: string;
  marketAddress: string;
  marketTokenAmount: BigNumber;
  minLongTokenAmount: BigNumber;
  minShortTokenAmount: BigNumber;
  updatedAtBlock: BigNumber;
  executionFee: BigNumber;
  callbackGasLimit: BigNumber;
  shouldUnwrapNativeToken: boolean;
};

export type PendingWithdrawalData = {
  account: string;
  marketAddress: string;
  marketTokenAmount: BigNumber;
  minLongTokenAmount: BigNumber;
  minShortTokenAmount: BigNumber;
  shouldUnwrapNativeToken: boolean;
};

export type MultiTransactionStatus<TEventData> = {
  key: string;
  data: TEventData;
  createdTxnHash: string;
  cancelledTxnHash?: string;
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
  sizeInUsd: BigNumber;
  sizeInTokens: BigNumber;
  collateralAmount: BigNumber;
  borrowingFactor: BigNumber;
  executionPrice: BigNumber;
  sizeDeltaUsd: BigNumber;
  sizeDeltaInTokens: BigNumber;
  longTokenFundingAmountPerSize: BigNumber;
  shortTokenFundingAmountPerSize: BigNumber;
  collateralDeltaAmount: BigNumber;
  isLong: boolean;
  orderType: OrderType;
  orderKey: string;
  increasedAtBlock: BigNumber;
};

export type PositionDecreaseEvent = {
  positionKey: string;
  contractPositionKey: string;
  account: string;
  marketAddress: string;
  collateralTokenAddress: string;
  sizeInUsd: BigNumber;
  sizeInTokens: BigNumber;
  sizeDeltaUsd: BigNumber;
  sizeDeltaInTokens: BigNumber;
  collateralAmount: BigNumber;
  collateralDeltaAmount: BigNumber;
  borrowingFactor: BigNumber;
  longTokenFundingAmountPerSize: BigNumber;
  shortTokenFundingAmountPerSize: BigNumber;
  pnlUsd: BigNumber;
  isLong: boolean;
  orderType: OrderType;
  orderKey: string;
  decreasedAtBlock: BigNumber;
};

export type PendingPositionUpdate = {
  isIncrease: boolean;
  positionKey: string;
  sizeDeltaUsd: BigNumber;
  sizeDeltaInTokens: BigNumber;
  collateralDeltaAmount: BigNumber;
  updatedAt: number;
  updatedAtBlock: BigNumber;
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
  uintItems: EventLogSection<BigNumber>;
  intItems: EventLogSection<BigNumber>;
  boolItems: EventLogSection<boolean>;
  bytes32Items: EventLogSection<string>;
  bytesItems: EventLogSection<string>;
  stringItems: EventLogSection<string>;
};

export type EventTxnParams = {
  transactionHash: string;
  blockNumber: number;
};
