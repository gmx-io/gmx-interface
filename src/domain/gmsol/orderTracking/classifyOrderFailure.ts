import { parseError, type ErrorLike } from "sdk/utils/errors";

import type { SolanaOrderNotificationState } from "components/StatusNotification/SolanaOrderStatusNotification";

import { GmsolPendingSubmissionError, GmsolSubmissionExpiredError } from "../transactions/pendingSubmission";
import { GmsolInsufficientSolError, GmsolTransactionError } from "../transactions/sendOrderTransactions";

type OrderFailureState = Pick<SolanaOrderNotificationState, "submission" | "signatures" | "failure" | "debug">;

export function classifyOrderFailure(error: unknown): OrderFailureState {
  const sendError = error instanceof GmsolTransactionError ? error : undefined;
  const cause = sendError ? sendError.originalError : error;
  const signatures = sendError?.submittedSignatures ?? [];
  const pending = error instanceof GmsolPendingSubmissionError ? error.pendingSignature : sendError?.pendingSignature;
  const failed = sendError?.failedSignature;
  const confirmed = sendError?.confirmedSignatures ?? [];
  const ambiguous =
    failed === undefined && (pending !== undefined || signatures.some((value) => !confirmed.includes(value)));
  const parsed = parseError(cause as ErrorLike);
  return {
    submission: ambiguous ? "unknown" : "failed",
    signatures: failed ? [failed] : pending ? [...signatures, pending] : signatures,
    failure: ambiguous ? undefined : getFailure(sendError, cause, parsed?.isUserRejectedError),
    debug: parsed?.errorMessage,
  };
}

function getFailure(
  sendError: GmsolTransactionError | undefined,
  cause: unknown,
  isUserRejected: boolean | undefined
): OrderFailureState["failure"] {
  // Only the last transaction of a plan places orders, so an earlier confirmed one prepared the accounts.
  if (sendError?.confirmedSignatures.length && !sendError.trackingRequests.length) return "prepared";
  if (cause instanceof GmsolSubmissionExpiredError) return "expired";
  if (cause instanceof GmsolInsufficientSolError) return "insufficientSol";
  if (isUserRejected) return "rejected";
  return undefined;
}
