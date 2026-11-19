import type { ErrorLike } from "lib/errors";

const TRANSACTION_CANCELLED_CODE = "TRANSACTION_CANCELLED";

export class TransactionCancelledError extends Error {
  readonly code = TRANSACTION_CANCELLED_CODE;

  constructor() {
    super("Transaction cancelled");
    this.name = "TransactionCancelledError";
  }
}

export function isTransactionCancelledError(error: ErrorLike | undefined): boolean {
  return (
    error?.code === TRANSACTION_CANCELLED_CODE ||
    error?.error?.code === TRANSACTION_CANCELLED_CODE ||
    error?.info?.error?.code === TRANSACTION_CANCELLED_CODE
  );
}
