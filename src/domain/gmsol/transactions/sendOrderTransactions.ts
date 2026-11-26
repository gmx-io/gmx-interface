import {
  address,
  getBase64Decoder,
  getBase64EncodedWireTransaction,
  getCompiledTransactionMessageEncoder,
  getPublicKeyFromAddress,
  getSignatureFromTransaction,
  getTransactionDecoder,
  getTransactionEncoder,
  isSolanaError,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
  verifySignature,
  type TransactionError as SolanaTransactionError,
  type TransactionMessageBytes,
  type TransactionMessageBytesBase64,
} from "@solana/kit";

import { getIsSolanaNetworkEnabled } from "config/ab";
import { GMSOL_LOOKUP_TABLE_ADDRESSES } from "config/gmsol/lookupTables";
import { GMSOL_STORE_PROGRAM_ID } from "config/gmsol/program";
import { GMSOL_TOKENS } from "config/gmsol/tokens";
import { fetchSolanaBalances } from "lib/solana/balances";
import { copySolanaBytes, isSameSolanaBytes } from "lib/solana/bytes";
import { fetchGmsolLookupTables } from "lib/solana/lookupTables";
import { retryUntilSolanaSlotReached } from "lib/solana/minContextSlot";
import { fetchSolanaMessageFee, fetchSolanaRentExemptMinimums } from "lib/solana/networkCosts";
import { getSolanaRpc } from "lib/solana/rpc";
import { isSolanaTransactionExpired } from "lib/solana/transactionExpiry";

import { fetchSolanaTradingEnabled } from "../fetchSolanaTradingEnabled";
import { WRAPPED_SOL_MINT } from "./addresses";
import { buildGmsolOrderTransactions } from "./buildOrderTransactions";
import { decodeGmsolInstruction } from "./decodeInstruction";
import {
  clearPendingGmsolSubmission,
  getPendingGmsolSubmission,
  setPendingGmsolSubmission,
  GmsolPendingSubmissionError,
  GmsolSubmissionExpiredError,
} from "./pendingSubmission";
import { GMSOL_RENT_ACCOUNT_SIZES, getGmsolSolReserve } from "./solReserve";
import type { GmsolOrderAction, GmsolTransactionPlan } from "./types";
import {
  decodeGmsolTransaction,
  getGmsolGroupLifetime,
  requireGmsol,
  validateGmsolTransactionPlan,
} from "./validateTransaction";
import { validateGmsolWalletTransaction } from "./validateWalletTransaction";
import type { TrackedOrderAction } from "../orderTracking/reduceOrderLifecycle";

const RPC_TIMEOUT_MS = 20_000;
const CONFIRM_TIMEOUT_MS = 90_000;
const RESEND_INTERVAL_MS = 2_000;
const rpcOptions = () => ({ abortSignal: AbortSignal.timeout(RPC_TIMEOUT_MS) });
const WRAPPED_SOL_TOKENS = GMSOL_TOKENS.filter((token) => token.address === WRAPPED_SOL_MINT);

async function fetchWrappedSolBalance(owner: string) {
  const balance = (await fetchSolanaBalances({ owner, tokens: WRAPPED_SOL_TOKENS }))[WRAPPED_SOL_MINT];
  requireGmsol(balance !== undefined, "Missing wallet WSOL balance");
  return balance;
}

async function assertWrappedSolUnchanged(plan: GmsolTransactionPlan) {
  requireGmsol(
    (await fetchWrappedSolBalance(plan.owner)) === plan.wrappedSolBalance,
    "Wallet WSOL balance changed; rebuild the order before wrapping SOL"
  );
}

