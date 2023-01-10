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

export type AbstractStatusEvents<TOrderType> = {
  key: string;
  data: TOrderType;
  createdTxnHash: string;
  cancelledTxnHash?: string;
  executedTxnHash?: string;
  isTouched?: boolean;
};

export type OrderStatusEvents = AbstractStatusEvents<RawContractOrder>;
export type DepositStatusEvents = AbstractStatusEvents<RawContractDeposit>;
export type WithdrawalStatusEvents = AbstractStatusEvents<RawContractWithdrawal>;

export type PositionUpdate = {
  isIncrease: boolean;
  positionKey: string;
  updatedAt?: number;
  updatedAtBlock?: BigNumber;
  sizeDeltaUsd?: BigNumber;
  collateralDeltaAmount?: BigNumber;
};

export type EventTxnParams = {
  transactionHash: string;
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
