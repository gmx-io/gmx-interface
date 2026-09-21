import useSWR from "swr";
import type { ReplacementReturnType } from "viem";

import { getPublicClientWithRpc } from "lib/wallets/walletConfig";

import type { PendingTransaction } from "./PendingTxnsContext";

export function PendingTxnReplacementTracker({
  transaction,
  chainId,
  onReplaced,
}: {
  transaction: PendingTransaction;
  chainId: number;
  onReplaced: (transaction: PendingTransaction, replacement: ReplacementReturnType) => void;
}) {
  useSWR(
    ["pendingTxnReplacement", chainId, transaction.hash],
    () =>
      getPublicClientWithRpc(chainId).waitForTransactionReceipt({
        hash: transaction.hash,
        timeout: 0,
        onReplaced: (replacement) => onReplaced(transaction, replacement),
      }),
    { refreshInterval: 0, revalidateOnFocus: false }
  );

  return null;
}
