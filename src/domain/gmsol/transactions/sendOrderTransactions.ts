import {
  address,
  getBase64Decoder,
  getBase64EncodedWireTransaction,
  getPublicKeyFromAddress,
  getSignatureFromTransaction,
  getTransactionDecoder,
  verifySignature,
  type TransactionMessageBytesBase64,
} from "@solana/kit";

import { getIsSolanaNetworkEnabled } from "config/ab";
import { GMSOL_LOOKUP_TABLE_ADDRESSES } from "config/gmsol/lookupTables";
import { copySolanaBytes } from "lib/solana/bytes";
import { fetchGmsolLookupTables } from "lib/solana/lookupTables";
import { getSolanaRpc } from "lib/solana/rpc";

import { fetchSolanaTradingEnabled } from "../fetchSolanaTradingEnabled";
import { buildGmsolOrderTransactions } from "./buildOrderTransactions";
import type { GmsolOrderAction, GmsolTransactionPlan } from "./types";
import { requireGmsol, validateGmsolTransactionPlan } from "./validateTransaction";

const RPC_TIMEOUT_MS = 20_000;
const CONFIRM_TIMEOUT_MS = 90_000;
const rpcOptions = () => ({ abortSignal: AbortSignal.timeout(RPC_TIMEOUT_MS) });

export async function prepareGmsolOrderTransactions({ owner, action }: { owner: string; action: GmsolOrderAction }) {
  requireGmsol(getIsSolanaNetworkEnabled(), "Solana network is disabled");
  const intent = structuredClone(action);
  const [lookupTables, { value: lifetime }] = await Promise.all([
    fetchGmsolLookupTables(),
    getSolanaRpc().getLatestBlockhash({ commitment: "confirmed" }).send(rpcOptions()),
  ]);
  return buildGmsolOrderTransactions({
    owner,
    action: intent,
    recentBlockhash: lifetime.blockhash,
    lastValidBlockHeight: lifetime.lastValidBlockHeight,
    lookupTables,
  });
}

/** Real RPC simulation, including the wallet's post-creation SOL balance; never prompts a wallet. */
export async function checkGmsolTransactionBeforeSignature({
  plan,
  bytes,
}: {
  plan: GmsolTransactionPlan;
  bytes: Uint8Array;
}) {
  requireGmsol(getIsSolanaNetworkEnabled(), "Solana network is disabled");
  requireGmsol(
    plan.groups
      .flat()
      .some(
        (candidate) => candidate.length === bytes.length && candidate.every((value, index) => value === bytes[index])
      ),
    "Transaction is not part of the validated plan"
  );
  const { transactionCosts } = await validateGmsolTransactionPlan(plan);
  const index = plan.groups
    .flat()
    .findIndex(
      (candidate) => candidate.length === bytes.length && candidate.every((value, offset) => value === bytes[offset])
    );
  const { keeperLamports, wrapLamports } = transactionCosts[index];
  const rpc = getSolanaRpc();
  const transaction = getTransactionDecoder().decode(bytes);
  const message = getBase64Decoder().decode(transaction.messageBytes) as TransactionMessageBytesBase64;
  const [balance, fee, simulation, blockHeight] = await Promise.all([
    rpc.getBalance(address(plan.owner), { commitment: "confirmed" }).send(rpcOptions()),
    rpc.getFeeForMessage(message, { commitment: "confirmed" }).send(rpcOptions()),
    rpc
      .simulateTransaction(getBase64EncodedWireTransaction(transaction), {
        encoding: "base64",
        commitment: "confirmed",
        sigVerify: false,
        replaceRecentBlockhash: false,
        accounts: { addresses: [address(plan.owner)], encoding: "base64" },
      })
      .send(rpcOptions()),
    rpc.getBlockHeight({ commitment: "confirmed" }).send(rpcOptions()),
  ]);
  requireGmsol(blockHeight <= plan.lastValidBlockHeight, "Transaction blockhash has expired; rebuild before signing");
  requireGmsol(fee.value !== null, "Cannot estimate network fees for this blockhash");
  // The simulation checks rent for every actual account setup, not a guessed fixed rent reserve.
  requireGmsol(simulation.value.err === null, `Solana simulation failed: ${JSON.stringify(simulation.value.err)}`);
  const postWallet = simulation.value.accounts?.[0];
  requireGmsol(postWallet && postWallet.lamports >= 0n, "Simulation did not return the wallet balance");
  // Reserve only this transaction: preceding groups may already have spent their keeper fees.
  requireGmsol(
    balance.value >= fee.value + keeperLamports + wrapLamports,
    "Insufficient SOL for network and keeper fees and wrapping"
  );
  return { slot: simulation.context.slot, networkFee: fee.value, simulatedWalletBalance: postWallet.lamports };
}

