import { signature as solanaSignature } from "@solana/kit";

import { getIsSolanaNetworkEnabled } from "config/ab";
import { SOLANA_NETWORK_ID } from "config/chains";
import { getSolanaRpc } from "lib/solana/rpc";
import { isSolanaTransactionExpired } from "lib/solana/transactionExpiry";
import { Storage } from "lib/storage/Storage";

export type PendingGmsolSubmission = {
  signature: string;
  orderAddresses: string[];
  trackExecution?: boolean;
  operation: "create" | "update" | "cancel" | "prepare";
  // A decimal string, because the record is JSON; records written before it was stored lack it.
  lastValidBlockHeight?: string;
  // Only after the plan's earlier transactions prepared accounts: their signatures and the lamports they wrapped.
  confirmedSignatures?: string[];
  wrappedLamports?: string;
};

const storage = () => new Storage<Record<string, PendingGmsolSubmission | undefined>>("gmsol-pending-submissions");
const key = (owner: string) => `${SOLANA_NETWORK_ID}:${owner}`;

export function getPendingGmsolSubmission(owner: string) {
  return storage().get(key(owner));
}

export function setPendingGmsolSubmission(owner: string, pending: PendingGmsolSubmission | undefined) {
  storage().set(key(owner), pending);
}

export function clearPendingGmsolSubmission(owner: string, signature: string) {
  if (getPendingGmsolSubmission(owner)?.signature === signature) setPendingGmsolSubmission(owner, undefined);
}

export class GmsolPendingSubmissionError extends Error {
  constructor(readonly pendingSignature: string) {
    super("The previous transaction is not yet confirmed. Check its status before submitting another order.");
    this.name = "GmsolPendingSubmissionError";
  }
}

export class GmsolSubmissionExpiredError extends Error {
  constructor(readonly expiredSignature: string) {
    super("The transaction expired before it landed. Nothing was executed.");
    this.name = "GmsolSubmissionExpiredError";
  }
}

function parsePreparation({ confirmedSignatures, wrappedLamports }: PendingGmsolSubmission) {
  if (confirmedSignatures === undefined && wrappedLamports === undefined) return undefined;
  if (!Array.isArray(confirmedSignatures) || !confirmedSignatures.length || typeof wrappedLamports !== "string") {
    throw new Error("Malformed pending submission");
  }
  return {
    signatures: confirmedSignatures.map((value) => solanaSignature(value)),
    wrappedLamports: BigInt(wrappedLamports),
  };
}

/** An RPC failure or a missing status proves nothing until the blockhash has expired at a finalized block. */
export async function reconcileGmsolSubmission(owner: string) {
  const pending = getPendingGmsolSubmission(owner);
  if (!pending) return undefined;
  if (!getIsSolanaNetworkEnabled()) throw new GmsolPendingSubmissionError(pending.signature);
  let status;
  let preparation;
  try {
    const { value } = await getSolanaRpc()
      .getSignatureStatuses([solanaSignature(pending.signature)], { searchTransactionHistory: true })
      .send({ abortSignal: AbortSignal.timeout(20_000) });
    status = value[0];
    const lastValidBlockHeight =
      pending.lastValidBlockHeight === undefined ? undefined : BigInt(pending.lastValidBlockHeight);
    preparation = parsePreparation(pending);
    if (!status && (await isSolanaTransactionExpired(pending.signature, lastValidBlockHeight))) {
      return { ...pending, preparation, expired: true as const };
    }
  } catch {
    throw new GmsolPendingSubmissionError(pending.signature);
  }
  if (!status || (status.confirmationStatus !== "confirmed" && status.confirmationStatus !== "finalized")) {
    throw new GmsolPendingSubmissionError(pending.signature);
  }
  return { ...pending, preparation, expired: false as const, failed: status.err !== null, slot: status.slot };
}
