import { TransactionStatusType } from "components/TransactionStatus/TransactionStatus";
import React, { Dispatch, PropsWithChildren, SetStateAction, useMemo, useState } from "react";
import { createContext, useContextSelector } from "use-context-selector";

export type TransactionResult = {
  hash: string;
  status: TransactionStatusType;
  errorMsg?: string;
};

type MultiTransactionContextType = {
  transactions: { [key: string]: TransactionResult };
  setTransactions: Dispatch<SetStateAction<{ [key: string]: TransactionResult }>>;
};

const MultiTransactionContext = createContext<MultiTransactionContextType | null>(null);

export const MultiTransactionsProvider = ({ children }: PropsWithChildren) => {
  const [transactions, setTransactions] = useState<{ [key: string]: TransactionResult }>({});

  const contextValue = useMemo(() => {
    return {
      transactions,
      setTransactions,
    };
  }, [transactions, setTransactions]);

  return <MultiTransactionContext.Provider value={contextValue}>{children}</MultiTransactionContext.Provider>;
};

export const useMultiTransactions = () => {
  const context = useContextSelector(MultiTransactionContext, (context) => context);

  if (!context) {
    throw new Error("useMultiTransactions must be used within a MultiTransactionsProvider");
  }

  return context;
};
