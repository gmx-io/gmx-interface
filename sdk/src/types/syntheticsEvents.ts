import { OrderType } from "./orders";

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
  increasedAtTime: bigint;
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
  decreasedAtTime: bigint;
};

export type PendingPositionUpdate = {
  isIncrease: boolean;
  positionKey: string;
  sizeDeltaUsd: bigint;
  sizeDeltaInTokens: bigint;
  collateralDeltaAmount: bigint;
  updatedAt: number;
  updatedAtTime: bigint;
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