export async function prepareGmsolOrderTransactions({ owner, action }: { owner: string; action: GmsolOrderAction }) {
  requireGmsol(getIsSolanaNetworkEnabled(), "Solana network is disabled");
  const intent = structuredClone(action);
  const reusesWrappedSol =
    intent.type === "create" &&
    intent.atomic &&
    intent.orders.some(
      (order) =>
        order.payWithNativeSol &&
        (order.kind === "MarketIncrease" || order.kind === "LimitIncrease") &&
        order.collateralDeltaAmount > 0n
    );
  const [lookupTables, { context, value: lifetime }, wrappedSolBalance] = await Promise.all([
    fetchGmsolLookupTables(),
    getSolanaRpc().getLatestBlockhash({ commitment: "confirmed" }).send(rpcOptions()),
    reusesWrappedSol ? fetchWrappedSolBalance(owner) : undefined,
  ]);
  const plan = await buildGmsolOrderTransactions({
    owner,
    action: intent,
    recentBlockhash: lifetime.blockhash,
    lastValidBlockHeight: lifetime.lastValidBlockHeight,
    lookupTables,
    wrappedSolBalance,
  });
  return { ...plan, blockhashSlot: context.slot };
}

const messageOf = (bytes: Uint8Array) =>
  getBase64Decoder().decode(getTransactionDecoder().decode(bytes).messageBytes) as TransactionMessageBytesBase64;

export class GmsolInsufficientSolError extends Error {
  constructor() {
    super("Insufficient SOL for network and keeper fees, rent and wrapping");
    this.name = "GmsolInsufficientSolError";
  }
}

// The runtime refuses a fee or rent the wallet cannot pay, and the System program logs a transfer it cannot fund.
function requireGmsolSimulationSuccess({ err, logs }: { err: SolanaTransactionError | null; logs: string[] | null }) {
  if (err === null) return;
  if (
    err === "InsufficientFundsForFee" ||
    (typeof err === "object" && "InsufficientFundsForRent" in err) ||
    logs?.some((line) => line.includes("Transfer: insufficient lamports"))
  ) {
    throw new GmsolInsufficientSolError();
  }
  throw new Error(`Solana simulation failed: ${JSON.stringify(err)}`);
}

// A blockhash lives 150 blocks, so a signature given after this could no longer land.
const WALLET_PROMPT_TIMEOUT_MS = 120_000;

export class GmsolWalletPromptTimeoutError extends Error {
  constructor() {
    super("Wallet signature request timed out");
    this.name = "GmsolWalletPromptTimeoutError";
  }
}

function withWalletPromptTimeout(prompt: Promise<Uint8Array>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    prompt,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new GmsolWalletPromptTimeoutError()), WALLET_PROMPT_TIMEOUT_MS);
    }),
  ]).finally(() => clearTimeout(timer));
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
  const transactions = plan.groups.flatMap((group, groupIndex) =>
    group.map((candidate) => ({ candidate, groupIndex }))
  );
  const index = transactions.findIndex(({ candidate }) => isSameSolanaBytes(candidate, bytes));
  requireGmsol(index >= 0, "Transaction is not part of the validated plan");
  const { transactionCosts } = await validateGmsolTransactionPlan(plan);
  const { wrapLamports } = transactionCosts[index];
  const later = transactions.slice(index + 1);
  const { lastValidBlockHeight, blockhashSlot } = getGmsolGroupLifetime(plan, transactions[index].groupIndex);
  // A read can reach a node behind this blockhash or the plan's last confirmation, so it requires the later slot.
  const minContextSlot =
    blockhashSlot === undefined || (plan.confirmedSlot !== undefined && plan.confirmedSlot > blockhashSlot)
      ? plan.confirmedSlot
      : blockhashSlot;
  const rpc = getSolanaRpc();
  const transaction = getTransactionDecoder().decode(bytes);
  const [fees, rent, simulation, blockHeight] = await Promise.all([
    Promise.all(
      [bytes, ...later.map(({ candidate }) => candidate)].map((item) =>
        fetchSolanaMessageFee(messageOf(item), minContextSlot)
      )
    ),
    fetchSolanaRentExemptMinimums(GMSOL_RENT_ACCOUNT_SIZES),
    retryUntilSolanaSlotReached(() =>
      rpc
        .simulateTransaction(getBase64EncodedWireTransaction(transaction), {
          encoding: "base64",
          commitment: "confirmed",
          minContextSlot,
          sigVerify: false,
          replaceRecentBlockhash: false,
          accounts: { addresses: [address(plan.owner)], encoding: "base64" },
        })
        .send(rpcOptions())
    ),
    retryUntilSolanaSlotReached(() =>
      rpc.getBlockHeight({ commitment: "confirmed", minContextSlot }).send(rpcOptions())
    ),
    wrapLamports > 0n && plan.wrappedSolBalance !== undefined ? assertWrappedSolUnchanged(plan) : undefined,
  ]);
  requireGmsol(blockHeight <= lastValidBlockHeight, "Transaction blockhash has expired; rebuild before signing");
  requireGmsol(
    fees.every((fee): fee is bigint => fee !== null),
    "Cannot estimate network fees for this blockhash"
  );
  // The simulated balance is after this transaction's fee, rent and transfers; later ones can only be estimated.
  requireGmsolSimulationSuccess(simulation.value);
  const postWallet = simulation.value.accounts?.[0];
  requireGmsol(postWallet, "Simulation did not return the wallet balance");
  const reserve = getGmsolSolReserve(
    later.map((_, offset) => ({ ...transactionCosts[index + 1 + offset], networkFee: fees[offset + 1] })),
    rent
  );
  if (postWallet.lamports < reserve) throw new GmsolInsufficientSolError();
  return {
    slot: simulation.context.slot,
    networkFee: fees[0],
    simulatedWalletBalance: postWallet.lamports,
    wrapLamports,
  };
}

