import { RawContractOrder } from "domain/synthetics/orders";
import { RawContractDeposit, RawContractWithdrawal } from "../markets";

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

export type ContractEventsContextType = {
  orderStatuses: OrderStatuses;
  depositStatuses: DepositStatuses;
  withdrawalStatuses: WithdrawalStatuses;
  touchOrderStatus: (key: string) => void;
  touchDepositStatus: (key: string) => void;
  touchWithdrawalStatus: (key: string) => void;
};
