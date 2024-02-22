import { TransactionStatusType } from "components/TransactionStatus/TransactionStatus";
import React, { Dispatch, PropsWithChildren, SetStateAction, useMemo, useState } from "react";
import { createContext, useContextSelector } from "use-context-selector";

export type TransactionResult = {
  hash: string;
  status: TransactionStatusType;
  errorMsg?: string;
};

type MultiTransactionsContext = {
  transactions: { [key: string]: TransactionResult };
  setTransactions: Dispatch<SetStateAction<{ [key: string]: TransactionResult }>>;
};

const MultiTransactionsContext = createContext<MultiTransactionsContext | null>(null);

export const MultiTransactionsProvider = ({ children }: PropsWithChildren) => {
  const [transactions, setTransactions] = useState<{ [key: string]: TransactionResult }>({});

  const value = useMemo(() => {
    return {
      transactions,
      setTransactions,
    };
  }, [transactions, setTransactions]);

  return <MultiTransactionsContext.Provider value={value}>{children}</MultiTransactionsContext.Provider>;
};

export const useMultiTransactions = () => {
  const context = useContextSelector(MultiTransactionsContext, (context) => context);

  if (!context) {
    throw new Error("useMultiTransactions must be used within a MultiTransactionsProvider");
  }

  return context;
};
