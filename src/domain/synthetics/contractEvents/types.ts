export type OrderEvents = {
  key: string;
  createdTxnHash: string;
  cancelledTxnHash?: string;
  executedTxnHash?: string;
  isViewed?: boolean;
};
