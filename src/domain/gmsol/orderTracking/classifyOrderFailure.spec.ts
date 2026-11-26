import { describe, expect, it } from "vitest";

import { classifyOrderFailure } from "./classifyOrderFailure";
import { GmsolPendingSubmissionError, GmsolSubmissionExpiredError } from "../transactions/pendingSubmission";
import { GmsolInsufficientSolError, GmsolTransactionError } from "../transactions/sendOrderTransactions";

const placed = [{ signature: "orders", slot: 1n, owner: "owner", orderAddresses: ["order"] }];
const sent = (
  cause: unknown,
  signatures: string[] = [],
  p: { pending?: string; failed?: string; confirmed?: string[]; requests?: typeof placed } = {}
) => new GmsolTransactionError(cause, signatures, p.pending, [], p.requests, p.failed, p.confirmed);
const rejection = Object.assign(new Error("Signature declined"), { code: 4001 });
const expired = new GmsolSubmissionExpiredError("orders");
const chainFailure = new Error("Solana transaction failed: orders");
const setup = { confirmed: ["setup"] };

describe("Solana order failure classification", () => {
  it.each([
    ["a wallet rejection", sent(rejection), "failed", "rejected", []],
    ["a rejection after the setup confirmed", sent(rejection, ["setup"], setup), "failed", "prepared", ["setup"]],
    [
      "a rejection after an order transaction confirmed",
      sent(rejection, ["orders"], { confirmed: ["orders"], requests: placed }),
      "failed",
      "rejected",
      ["orders"],
    ],
    ["an expired order transaction", sent(expired), "failed", "expired", []],
    ["an expired earlier submission", expired, "failed", "expired", []],
    ["an expiry after the setup confirmed", sent(expired, ["setup"], setup), "failed", "prepared", ["setup"]],
    ["an expiry with a pending signature", sent(expired, [], { pending: "orders" }), "unknown", undefined, ["orders"]],
    ["insufficient SOL", sent(new GmsolInsufficientSolError()), "failed", "insufficientSol", []],
    ["an on-chain failure", sent(chainFailure, ["orders"], { failed: "orders" }), "failed", undefined, ["orders"]],
    [
      "an on-chain failure after the setup confirmed",
      sent(chainFailure, ["setup", "orders"], { ...setup, failed: "orders" }),
      "failed",
      "prepared",
      ["orders"],
    ],
    [
      "an ambiguous broadcast",
      sent(new Error("fetch failed"), ["setup"], { ...setup, pending: "orders" }),
      "unknown",
      undefined,
      ["setup", "orders"],
    ],
    [
      "a confirmation timeout",
      sent(new Error("Solana confirmation timed out"), ["orders"], { pending: "orders" }),
      "unknown",
      undefined,
      ["orders", "orders"],
    ],
    ["a pending earlier submission", new GmsolPendingSubmissionError("orders"), "unknown", undefined, ["orders"]],
    ["a plain error", new Error("The previous transaction failed. Review the order."), "failed", undefined, []],
  ] as const)("classifies %s", (_, error, submission, failure, signatures) => {
    const state = classifyOrderFailure(error);
    expect([state.submission, state.failure, state.signatures]).toEqual([submission, failure, signatures]);
  });
});
