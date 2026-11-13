import { address, signature as solanaSignature } from "@solana/kit";

import { GMSOL_STORE_ADDRESS, GMSOL_STORE_PROGRAM_ID } from "config/gmsol/program";
import { createAnySignal } from "lib/abortSignalHelpers";
import { getSolanaRpc } from "lib/solana/rpc";

import { decodeOrderEvents } from "./decodeOrderEvents";
import { reduceOrderLifecycle, type OrderLifecycleInput, type TrackedOrderAction } from "./reduceOrderLifecycle";

const PAGE_SIZE = 100;
const MAX_HISTORY_TRANSACTIONS = 500;
const RPC_TIMEOUT_MS = 20_000;

export type OrderLifecycleReader = {
  getSignatures: (params: {
    order: string;
    before: string | undefined;
    signal: AbortSignal;
  }) => Promise<readonly { signature: string; slot: bigint; err: unknown }[]>;
  getTransaction: (signature: string, signal: AbortSignal) => Promise<unknown>;
  getBlockSignatures: (slot: bigint, signal: AbortSignal) => Promise<readonly string[] | undefined>;
};

const rpcReader: OrderLifecycleReader = {
  getSignatures: ({ order, before, signal }) =>
    getSolanaRpc()
      .getSignaturesForAddress(address(order), {
        before: before ? solanaSignature(before) : undefined,
        commitment: "confirmed",
        limit: PAGE_SIZE,
      })
      .send({ abortSignal: signal }),
  getTransaction: (signature, signal) =>
    getSolanaRpc()
      .getTransaction(solanaSignature(signature), {
        encoding: "json",
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      })
      .send({ abortSignal: signal }),
  getBlockSignatures: async (slot, signal) => {
    const block = await getSolanaRpc()
      .getBlock(slot, {
        commitment: "confirmed",
        transactionDetails: "signatures",
        rewards: false,
        maxSupportedTransactionVersion: 0,
      })
      .send({ abortSignal: signal });
    return block?.signatures;
  },
};

/** Reads only an order created by this app, bounded at its verified creation signature. */
export async function readOrderLifecycle({
  action,
  signal,
  reader = rpcReader,
}: {
  action: TrackedOrderAction;
  signal: AbortSignal;
  reader?: OrderLifecycleReader;
}) {
  const transactions: OrderLifecycleInput["transactions"] = [];
  let historyComplete = false;
  const unresolved = () => reduceOrderLifecycle({ action, submission: "submitted", historyComplete, transactions });
  if (action.program !== GMSOL_STORE_PROGRAM_ID || action.store !== GMSOL_STORE_ADDRESS) return unresolved();
  const abortSignal = createAnySignal([signal, AbortSignal.timeout(RPC_TIMEOUT_MS)]);
  const seen = new Set<string>();
  let before: string | undefined;
  try {
    const signatures: { signature: string; slot: bigint; err: unknown }[] = [];
    let creationSlot: bigint | undefined;
    while (signatures.length < MAX_HISTORY_TRANSACTIONS) {
      abortSignal.throwIfAborted();
      const page = await reader.getSignatures({ order: action.order, before, signal: abortSignal });
      if (!page.length) {
        historyComplete = creationSlot !== undefined;
        break;
      }
      for (const item of page) {
        if (creationSlot !== undefined && item.slot < creationSlot) {
          historyComplete = true;
          break;
        }
        if (seen.has(item.signature)) return unresolved();
        seen.add(item.signature);
        signatures.push(item);
        if (item.signature === action.creationSignature) {
          creationSlot = item.slot;
        }
      }
      if (page.length < PAGE_SIZE) historyComplete = creationSlot !== undefined;
      if (historyComplete || page.length < PAGE_SIZE) break;
      before = page[page.length - 1].signature;
    }
    if (!historyComplete) return unresolved();
    // Sequential reads bound RPC pressure; the next poll retries missing/index-lagged receipts.
    for (const item of signatures) {
      abortSignal.throwIfAborted();
      const result =
        item.err !== null
          ? {
              network: action.network,
              signature: item.signature,
              slot: item.slot,
              status: "transaction-failed" as const,
              events: [] as [],
            }
          : decodeOrderEvents({
              network: action.network,
              signature: item.signature,
              slot: item.slot,
              receipt: await reader.getTransaction(item.signature, abortSignal),
            });
      transactions.push({ result });
    }
    const bySlot = new Map<bigint, typeof transactions>();
    for (const tx of transactions) {
      if (tx.result.status === "transaction-failed") continue;
      const group = bySlot.get(tx.result.slot) ?? [];
      group.push(tx);
      bySlot.set(tx.result.slot, group);
    }
    for (const [slot, group] of bySlot) {
      if (group.length < 2) continue;
      const blockSignatures = await reader.getBlockSignatures(slot, abortSignal);
      for (const tx of group) {
        const index = blockSignatures?.indexOf(tx.result.signature);
        if (index !== undefined && index >= 0) tx.transactionIndex = index;
      }
    }
    return unresolved();
  } catch (error) {
    if (signal.aborted) throw error;
    // A read failure cannot turn an incomplete lifecycle into a fill or cancellation.
    historyComplete = false;
    return unresolved();
  }
}
