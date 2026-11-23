import { GMSOL_STORE_PROGRAM_ID } from "config/gmsol/program";

import type { DecodedOrderEvent, OrderEventFields, OrderEventsResult } from "./decodeOrderEvents";

export type TrackedOrderAction = {
  network: "solana-mainnet";
  program: string;
  store: string;
  order: string;
  actionId: bigint;
  owner: string;
  market: string;
  position: string | null;
  kind: string;
  creationSignature: string;
};
export type OrderLifecycleInput = {
  action: TrackedOrderAction;
  submission: "sending" | "submitted" | "failed";
  // The caller attests coverage from creation through the supplied observation horizon.
  historyComplete: boolean;
  transactions: { result: OrderEventsResult; transactionIndex?: number }[];
};
type Evidence = { signature: string; event: DecodedOrderEvent };
export type OrderLifecycleResult = {
  action: TrackedOrderAction;
  submission: OrderLifecycleInput["submission"];
  execution: "unresolved" | "executed" | "cancelled" | "closed-without-position-trade";
  closure: "unresolved" | "pending" | "closed";
  reason?: string;
  trade?: Evidence;
  removed?: Evidence;
};

function canonical(value: unknown): string {
  if (typeof value === "bigint") return `bigint:${value}`;
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${canonical(v)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Reduces explicit decoder evidence only; never scans RPC or owns application state. */
export function reduceOrderLifecycle(input: OrderLifecycleInput): OrderLifecycleResult {
  const { action } = input;
  // A failed keeper transaction does not change the creation submission status.
  const creationFailed = input.transactions.some(
    ({ result }) =>
      result.network === action.network &&
      result.signature === action.creationSignature &&
      result.status === "transaction-failed"
  );
  const submission = creationFailed ? "failed" : input.submission;
  const unresolved = (reason: string): OrderLifecycleResult => ({
    action,
    submission,
    execution: "unresolved",
    closure: "unresolved",
    reason,
  });
  if (action.program !== GMSOL_STORE_PROGRAM_ID) return unresolved("Unsupported program");
  if (!input.historyComplete) return unresolved("Incomplete lifecycle history");
  const transactions = new Map<string, OrderLifecycleInput["transactions"][number]>();
  for (const tx of input.transactions) {
    if (tx.result.network !== action.network) continue;
    if (tx.transactionIndex !== undefined && (!Number.isSafeInteger(tx.transactionIndex) || tx.transactionIndex < 0)) {
      return unresolved("Invalid transaction order");
    }
    const previous = transactions.get(tx.result.signature);
    if (previous && canonical(previous) !== canonical(tx)) return unresolved("Conflicting transaction evidence");
    transactions.set(tx.result.signature, tx);
  }
  const relevant = [...transactions.values()].filter(({ result }) => {
    if (result.status === "invalid" || result.status === "unavailable") return true;
    return result.events.some(({ fields }) => fields.store === action.store && fields.order === action.order);
  });
  if (relevant.some(({ result }) => result.status !== "decoded")) return unresolved("Unavailable transaction evidence");
  for (let i = 0; i < relevant.length; i++) {
    for (let j = i + 1; j < relevant.length; j++) {
      const a = relevant[i],
        b = relevant[j];
      if (
        a.result.slot === b.result.slot &&
        (a.transactionIndex === undefined ||
          b.transactionIndex === undefined ||
          a.transactionIndex === b.transactionIndex)
      ) {
        return unresolved("Ambiguous same-slot transaction order");
      }
    }
  }
  relevant.sort((a, b) =>
    a.result.slot < b.result.slot ? -1 : a.result.slot > b.result.slot ? 1 : a.transactionIndex! - b.transactionIndex!
  );
  const events: Evidence[] = [];
  for (const { result } of relevant) {
    const locations = new Map<string, DecodedOrderEvent>();
    for (const event of result.events) {
      const key = `${event.outerIndex}:${event.innerIndex}`;
      const previous = locations.get(key);
      if (previous && canonical(previous) !== canonical(event)) return unresolved("Conflicting event location");
      locations.set(key, event);
    }
    events.push(
      ...[...locations.values()]
        .sort((a, b) => a.outerIndex - b.outerIndex || a.innerIndex - b.innerIndex)
        .filter(({ fields }) => fields.store === action.store && fields.order === action.order)
        .map((event) => ({ signature: result.signature, event }))
    );
  }
  let started = false;
  let ended = false;
  let trade: Evidence | undefined;
  let removed: Evidence | undefined;
  const matchesContext = (fields: OrderEventFields, isTrade = false) =>
    fields.market_token === action.market && fields[isTrade ? "user" : "owner"] === action.owner;
  for (const evidence of events) {
    const { name, fields } = evidence.event;
    if (ended) continue;
    if (!started) {
      if (
        name !== "OrderUpdated" ||
        !fields.is_create ||
        fields.id !== action.actionId ||
        evidence.signature !== action.creationSignature
      )
        continue;
      started = true;
    } else if (
      name === "OrderCreated" ||
      (name === "OrderUpdated" && fields.is_create === true) ||
      ((name === "OrderUpdated" || name === "OrderRemoved") && fields.id !== action.actionId)
    ) {
      ended = true;
      continue;
    }
    if (name === "OrderUpdated") {
      const params = fields.params as OrderEventFields;
      if (!matchesContext(fields) || params.position !== action.position || params.kind !== action.kind) {
        return unresolved("Order context mismatch");
      }
      if (removed) return unresolved("Order update after closure");
    } else if (name === "TradeEvent") {
      if (!matchesContext(fields, true) || fields.position !== action.position)
        return unresolved("Trade context mismatch");
      if (trade || removed) return unresolved("Conflicting lifecycle trades");
      trade = evidence;
    } else if (name === "OrderRemoved") {
      if (!matchesContext(fields) || fields.kind !== action.kind) return unresolved("Removal context mismatch");
      if (removed) return unresolved("Multiple lifecycle removals");
      removed = evidence;
    }
  }
  if (!started) return unresolved("Missing action creation");
  if (submission === "failed") return unresolved("Failed submission conflicts with creation evidence");
  if (removed) {
    const { state, reason } = removed.event.fields;
    if (state === "Cancelled" && !trade) {
      return { action, submission, execution: "cancelled", closure: "closed", removed, reason: reason as string };
    }
    if (state !== "Completed") return unresolved("Conflicting removal state");
    if (trade)
      return { action, submission, execution: "executed", closure: "closed", trade, removed, reason: reason as string };
    if (action.kind === "MarketSwap" || action.kind === "LimitSwap") {
      return {
        action,
        submission,
        execution: "closed-without-position-trade",
        closure: "closed",
        removed,
        reason: reason as string,
      };
    }
    return unresolved("Completed position order missing trade");
  }
  if (ended) return unresolved("Lifecycle ended without removal evidence");
  if (trade) return { action, submission, execution: "executed", closure: "pending", trade };
  return { action, submission, execution: "unresolved", closure: "pending", reason: "Awaiting execution evidence" };
}
