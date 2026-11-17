import { type ErrorLike, parseError } from "lib/errors";
import { GmxRelayError } from "sdk/utils/express";

export class SubaccountRemovalResultUnknownError extends Error {
  name = "SubaccountRemovalResultUnknownError";

  constructor(
    public taskId: string,
    public reason: unknown
  ) {
    super(`Could not confirm the remove subaccount relay task ${taskId}`);
  }
}

export class SubaccountRemovalRelayFailedError extends Error {
  name = "SubaccountRemovalRelayFailedError";

  constructor(
    public taskId: string,
    reason: string | undefined
  ) {
    super(`Remove subaccount transaction failed: ${reason ?? "reverted"}`);
  }
}

// only a rejected signature is worth asking for again, any other failure of the signed removal
// (relay down or refusing it, failed or unconfirmed execution) moves the next attempt to the wallet transaction
export function getShouldRetrySubaccountRemovalWithWalletTxn(error: unknown): boolean {
  if (
    error instanceof GmxRelayError ||
    error instanceof SubaccountRemovalRelayFailedError ||
    error instanceof SubaccountRemovalResultUnknownError
  ) {
    return true;
  }

  return !parseError(error as ErrorLike)?.isUserRejectedError;
}