// Only the blockhash changes, so order nonces, accounts and amounts stay exactly as validated and signed for.
async function refreshGmsolGroupLifetimes(plan: GmsolTransactionPlan, fromGroup: number) {
  const { context, value } = await retryUntilSolanaSlotReached(() =>
    getSolanaRpc()
      .getLatestBlockhash({ commitment: "confirmed", minContextSlot: plan.confirmedSlot })
      .send(rpcOptions())
  );
  const lifetime = {
    recentBlockhash: value.blockhash,
    lastValidBlockHeight: value.lastValidBlockHeight,
    blockhashSlot: context.slot,
  };
  for (let groupIndex = fromGroup; groupIndex < plan.groups.length; groupIndex++) {
    const current = { ...plan, ...getGmsolGroupLifetime(plan, groupIndex) };
    plan.groups[groupIndex] = plan.groups[groupIndex].map((bytes) => {
      const { tx, compiled } = decodeGmsolTransaction(bytes, current);
      const messageBytes = getCompiledTransactionMessageEncoder().encode({
        ...compiled,
        lifetimeToken: lifetime.recentBlockhash,
      }) as TransactionMessageBytes;
      const refreshed = copySolanaBytes(getTransactionEncoder().encode({ ...tx, messageBytes }));
      const restored = getCompiledTransactionMessageEncoder().encode({
        ...decodeGmsolTransaction(refreshed, { ...plan, ...lifetime }).compiled,
        lifetimeToken: compiled.lifetimeToken,
      });
      requireGmsol(
        refreshed.length === bytes.length && isSameSolanaBytes(restored, tx.messageBytes),
        "Refreshing the blockhash changed the transaction"
      );
      return refreshed;
    });
    plan.groupLifetimes = { ...plan.groupLifetimes, [groupIndex]: lifetime };
  }
}

