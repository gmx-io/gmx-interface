import { isPermanentRelayError } from "sdk/utils/express";

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

// the relay refused the signed removal or its execution failed, so the subaccount is still registered
export function getIsSubaccountRemovalRelayRejected(error: unknown): boolean {
  return error instanceof SubaccountRemovalRelayFailedError || isPermanentRelayError(error);
}
