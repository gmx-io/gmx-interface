import { useState, useCallback, useEffect } from "react";
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
  const { transactions: multiTransactions, setTransactions } = useMultiTransactions();

  const reset = useCallback(() => {
    setTransactions({});
    setIsProcessing(false);
    setError(null);
  }, [setTransactions]);

  useEffect(() => {
    return () => reset();
  }, [reset]);

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

  const executeTransactions = useCallback(
    async (transactions: TransactionInput[], onSuccess?: () => void) => {
      if (isProcessing || transactions.length === 0) return;

      setIsProcessing(true);
      setError(null);
      setTransactions({});

      for (const transaction of transactions) {
        const { key } = transaction;
        try {
          setTransactions((prevResults) => ({
            ...prevResults,
            [key]: { hash: "", status: "loading" },
          }));
          const hash = await processTransaction(transaction);
          const status = await checkTransactionStatus(hash);
          setTransactions((prevResults) => ({
            ...prevResults,
            [key]: { hash, status },
          }));
        } catch (e) {
          setError(e.message);
          setTransactions((prevResults) => ({
            ...prevResults,
            [key]: { hash: "", status: "error", errorMsg: e.message },
          }));
          break;
        }
      }

      setIsProcessing(false);

      const isCompleted = Object.values(multiTransactions || {}).every((result) => result.status === "success");
      if (isCompleted && onSuccess) {
        onSuccess();
      }
    },
    [isProcessing, processTransaction, checkTransactionStatus, setTransactions, multiTransactions]
  );

  return { executeTransactions, error, reset };
}