async function signGmsolPlanTransaction({
  plan,
  groupIndex,
  index,
  getWalletAddress,
  signTransaction,
}: {
  plan: GmsolTransactionPlan;
  groupIndex: number;
  index: number;
  getWalletAddress: () => string | undefined;
  signTransaction: (bytes: Uint8Array) => Promise<Uint8Array>;
}) {
  const bytes = plan.groups[groupIndex][index];
  const groupPlan = { ...plan, ...getGmsolGroupLifetime(plan, groupIndex) };
  requireGmsol(getWalletAddress() === plan.owner, "Connected Solana wallet changed");
  const { wrapLamports } = await checkGmsolTransactionBeforeSignature({ plan, bytes });
  requireGmsol(await fetchSolanaTradingEnabled(), "Solana trading is disabled");
  requireGmsol(
    getIsSolanaNetworkEnabled() && getWalletAddress() === plan.owner,
    "Solana session changed before signing"
  );
  const signedBytes = await withWalletPromptTimeout(signTransaction(bytes.slice()));
  const { transaction: signed, hasAssertions } = validateGmsolWalletTransaction({
    originalBytes: bytes,
    signedBytes,
    plan: groupPlan,
  });
  const signature = signed.signatures[address(plan.owner)];
  requireGmsol(
    signature &&
      (await verifySignature(await getPublicKeyFromAddress(address(plan.owner)), signature, signed.messageBytes)),
    "Invalid wallet signature"
  );
  const blockHeight = await getSolanaRpc().getBlockHeight({ commitment: "confirmed" }).send(rpcOptions());
  return {
    bytes,
    groupPlan,
    wrapLamports,
    signed,
    hasAssertions,
    expired: blockHeight > groupPlan.lastValidBlockHeight,
  };
}

// Same bytes keep one signature, so at most one copy lands; a rejected copy says nothing about an earlier one.
async function resendSignedTransaction(
  rpc: ReturnType<typeof getSolanaRpc>,
  wire: ReturnType<typeof getBase64EncodedWireTransaction>,
  isPending: () => boolean
) {
  const resend = async () =>
    rpc.sendTransaction(wire, { encoding: "base64", skipPreflight: true, maxRetries: 0n }).send(rpcOptions());
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, RESEND_INTERVAL_MS));
    if (!isPending()) return;
    void resend().catch(() => undefined);
  }
}

/** A broadcast timeout is ambiguous. Reconcile these signatures before constructing a new order. */
export class GmsolTransactionError extends Error {
  readonly wrappedLamports: bigint;

  constructor(
    readonly originalError: unknown,
    readonly submittedSignatures: readonly string[],
    readonly pendingSignature: string | undefined,
    readonly orders: readonly TrackedOrderAction[] = [],
    readonly trackingRequests: readonly GmsolOrderTrackingRequest[] = [],
    readonly failedSignature: string | undefined = undefined,
    readonly confirmedSignatures: readonly string[] = [],
    { wrappedLamports = 0n }: { wrappedLamports?: bigint } = {}
  ) {
    const detail = originalError instanceof Error ? originalError.message : String(originalError);
    super(pendingSignature ? `${detail}; check signature ${pendingSignature} before retrying` : detail);
    this.name = "GmsolTransactionError";
    this.wrappedLamports = wrappedLamports;
  }
}

export type GmsolOrderTrackingRequest = {
  signature: string;
  slot: bigint;
  owner: string;
  orderAddresses: string[];
};

export type GmsolSendResult = {
  signatures: string[];
  slot: bigint;
  refreshErrors: unknown[];
  orders: TrackedOrderAction[];
  trackingErrors: unknown[];
  trackingRequests: GmsolOrderTrackingRequest[];
};

