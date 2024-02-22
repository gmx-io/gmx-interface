import { useState, useCallback } from "react";
import { callContract } from "../contracts/callContract";
import useWallet from "../../lib/wallets/useWallet";
import { Contract } from "ethers";
import { TransactionStatusType } from "components/TransactionStatus/TransactionStatus";
import { useMultiTransactions } from "context/MultiTransactionsContext/MultiTransactionsProvider";

export type TransactionInput = {
  key: string;
  chainId: number;
  contract: Contract;
  method: string;
  params: any[];
  opts: {
    hideSentMsg?: boolean;
    hideSuccessMsg?: boolean;
  };
};

export type TransactionResult = {
  hash: string;
  status: TransactionStatusType;
  errorMsg?: string;
};

export function useSequentialTransactions() {
  const { signer } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { transactions, setTransactions } = useMultiTransactions();

  const processTransaction = useCallback(
    async (transaction: TransactionInput): Promise<string> => {
      if (!signer) {
        throw new Error("Signer not available");
      }
      const res = await callContract(
        transaction.chainId,
        transaction.contract,
        transaction.method,
        transaction.params,
        transaction.opts
      );
      return res.hash;
    },
    [signer]
  );

  const checkTransactionStatus = useCallback(
    async (hash: string): Promise<"success" | "error"> => {
      if (!hash || !signer || !signer.provider) {
        throw new Error("Transaction hash or signer provider not available");
      }
      const txReceipt = await signer.provider.waitForTransaction(hash);
      return txReceipt && txReceipt.status === 1 ? "success" : "error";
    },
    [signer]
  );

  const updateTransactionState = useCallback(
    (key: string, hash: string, status: TransactionStatusType, errorMsg?: string) => {
      setTransactions((prevResults) => ({
        ...prevResults,
        [key]: { hash, status, errorMsg },
      }));
    },
    [setTransactions]
  );

  const executeTransactions = useCallback(
    async (txs: TransactionInput[], onSuccess?: () => void) => {
      if (isProcessing || txs.length === 0) return;

      setIsProcessing(true);
      setError(null);
      setTransactions({});

      for (const tx of txs) {
        const { key } = tx;
        try {
          updateTransactionState(key, "", "loading");
          const hash = await processTransaction(tx);
          const status = await checkTransactionStatus(hash);
          updateTransactionState(key, hash, status);
        } catch (e) {
          setError(e.message);
          updateTransactionState(key, "", "error", e.message);
          break;
        }
      }

      setIsProcessing(false);

      const isCompleted = Object.values(transactions || {}).every((result) => result.status === "success");
      if (isCompleted && onSuccess) {
        onSuccess();
      }
    },
    [isProcessing, processTransaction, checkTransactionStatus, setTransactions, transactions, updateTransactionState]
  );

  return { executeTransactions, error };
}
