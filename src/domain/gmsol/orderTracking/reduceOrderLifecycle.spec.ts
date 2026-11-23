// @vitest-environment node
import { describe, expect, it } from "vitest";

import { GMSOL_STORE_PROGRAM_ID } from "config/gmsol/program";

import fixtures from "./__fixtures__/order-event-fixtures.json";
import { decodeOrderEvents } from "./decodeOrderEvents";
import type { OrderEventFields, OrderEventsResult } from "./decodeOrderEvents";
import { reduceOrderLifecycle } from "./reduceOrderLifecycle";
import type { OrderLifecycleInput } from "./reduceOrderLifecycle";

function transaction(index: number): OrderEventsResult {
  const c = fixtures.cases[index];
  const receipt = JSON.parse(JSON.stringify(c.report.receipt));
  receipt.version = 0;
  receipt.slot = BigInt(receipt.slot);
  for (const group of receipt.meta.innerInstructions) {
    group.index = Number(group.index);
    for (const ix of group.instructions) {
      ix.programIdIndex = Number(ix.programIdIndex);
      ix.accounts = ix.accounts.map(Number);
    }
  }
  return decodeOrderEvents({ network: "solana-mainnet", signature: c.report.signature, slot: receipt.slot, receipt });
}
function input(cancel = false): OrderLifecycleInput {
  const creation = transaction(cancel ? 2 : 0);
  const fields = creation.events[0].fields;
  const params = fields.params as OrderEventFields;
  return {
    action: {
      network: "solana-mainnet",
      program: GMSOL_STORE_PROGRAM_ID,
      store: fields.store as string,
      order: fields.order as string,
      actionId: fields.id as bigint,
      owner: fields.owner as string,
      market: fields.market_token as string,
      position: params.position as string,
      kind: params.kind as string,
      creationSignature: creation.signature,
    },
    submission: "submitted",
    historyComplete: true,
    transactions: [{ result: creation }, { result: transaction(cancel ? 3 : 1) }],
  };
}
// Structural variants below test reducer semantics, not additional observed on-chain cases.
function mutateEvent(request: OrderLifecycleInput, name: string, fields: OrderEventFields) {
  const event = request.transactions[1].result.events.find((e) => e.name === name)!;
  Object.assign(event.fields, fields);
}

describe("offline order lifecycle evidence", () => {
  it("reduces real execution and cancellation while preserving reason and separate submission", () => {
    expect(reduceOrderLifecycle(input())).toMatchObject({
      execution: "executed",
      closure: "closed",
      submission: "submitted",
    });
    expect(reduceOrderLifecycle(input(true))).toMatchObject({
      execution: "cancelled",
      closure: "closed",
      reason: "executed",
    });
    for (const kind of ["MarketSwap", "LimitSwap"]) {
      const swap = input(true);
      swap.action.kind = kind;
      (swap.transactions[0].result.events[0].fields.params as OrderEventFields).kind = kind;
      mutateEvent(swap, "OrderRemoved", { kind, state: "Completed" });
      expect(reduceOrderLifecycle(swap).execution).toBe("closed-without-position-trade");
    }
    const pending = input();
    pending.transactions.pop();
    expect(reduceOrderLifecycle(pending)).toMatchObject({ execution: "unresolved", closure: "pending" });
    pending.transactions[0].result = { ...pending.transactions[0].result, status: "transaction-failed", events: [] };
    expect(reduceOrderLifecycle(pending).submission).toBe("failed");
  });

  it("uses chain order and event locations, deduplicating replay without confusing trade id with action id", () => {
    const request = input();
    request.transactions.reverse();
    request.transactions.push(structuredClone(request.transactions[0]));
    request.transactions[0].result.events.reverse();
    request.transactions[0].result.events = [
      ...request.transactions[0].result.events,
      structuredClone(request.transactions[0].result.events[0]),
    ];
    request.transactions[2].result.events.reverse();
    request.transactions[2].result.events = [
      ...request.transactions[2].result.events,
      structuredClone(request.transactions[2].result.events[0]),
    ];
    expect(reduceOrderLifecycle(request).execution).toBe("executed");
    request.transactions[2].result.events[0].fields.id = 1n;
    expect(reduceOrderLifecycle(request)).toMatchObject({
      execution: "unresolved",
      reason: "Conflicting transaction evidence",
    });
  });

  it("keeps missing, failed, conflicting and incorrectly scoped evidence unresolved", () => {
    const variants: ((r: OrderLifecycleInput) => void)[] = [
      (r) => {
        r.historyComplete = false;
      },
      (r) => {
        r.action.actionId++;
      },
      (r) => {
        r.transactions.shift();
      },
      (r) => {
        r.transactions[1].result.events.splice(0, 1);
      },
      (r) => {
        mutateEvent(r, "OrderRemoved", { state: "Pending" });
      },
      (r) => {
        mutateEvent(r, "OrderRemoved", { state: "Cancelled" });
      },
      (r) => {
        r.transactions[1].result = { ...r.transactions[1].result, status: "transaction-failed", events: [] };
      },
      (r) => {
        r.transactions[1].result = {
          ...r.transactions[1].result,
          status: "unavailable",
          events: [],
          reason: "Missing receipt",
        };
      },
      (r) => {
        const e = structuredClone(r.transactions[1].result.events[0]);
        e.innerIndex++;
        e.fields.trade_id = 999n;
        r.transactions[1].result.events = [...r.transactions[1].result.events, e];
      },
      (r) => {
        r.transactions[1].result.slot = r.transactions[0].result.slot;
      },
    ];
    for (const mutate of variants) {
      const request = input();
      mutate(request);
      expect(reduceOrderLifecycle(request).execution).toBe("unresolved");
    }
  });

  it("handles execute and close in separate transactions without inventing removal", () => {
    const request = input();
    const close = structuredClone(request.transactions[1]);
    close.result.signature = "structural-close";
    close.result.slot++;
    close.result.events = close.result.events.filter((e) => e.name === "OrderRemoved");
    request.transactions[1].result.events = request.transactions[1].result.events.filter(
      (e) => e.name === "TradeEvent"
    );
    expect(reduceOrderLifecycle(request)).toMatchObject({ execution: "executed", closure: "pending" });
    expect(reduceOrderLifecycle(request).removed).toBeUndefined();
    request.transactions.unshift(close);
    expect(reduceOrderLifecycle(request)).toMatchObject({ execution: "executed", closure: "closed" });
  });

  it("isolates reused addresses and unrelated orders, requiring trustworthy same-slot order", () => {
    const request = input();
    const next = structuredClone(request.transactions[0]);
    next.result.signature = "structural-reuse";
    next.result.slot = request.transactions[1].result.slot + 1n;
    next.result.events[0].fields.id = 999n;
    request.transactions.push(next);
    expect(reduceOrderLifecycle(request).execution).toBe("executed");
    next.result.slot = request.transactions[1].result.slot - 1n;
    expect(reduceOrderLifecycle(request).execution).toBe("unresolved");
    next.result.events[0].fields.order = "unrelated";
    expect(reduceOrderLifecycle(request).execution).toBe("executed");
    request.transactions.pop();
    request.transactions[1].result.slot = request.transactions[0].result.slot;
    request.transactions[0].transactionIndex = 2;
    request.transactions[1].transactionIndex = 3;
    expect(reduceOrderLifecycle(request).execution).toBe("executed");
  });
});
