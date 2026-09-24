import { PendingTransaction } from '@/utils/lib/transaction';
import { Dispatch, SetStateAction } from 'react';

export type PendingTxsSetter = Dispatch<SetStateAction<PendingTransaction[]>>;

export interface PendingTransactionsState {
  pendingTxs: PendingTransaction[];
  setPendingTxs: PendingTxsSetter;
}
