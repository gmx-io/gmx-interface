export type PendingDepositAction = "send" | "wait" | "drop";

// A deposit clicked before its quote was ready goes out only for the amount, token and route it was clicked for: an edit
// would otherwise open the wallet for the new amount without a click, and a reopened route would send it by itself
export function getPendingDepositAction({
  submittedKey,
  currentKey,
  isRouteUnavailable,
  canSend,
}: {
  submittedKey: string | undefined;
  currentKey: string;
  isRouteUnavailable: boolean;
  canSend: boolean;
}): PendingDepositAction {
  if (isRouteUnavailable || submittedKey !== currentKey) {
    return "drop";
  }

  return canSend ? "send" : "wait";
}
