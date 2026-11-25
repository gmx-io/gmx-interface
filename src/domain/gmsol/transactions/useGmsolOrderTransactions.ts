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
} from "./pendingSubmission";
import {
  prepareGmsolOrderTransactions,
  sendGmsolOrderTransactions,
  type GmsolSendResult,
} from "./sendOrderTransactions";
import type { GmsolOrderAction } from "./types";
import { requireGmsol } from "./validateTransaction";

type SubmitOptions = { onSubmitted: (result: GmsolSendResult) => void };

export type GmsolOrderSubmission = {
  owner: string;
  // False once the owner or the network changed, even if it changed back.
  isActive: () => boolean;
  // An action is signed and sent; undefined only checks the unresolved earlier submission.
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
  if (previous.expired) {
    clearPendingGmsolSubmission(owner, previous.signature);
    throw new GmsolSubmissionExpiredError(previous.signature);
  }
  if (previous.failed || previous.operation === "prepare") setPendingGmsolSubmission(owner, undefined);
  requireGmsol(!previous.failed, "The previous transaction failed. Review the order before submitting again.");
  requireGmsol(previous.operation !== "prepare", "Previous account preparation confirmed. Submit the order again.");
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
