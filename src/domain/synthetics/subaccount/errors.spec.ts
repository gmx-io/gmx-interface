import { describe, expect, it } from "vitest";

import { GmxRelayError } from "sdk/utils/express";

import {
  getShouldRetrySubaccountRemovalWithWalletTxn,
  SubaccountRemovalRelayFailedError,
  SubaccountRemovalResultUnknownError,
} from "./errors";

describe("getShouldRetrySubaccountRemovalWithWalletTxn", () => {
  it.each([
    ["the relay refused the request", new GmxRelayError("GMX Relay /v1/relay/submit failed: invalid signature", 400)],
    ["the relay is switched off", new GmxRelayError("GMX Relay /v1/relay/submit failed: Service Unavailable", 503)],
    ["the relay errored", new GmxRelayError("GMX Relay /v1/relay/submit failed: Bad Gateway", 502)],
    [
      "the relay rate-limited the request",
      new GmxRelayError("GMX Relay /v1/relay/submit failed: Too Many Requests", 429),
    ],
    ["the relay could not be reached", new GmxRelayError("GMX Relay request failed: fetch failed")],
    ["the relay error reads like a cancellation", new GmxRelayError("GMX Relay task Cancelled", 409)],
    ["the relayed removal reverted", new SubaccountRemovalRelayFailedError("task-1", "execution reverted")],
    ["the relayed removal was cancelled", new SubaccountRemovalRelayFailedError("task-1", "Cancelled")],
    ["the relay result is unknown", new SubaccountRemovalResultUnknownError("task-1", new Error("timeout"))],
    ["the request could not be sent", new Error("No GMX API is configured for chain 42161 in this environment.")],
  ])("is true when %s", (_, error) => {
    expect(getShouldRetrySubaccountRemovalWithWalletTxn(error)).toBe(true);
  });

  it.each([
    ["the signature was rejected in the wallet", new Error("User rejected the request.")],
    ["the signature was denied in the wallet", { code: 4001, message: "User denied transaction signature" }],
  ])("is false when %s", (_, error) => {
    expect(getShouldRetrySubaccountRemovalWithWalletTxn(error)).toBe(false);
  });
});
