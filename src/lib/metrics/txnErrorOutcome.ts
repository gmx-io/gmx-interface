import { type ErrorLike, parseError } from "lib/errors";

export function getTxnErrorOutcome(error: unknown): "rejected" | "failed" {
  return parseError(error as ErrorLike)?.isUserRejectedError ? "rejected" : "failed";
}
