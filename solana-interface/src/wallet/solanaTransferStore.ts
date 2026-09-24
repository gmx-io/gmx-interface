import type { ConnectedStandardSolanaWallet } from "@privy-io/react-auth/solana";
import { useSyncExternalStore } from "react";

import {
  buildSolanaTransfer,
  encodeSolanaSignature,
  type SolanaTransferRequest,
} from "./solanaTransfer";
import { refreshSolanaAssets } from "./useSolanaAssets";
import { getSolanaRpcClient } from "../lib/rpc";

export type SolanaTransferState = {
  phase: "idle" | "awaitingSignature" | "submitted" | "confirmed" | "failed";
  signature?: string;
  message?: string;
};

type SubmitInput = SolanaTransferRequest & {
  wallet: ConnectedStandardSolanaWallet;
};

const listeners = new Set<() => void>();
let state: SolanaTransferState = { phase: "idle" };
let trackId = 0;

function emit(next: SolanaTransferState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Transaction failed";
  }
}

async function track(id: number, signature: string) {
  const connection = getSolanaRpcClient();

  while (id === trackId && state.phase === "submitted" && state.signature === signature) {
    try {
      const { value } = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
      const status = value[0];
      if (id !== trackId) return;

      if (status?.err) {
        emit({ phase: "failed", signature, message: errorMessage(status.err) });
        return;
      }

      if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") {
        emit({ phase: "confirmed", signature });
        refreshSolanaAssets();
        return;
      }
    } catch {
      // ponytail: a status timeout stays submitted and keeps polling. No expiry fail.
    }

    await sleep(2000);
  }
}

async function execute(id: number, input: SubmitInput) {
  try {
    const transaction = await buildSolanaTransfer(input);
    if (id !== trackId) return;
    const result = await input.wallet.signAndSendTransaction({
      transaction,
      chain: "solana:mainnet",
    });
    if (id !== trackId) return;
    const signature = encodeSolanaSignature(result.signature);
    emit({ phase: "submitted", signature });
    void track(id, signature);
  } catch (error) {
    if (id !== trackId) return;
    emit({ phase: "failed", message: errorMessage(error) });
  }
}

export function submitSolanaTransfer(input: SubmitInput) {
  if (state.phase === "awaitingSignature" || state.phase === "submitted") return;
  const id = ++trackId;
  emit({ phase: "awaitingSignature" });
  void execute(id, input);
}

export function useSolanaTransferStatus() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
