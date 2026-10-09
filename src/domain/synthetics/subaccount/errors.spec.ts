import { describe, expect, it } from "vitest";

import { GmxRelayError } from "sdk/utils/express";

import {
  getIsSubaccountRemovalRelayRejected,
  SubaccountRemovalRelayFailedError,
  SubaccountRemovalResultUnknownError,
} from "./errors";

describe("getIsSubaccountRemovalRelayRejected", () => {
  it.each([
    ["the relay refused the request", new GmxRelayError("GMX Relay /v1/relay/submit failed: invalid signature", 400)],
    ["the relayed removal failed", new SubaccountRemovalRelayFailedError("task-1", "execution reverted")],
  ])("is true when %s", (_, error) => {
    expect(getIsSubaccountRemovalRelayRejected(error)).toBe(true);
  });

  it.each([
    ["the relay result is unknown", new SubaccountRemovalResultUnknownError("task-1", new Error("timeout"))],
    ["the relay could not be reached", new GmxRelayError("GMX Relay request failed: fetch failed")],
    ["the relay errored", new GmxRelayError("GMX Relay /v1/relay/submit failed: Bad Gateway", 502)],
    [
      "the relay rate-limited the request",
      new GmxRelayError("GMX Relay /v1/relay/submit failed: Too Many Requests", 429),
    ],
    ["the signature was rejected in the wallet", new Error("User rejected the request.")],
  ])("is false when %s", (_, error) => {
    expect(getIsSubaccountRemovalRelayRejected(error)).toBe(false);
  });
});
