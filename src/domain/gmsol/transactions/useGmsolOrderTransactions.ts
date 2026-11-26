import { useCallback, useSyncExternalStore } from "react";
import { mutate } from "swr";

import { SOLANA_NETWORK_ID } from "config/chains";
import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { getSolanaBalancesKey } from "domain/gmsol/useGmsolWalletBalances";
import {
  getActiveSolanaSession,
  getActiveSolanaSigner,
  subscribeActiveSolanaSession,
  type ActiveSolanaSession,
} from "lib/solana/activeSession";
import { useSolanaWalletSession } from "lib/wallets/solanaWalletSession";
import type { GmxApiSdk } from "sdk/clients/v2";

import { refreshGmsolAccountDataAfterTransaction } from "../useGmsolAccountData";
import {
  clearPendingGmsolSubmission,
  getPendingGmsolSubmission,
  GmsolPendingSubmissionError,
  GmsolSubmissionExpiredError,
  reconcileGmsolSubmission,
  setPendingGmsolSubmission,
  type GmsolSubmissionOrigin,
} from "./pendingSubmission";
import {
  GmsolTransactionError,
  prepareGmsolOrderTransactions,
  sendGmsolOrderTransactions,
  type GmsolSendResult,
} from "./sendOrderTransactions";
import type { GmsolOrderAction } from "./types";
import { requireGmsol } from "./validateTransaction";

type SubmitOptions = { origin?: GmsolSubmissionOrigin; onSubmitted: (result: GmsolSendResult) => void };

export type GmsolOrderSubmission = {
  owner: string;
  isActive: () => boolean;
  submit: (action: GmsolOrderAction | undefined, options?: SubmitOptions) => Promise<GmsolSendResult>;
  release: () => void;
};

// The TradeBox and the order actions mount separately, and only one of them may prompt the wallet at a time.
let submitting = false;
const listeners = new Set<() => void>();

function setSubmitting(value: boolean) {
  submitting = value;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getIsGmsolOrderSubmitting() {
  return submitting;
}

async function submitGmsolOrder(
  session: ActiveSolanaSession,
  sdk: GmxApiSdk,
  action: GmsolOrderAction | undefined,
  options: SubmitOptions | undefined
): Promise<GmsolSendResult> {
  const { owner } = session;
  const isActive = () => getActiveSolanaSession() === session;
  if (action) {
    const pending = getPendingGmsolSubmission(owner);
    if (pending) throw new GmsolPendingSubmissionError(pending.signature);
    const plan = await prepareGmsolOrderTransactions({ owner, action });
    requireGmsol(isActive(), "Solana order session changed before signing");
    return sendGmsolOrderTransactions({
      plan,
      origin: options?.origin,
      getWalletAddress: () => (isActive() ? owner : undefined),
      signTransaction: async (bytes) => {
        const signTransaction = getActiveSolanaSigner();
        requireGmsol(isActive() && signTransaction, "Connected Solana wallet changed");
        return signTransaction(bytes);
      },
      onSubmitted: (result) => {
        if (isActive()) options?.onSubmitted(result);
      },
      onConfirmed: async ({ slot }) => {
        requireGmsol(slot <= BigInt(Number.MAX_SAFE_INTEGER), "Confirmation slot exceeds API precision");
        await Promise.all([
          mutate(getSolanaBalancesKey(SOLANA_NETWORK_ID, owner)),
          refreshGmsolAccountDataAfterTransaction(sdk, owner, Number(slot)),
        ]);
      },
    });
  }

  const previous = await reconcileGmsolSubmission(owner);
  requireGmsol(isActive(), "Solana order session changed");
  requireGmsol(previous, "No valid order to submit");
  const { preparation } = previous;
  // Shaped like the sender's error when a preparation lands but its orders do not: the toast says accounts are ready.
  const prepared = (
    error: Error,
    confirmed: string[],
    failed?: string,
    { ownWrapLamports = 0n }: { ownWrapLamports?: bigint } = {}
  ) =>
    new GmsolTransactionError(
      error,
      failed ? [...confirmed, failed] : confirmed,
      undefined,
      [],
      [],
      failed,
      confirmed,
      { wrappedLamports: (preparation?.wrappedLamports ?? 0n) + ownWrapLamports }
    );
  if (previous.expired) {
    clearPendingGmsolSubmission(owner, previous.signature);
    const expired = new GmsolSubmissionExpiredError(previous.signature);
    throw preparation ? prepared(expired, preparation.signatures) : expired;
  }
  if (previous.failed || previous.operation === "prepare") setPendingGmsolSubmission(owner, undefined);
  if (previous.failed) {
    const failed = new Error("The previous transaction failed. Review the order before submitting again.");
    throw preparation ? prepared(failed, preparation.signatures, previous.signature) : failed;
  }
  if (previous.operation === "prepare") {
    const error = new Error("Previous account preparation confirmed. Submit the order again.");
    throw prepared(error, [...(preparation?.signatures ?? []), previous.signature], undefined, {
      ownWrapLamports: previous.ownWrapLamports,
    });
  }
  requireGmsol(previous.slot <= BigInt(Number.MAX_SAFE_INTEGER), "Confirmation slot exceeds API precision");
  const refreshErrors: unknown[] = [];
  await Promise.all([
    mutate(getSolanaBalancesKey(SOLANA_NETWORK_ID, owner)),
    refreshGmsolAccountDataAfterTransaction(sdk, owner, Number(previous.slot)),
  ]).catch((error) => refreshErrors.push(error));
  requireGmsol(isActive(), "Solana order session changed");
  setPendingGmsolSubmission(owner, undefined);
  const result: GmsolSendResult = {
    signatures: [previous.signature],
    slot: previous.slot,
    refreshErrors,
    orders: [],
    trackingErrors: [],
    trackingRequests: previous.orderAddresses.length
      ? [{ signature: previous.signature, slot: previous.slot, owner, orderAddresses: previous.orderAddresses }]
      : [],
  };
  options?.onSubmitted(result);
  return result;
}

/** Lazy Solana adapter for the shared order-entry/editor consumers (FESOL-19). */
export function useGmsolOrderTransactions() {
  const sdk = useGmxSdk(SOLANA_NETWORK_ID);
  const wallet = useSolanaWalletSession();
  const isSubmitting = useSyncExternalStore(subscribe, getIsGmsolOrderSubmitting);

  // Synchronous, so a caller it refuses has neither shown a toast nor opened the wallet.
  const acquire = useCallback(
    (owner: string | undefined): GmsolOrderSubmission | undefined => {
      const session = getActiveSolanaSession();
      if (submitting || !sdk || !owner || session?.owner !== owner || !getActiveSolanaSigner()) return undefined;
      setSubmitting(true);
      let isReleased = false;
      // A flow whose owner or network changed can no longer sign or send, so a stuck prompt stops blocking others.
      const stopWatchingSession = subscribeActiveSolanaSession(() => {
        if (getActiveSolanaSession() !== session) release();
      });
      const release = () => {
        if (isReleased) return;
        isReleased = true;
        stopWatchingSession();
        setSubmitting(false);
      };

      return {
        owner,
        isActive: () => getActiveSolanaSession() === session,
        submit: async (action, options) => {
          requireGmsol(!isReleased, "Solana order submission already ended");
          return submitGmsolOrder(session, sdk, action, options);
        },
        release,
      };
    },
    [sdk]
  );

  return {
    acquire,
    isSubmitting,
    hasPendingSubmission: Boolean(wallet.address && getPendingGmsolSubmission(wallet.address)),
  };
}
