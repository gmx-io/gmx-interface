import { PendingTransaction, usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { ErrorLike, parseError } from "lib/errors";
import { useCallback } from "react";

export function useTxnCallbacks() {
  const { setPendingTxns } = usePendingTxns();

  const handleError = useCallback(
    () => (error: ErrorLike) => {
      const errorData = parseError(error);
    },
    []
  );

  const notifyTxnSent = useCallback((txn: PendingTransaction) => {
    setPendingTxns((txns) => [...txns, txn]);
  }, []);

  return {
    notifyTxnSent,
    handleError,
  };
}
