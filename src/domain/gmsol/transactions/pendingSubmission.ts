import { signature as solanaSignature } from "@solana/kit";

import { getIsSolanaNetworkEnabled } from "config/ab";
import { SOLANA_NETWORK_ID } from "config/chains";
import { getSolanaRpc } from "lib/solana/rpc";
import { Storage } from "lib/storage/Storage";

export type PendingGmsolSubmission = {
  signature: string;
  orderAddresses: string[];
  trackExecution?: boolean;
  operation: "create" | "update" | "cancel" | "prepare";
};

const storage = () => new Storage<Record<string, PendingGmsolSubmission | undefined>>("gmsol-pending-submissions");
const key = (owner: string) => `${SOLANA_NETWORK_ID}:${owner}`;

export function getPendingGmsolSubmission(owner: string) {
  return storage().get(key(owner));
}

export function setPendingGmsolSubmission(owner: string, pending: PendingGmsolSubmission | undefined) {
  storage().set(key(owner), pending);
}

export class GmsolPendingSubmissionError extends Error {
  constructor(readonly pendingSignature: string) {
    super("The previous transaction is not yet confirmed. Check its status before submitting another order.");
    this.name = "GmsolPendingSubmissionError";
  }
}

/** Missing history, an RPC failure and blockhash expiry cannot prove a broadcast failed. */
export async function reconcileGmsolSubmission(owner: string) {
  const pending = getPendingGmsolSubmission(owner);
  if (!pending) return undefined;
  if (!getIsSolanaNetworkEnabled()) throw new GmsolPendingSubmissionError(pending.signature);
  let status;
  try {
    const { value } = await getSolanaRpc()
      .getSignatureStatuses([solanaSignature(pending.signature)], { searchTransactionHistory: true })
      .send({ abortSignal: AbortSignal.timeout(20_000) });
    status = value[0];
  } catch {
    throw new GmsolPendingSubmissionError(pending.signature);
  }
  if (!status || (status.confirmationStatus !== "confirmed" && status.confirmationStatus !== "finalized")) {
    throw new GmsolPendingSubmissionError(pending.signature);
  }
  return { ...pending, failed: status.err !== null, slot: status.slot };
}
