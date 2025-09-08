import type { MultichainFundingHistoryItem } from "domain/multichain/types";

export function isMultichainFundingItemLoading({
  step,
  operation,
  isExecutionError,
}: Pick<MultichainFundingHistoryItem, "step" | "operation" | "isExecutionError">) {
  return (
    (step === "submitted" || step === "sent" || (operation === "deposit" && step === "received")) && !isExecutionError
  );
}
