import { TradeType } from '@/selectors/trade/types';

export interface TransactionInfo {
  key: string;
  onSentMessage?: string;
  message: string;
  messageDetail?: string;
}

export type PendingTransaction = TransactionInfo & {
  signature: string;
};

export interface TriggerOptions {
  onSuccess?: () => void;
  onError?: () => void;
  disableSendingToast?: boolean;
  disableErrorToast?: boolean;
}

export type PreferredTradeTypePickStrategy = TradeType | 'largestPosition';
