import { useContext } from 'react';
import { PendingTransactionsStateContext } from '.';

export const usePending = () => {
  const ctx = useContext(PendingTransactionsStateContext);
  if (!ctx) {
    throw new Error('used outside `PendingTransactionsStateProvider`');
  }
  return ctx;
};
