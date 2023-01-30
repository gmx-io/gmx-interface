import { RawContractOrder } from "domain/synthetics/orders";
import { RawContractDeposit, RawContractWithdrawal } from "../markets";
import { BigNumber } from "ethers";

export type ContractEventsContextType = {
  orderStatuses: OrderStatuses;
  depositStatuses: DepositStatuses;
  withdrawalStatuses: WithdrawalStatuses;
  pendingPositionsUpdates: PositionsUpdates;
  positionsUpdates: PositionsUpdates;
  touchOrderStatus: (key: string) => void;
  touchDepositStatus: (key: string) => void;
  touchWithdrawalStatus: (key: string) => void;
  setPendingPositionUpdate: (update: PositionUpdate) => void;
};

export type KeyValueEventData = {
  addressItems: {
    items: { [key: string]: string };
    arrayItems: { [key: string]: string[] };
  };
  uintItems: {
    items: { [key: string]: BigNumber };
    arrayItems: { [key: string]: BigNumber[] };
  };
  intItems: {
    items: { [key: string]: BigNumber };
    arrayItems: { [key: string]: BigNumber[] };
  };
  boolItems: {
    items: { [key: string]: boolean };
    arrayItems: { [key: string]: boolean[] };
  };
  bytes32Items: {
    items: { [key: string]: string };
    arrayItems: { [key: string]: string[] };
  };
  bytesItems: {
    items: { [key: string]: string };
    arrayItems: { [key: string]: string[] };
  };
  stringItems: {
    items: { [key: string]: string };
    arrayItems: { [key: string]: string[] };
  };
};

export type AbstractStatusEvents<TOrderType> = {
  key: string;
  data: TOrderType;
  createdTxnHash: string;
  cancelledTxnHash?: string;
  executedTxnHash?: string;
  isTouched?: boolean;
};

export type OrderStatusEvents = AbstractStatusEvents<any>;
export type DepositStatusEvents = AbstractStatusEvents<any>;
export type WithdrawalStatusEvents = AbstractStatusEvents<any>;

export type PositionUpdate = {
  isIncrease: boolean;
  positionKey: string;
  updatedAt?: number;
  updatedAtBlock?: number;
  sizeDeltaUsd?: BigNumber;
  sizeDeltaInTokens?: BigNumber;
  collateralDeltaAmount?: BigNumber;
};

export type EventTxnParams = {
  transactionHash: string;
  blockNumber: number;
};

export type OrderStatuses = {
  [key: string]: OrderStatusEvents;
};

export type DepositStatuses = {
  [key: string]: DepositStatusEvents;
};

export type WithdrawalStatuses = {
  [key: string]: WithdrawalStatusEvents;
};

export type PositionsUpdates = {
  [key: string]: PositionUpdate | undefined;
};
