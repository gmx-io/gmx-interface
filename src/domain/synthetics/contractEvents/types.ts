import { ContractOrder } from "../orders";

export type OrderEvents = {
  key: string;
  orderParams: ContractOrder;
  createdTxnHash: string;
  cancelledTxnHash?: string;
  executedTxnHash?: string;
  isViewed?: boolean;
};