/** A broadcast timeout is ambiguous. Reconcile these signatures before constructing a new order. */
export class GmsolTransactionError extends Error {
  constructor(
    readonly originalError: unknown,
    readonly submittedSignatures: readonly string[],
    readonly pendingSignature: string | undefined
  ) {
    const detail = originalError instanceof Error ? originalError.message : String(originalError);
    super(pendingSignature ? `${detail}; check signature ${pendingSignature} before retrying` : detail);
    this.name = "GmsolTransactionError";
  }
}

export type GmsolSendResult = { signatures: string[]; slot: bigint; refreshErrors: unknown[] };

export async function sendGmsolOrderTransactions({
  plan: input,
  getWalletAddress,
  signTransaction,
  onConfirmed,
}: {
  plan: GmsolTransactionPlan;
  getWalletAddress: () => string | undefined;
  signTransaction: (bytes: Uint8Array) => Promise<Uint8Array>;
  onConfirmed: (result: { signature: string; slot: bigint; owner: string }) => Promise<void>;
}): Promise<GmsolSendResult> {
  const plan = structuredClone(input);
  const signatures: string[] = [];
  const refreshErrors: unknown[] = [];
  let slot = 0n;
  let pendingSignature: string | undefined;
  try {
    // Tables are fetched again at the signature boundary; their authority policy and contents must still match.
    const liveTables = await fetchGmsolLookupTables();
    requireGmsol(
      GMSOL_LOOKUP_TABLE_ADDRESSES.every((key) => plan.lookupTables[key]),
      "Configured lookup table contents are missing"
    );
    for (const [key, addresses] of Object.entries(plan.lookupTables)) {
      requireGmsol(
        liveTables[key]?.length === addresses.length &&
          addresses.every((value, index) => liveTables[key][index] === value),
        "Lookup table contents changed; rebuild the transaction"
      );
    }
    for (const bytes of plan.groups.flat()) {
      requireGmsol(getWalletAddress() === plan.owner, "Connected Solana wallet changed");
      await checkGmsolTransactionBeforeSignature({ plan, bytes });
      requireGmsol(await fetchSolanaTradingEnabled(), "Solana trading is disabled");
      requireGmsol(
        getIsSolanaNetworkEnabled() && getWalletAddress() === plan.owner,
        "Solana session changed before signing"
      );
      const signedBytes = await signTransaction(bytes.slice());
      const original = getTransactionDecoder().decode(bytes);
      const signed = getTransactionDecoder().decode(signedBytes);
      const signedMessage = copySolanaBytes(signed.messageBytes);
      const originalMessage = copySolanaBytes(original.messageBytes);
      requireGmsol(
        signedMessage.length === originalMessage.length &&
          signedMessage.every((byte, index) => byte === originalMessage[index]),
        "Wallet returned a different transaction message"
      );
      const signature = signed.signatures[address(plan.owner)];
      requireGmsol(
        signature &&
          (await verifySignature(await getPublicKeyFromAddress(address(plan.owner)), signature, signed.messageBytes)),
        "Invalid wallet signature"
      );
      const rpc = getSolanaRpc();
      requireGmsol(
        (await rpc.getBlockHeight({ commitment: "confirmed" }).send(rpcOptions())) <= plan.lastValidBlockHeight,
        "Signed transaction expired; rebuild and sign again"
      );
      // Read immediately before EVERY send, including after a slow wallet prompt.
      requireGmsol(await fetchSolanaTradingEnabled(), "Solana trading is disabled");
      requireGmsol(
        getIsSolanaNetworkEnabled() && getWalletAddress() === plan.owner,
        "Solana session changed before sending"
      );
      const expectedSignature = getSignatureFromTransaction(signed);
      pendingSignature = expectedSignature;
      const sent = await rpc
        .sendTransaction(getBase64EncodedWireTransaction(signed), {
          encoding: "base64",
          skipPreflight: false,
          preflightCommitment: "confirmed",
          maxRetries: 0n,
        })
        .send(rpcOptions());
      requireGmsol(sent === expectedSignature, "RPC returned an unexpected transaction signature");
      signatures.push(sent);
      const deadline = Date.now() + CONFIRM_TIMEOUT_MS;
      for (;;) {
        const {
          value: [status],
        } = await rpc.getSignatureStatuses([sent], { searchTransactionHistory: true }).send(rpcOptions());
        if (status) {
          requireGmsol(status.err === null, `Solana transaction failed: ${sent}`);
          if (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized") {
            slot = status.slot;
            pendingSignature = undefined;
            try {
              await onConfirmed({ signature: sent, slot, owner: plan.owner });
            } catch (error) {
              refreshErrors.push(error);
            }
            break;
          }
        }
        requireGmsol(Date.now() < deadline, `Solana confirmation timed out; check signature ${sent} before retrying`);
        // Once sent, blockhash expiry does not prove the transaction failed: retain its signature for reconciliation.
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
    }
    return { signatures, slot, refreshErrors };
  } catch (error) {
    throw new GmsolTransactionError(error, signatures, pendingSignature);
  }
}