export async function sendGmsolOrderTransactions({
  plan: input,
  getWalletAddress,
  signTransaction,
  onConfirmed,
  onSubmitted,
}: {
  plan: GmsolTransactionPlan;
  getWalletAddress: () => string | undefined;
  signTransaction: (bytes: Uint8Array) => Promise<Uint8Array>;
  onConfirmed: (result: { signature: string; slot: bigint; owner: string }) => Promise<void>;
  onSubmitted?: (result: GmsolSendResult) => void;
}): Promise<GmsolSendResult> {
  const plan = structuredClone(input);
  const signatures: string[] = [];
  const confirmedSignatures: string[] = [];
  let failedSignature: string | undefined;
  const refreshErrors: unknown[] = [];
  const orders: TrackedOrderAction[] = [];
  const trackingErrors: unknown[] = [];
  const trackingRequests: GmsolOrderTrackingRequest[] = [];
  let slot = 0n;
  let wrappedLamports = 0n;
  let pendingSignature: string | undefined;
  let resendingSignature: string | undefined;
  try {
    const pending = getPendingGmsolSubmission(plan.owner);
    if (pending) {
      pendingSignature = pending.signature;
      throw new GmsolPendingSubmissionError(pending.signature);
    }
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
    const positions = plan.groups.flatMap((group, groupIndex) => group.map((_, index) => ({ groupIndex, index })));
    const refreshes: Promise<void>[] = [];
    for (const { groupIndex, index } of positions) {
      // A later group's prompt starts after an earlier prompt and confirmation, so it gets a blockhash of its own.
      if (groupIndex > 0 && index === 0) await refreshGmsolGroupLifetimes(plan, groupIndex);
      const signing = { plan, groupIndex, index, getWalletAddress, signTransaction };
      let attempt = await signGmsolPlanTransaction(signing);
      if (attempt.expired) {
        // Not broadcast or recorded yet, so a fresh blockhash and one more signature cannot duplicate it.
        await refreshGmsolGroupLifetimes(plan, groupIndex);
        attempt = await signGmsolPlanTransaction(signing);
      }
      requireGmsol(!attempt.expired, "Signed transaction expired; rebuild and sign again");
      const { bytes, groupPlan, wrapLamports, signed, hasAssertions } = attempt;
      const rpc = getSolanaRpc();
      const wire = getBase64EncodedWireTransaction(signed);
      if (wrapLamports > 0n && plan.wrappedSolBalance !== undefined) await assertWrappedSolUnchanged(plan);
      if (hasAssertions) {
        const simulation = await rpc
          .simulateTransaction(wire, {
            encoding: "base64",
            commitment: "confirmed",
            sigVerify: true,
            replaceRecentBlockhash: false,
          })
          .send(rpcOptions());
        requireGmsolSimulationSuccess(simulation.value);
      }
      // Read immediately before EVERY first broadcast, including after a slow wallet prompt.
      requireGmsol(await fetchSolanaTradingEnabled(), "Solana trading is disabled");
      requireGmsol(
        getIsSolanaNetworkEnabled() && getWalletAddress() === plan.owner,
        "Solana session changed before sending"
      );
      const expectedSignature = getSignatureFromTransaction(signed);
      const existing = getPendingGmsolSubmission(plan.owner);
      if (existing) {
        pendingSignature = existing.signature;
        throw new GmsolPendingSubmissionError(existing.signature);
      }
      pendingSignature = expectedSignature;
      const { message } = decodeGmsolTransaction(bytes, groupPlan);
      const orderAddresses = [...message.instructions].flatMap((instruction) => {
        if (instruction.programAddress !== GMSOL_STORE_PROGRAM_ID) return [];
        const decoded = decodeGmsolInstruction(
          instruction.data ? copySolanaBytes(instruction.data) : new Uint8Array(),
          (instruction.accounts ?? []).map((account) => account.address)
        );
        return decoded.name === "create_order_v2" ? [decoded.accounts.order] : [];
      });
      setPendingGmsolSubmission(plan.owner, {
        signature: expectedSignature,
        orderAddresses,
        trackExecution:
          plan.action.type === "create" &&
          plan.action.orders.some((order) => order.kind === "MarketIncrease" || order.kind === "MarketDecrease"),
        operation: plan.action.type === "create" && !orderAddresses.length ? "prepare" : plan.action.type,
        lastValidBlockHeight: groupPlan.lastValidBlockHeight.toString(),
        ...(confirmedSignatures.length > 0 && !trackingRequests.length
          ? { confirmedSignatures: [...confirmedSignatures], wrappedLamports: wrappedLamports.toString() }
          : {}),
      });
      requireGmsol(
        getPendingGmsolSubmission(plan.owner)?.signature === expectedSignature,
        "Unable to retain the transaction signature before sending"
      );
      const sent = await rpc
        .sendTransaction(wire, {
          encoding: "base64",
          skipPreflight: false,
          preflightCommitment: "confirmed",
          maxRetries: 0n,
        })
        .send(rpcOptions())
        .catch((error: unknown) => {
          if (isSolanaError(error, SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE)) {
            clearPendingGmsolSubmission(plan.owner, expectedSignature);
            pendingSignature = undefined;
          }
          throw error;
        });
      requireGmsol(sent === expectedSignature, "RPC returned an unexpected transaction signature");
      signatures.push(sent);
      const deadline = Date.now() + CONFIRM_TIMEOUT_MS;
      resendingSignature = sent;
      void resendSignedTransaction(rpc, wire, () => resendingSignature === sent && Date.now() < deadline);
      for (;;) {
        // A failed poll proves nothing about the transaction, so it counts as no status until the deadline.
        const status = await rpc
          .getSignatureStatuses([sent], { searchTransactionHistory: true })
          .send(rpcOptions())
          .then(
            ({ value }) => value[0],
            () => null
          );
        if (status) {
          resendingSignature = undefined;
          if (
            status.err !== null &&
            (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized")
          ) {
            failedSignature = sent;
            pendingSignature = undefined;
            setPendingGmsolSubmission(plan.owner, undefined);
            throw new Error(`Solana transaction failed: ${sent}`);
          }
          if (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized") {
            slot = status.slot;
            plan.confirmedSlot = slot;
            confirmedSignatures.push(sent);
            wrappedLamports += wrapLamports;
            pendingSignature = undefined;
            setPendingGmsolSubmission(plan.owner, undefined);
            if (plan.action.type === "create") {
              // Only track accounts from this confirmed transaction, never another group in the plan.
              const { message } = decodeGmsolTransaction(bytes, groupPlan);
              const orderAddresses: string[] = [];
              for (const instruction of message.instructions) {
                if (instruction.programAddress !== GMSOL_STORE_PROGRAM_ID) continue;
                const decoded = decodeGmsolInstruction(
                  instruction.data ? copySolanaBytes(instruction.data) : new Uint8Array(),
                  (instruction.accounts ?? []).map((account) => account.address)
                );
                if (decoded.name === "create_order_v2") orderAddresses.push(decoded.accounts.order);
              }
              if (orderAddresses.length) {
                const request = { signature: sent, slot, owner: plan.owner, orderAddresses };
                trackingRequests.push(request);
                // Receipt indexing belongs to the asynchronous tracker, not submission confirmation.
              }
            }
            if (confirmedSignatures.length === positions.length) {
              try {
                onSubmitted?.({
                  signatures: [...signatures],
                  slot,
                  refreshErrors,
                  orders,
                  trackingErrors,
                  trackingRequests,
                });
              } catch (error) {
                refreshErrors.push(error);
              }
            }
            // Not awaited here: the next wallet prompt must not wait for the account refresh.
            refreshes.push(
              Promise.resolve({ signature: sent, slot, owner: plan.owner })
                .then(onConfirmed)
                .catch((error: unknown) => {
                  refreshErrors.push(error);
                })
            );
            break;
          }
        }
        if (!status && (await isSolanaTransactionExpired(sent, groupPlan.lastValidBlockHeight).catch(() => false))) {
          clearPendingGmsolSubmission(plan.owner, sent);
          pendingSignature = undefined;
          signatures.pop();
          throw new GmsolSubmissionExpiredError(sent);
        }
        requireGmsol(Date.now() < deadline, `Solana confirmation timed out; check signature ${sent} before retrying`);
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
    }
    await Promise.all(refreshes);
    return { signatures, slot, refreshErrors, orders, trackingErrors, trackingRequests };
  } catch (error) {
    throw new GmsolTransactionError(
      error,
      signatures,
      pendingSignature,
      orders,
      trackingRequests,
      failedSignature,
      confirmedSignatures,
      { wrappedLamports }
    );
  } finally {
    resendingSignature = undefined;
  }
}
