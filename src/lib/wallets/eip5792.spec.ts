import { afterEach, describe, expect, it, vi } from "vitest";

import {
  consumeAtomicBatchingFallbackReason,
  disableAtomicBatchingForSession,
  getAtomicCapabilityQueryKey,
  getAtomicCapabilityStatus,
  isAtomicBatchingDisabledForSession,
  resetAtomicBatchingSessionOverride,
  subscribeToAtomicBatchingSessionOverrides,
} from "./eip5792";

afterEach(() => {
  resetAtomicBatchingSessionOverride();
});

describe("getAtomicCapabilityStatus", () => {
  it.each(["supported", "ready", "unsupported"] as const)("returns the current chain %s status", (status) => {
    expect(
      getAtomicCapabilityStatus(
        {
          42161: { atomic: { status } },
          0: { atomic: { status: "unsupported" } },
        },
        42161
      )
    ).toBe(status);
  });

  it("falls back to the global capability", () => {
    expect(getAtomicCapabilityStatus({ 0: { atomic: { status: "ready" } } }, 42161)).toBe("ready");
  });

  it("resolves the atomic capability globally when the current chain only declares other capabilities", () => {
    expect(
      getAtomicCapabilityStatus(
        {
          42161: {},
          0: { atomic: { status: "supported" } },
        },
        42161
      )
    ).toBe("supported");
  });

  it("prefers a chain-specific atomic capability over the global capability", () => {
    expect(
      getAtomicCapabilityStatus(
        {
          42161: { atomic: { status: "unsupported" } },
          0: { atomic: { status: "supported" } },
        },
        42161
      )
    ).toBe("unsupported");
  });

  it("treats a completed response without the atomic capability as unsupported", () => {
    expect(getAtomicCapabilityStatus({}, 42161)).toBe("unsupported");
    expect(getAtomicCapabilityStatus({ 42161: {} }, 42161)).toBe("unsupported");
  });

  it("returns unknown before a response or for an unrecognized status", () => {
    expect(getAtomicCapabilityStatus(undefined, 42161)).toBe("unknown");
    expect(getAtomicCapabilityStatus({ 42161: { atomic: { status: "invalid" } } }, 42161)).toBe("unknown");
  });
});

describe("getAtomicCapabilityQueryKey", () => {
  it("is scoped to connector, account, and chain without changing address casing", () => {
    expect(
      getAtomicCapabilityQueryKey({
        connectorUid: "metamask-1",
        account: "0xAbCd",
        chainId: 42161,
      })
    ).toEqual(["eip5792AtomicCapability", "metamask-1", "0xAbCd", 42161]);
  });
});

describe("atomic batching session override", () => {
  const key = {
    connectorUid: "metamask-1",
    account: "0xAbCd",
    chainId: 42161,
  };

  it("disables batching only for the matching connector, account, and chain", () => {
    disableAtomicBatchingForSession(key);

    expect(isAtomicBatchingDisabledForSession(key)).toBe(true);
    expect(isAtomicBatchingDisabledForSession({ ...key, connectorUid: "rabby-1" })).toBe(false);
    expect(isAtomicBatchingDisabledForSession({ ...key, account: "0xDcBa" })).toBe(false);
    expect(isAtomicBatchingDisabledForSession({ ...key, chainId: 43114 })).toBe(false);
  });

  it("can reset one override without affecting another", () => {
    const secondKey = { ...key, chainId: 43114 };
    disableAtomicBatchingForSession(key);
    disableAtomicBatchingForSession(secondKey);

    resetAtomicBatchingSessionOverride(key);

    expect(isAtomicBatchingDisabledForSession(key)).toBe(false);
    expect(isAtomicBatchingDisabledForSession(secondKey)).toBe(true);
  });

  it("exposes a fallback reason only for the next explicit fallback", () => {
    disableAtomicBatchingForSession(key, "UserRejected");

    expect(consumeAtomicBatchingFallbackReason(key)).toBe("UserRejected");
    expect(consumeAtomicBatchingFallbackReason(key)).toBeUndefined();
    expect(isAtomicBatchingDisabledForSession(key)).toBe(true);
  });

  it("notifies subscribers only when an override changes", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToAtomicBatchingSessionOverrides(listener);

    disableAtomicBatchingForSession(key);
    disableAtomicBatchingForSession(key);
    resetAtomicBatchingSessionOverride(key);
    resetAtomicBatchingSessionOverride(key);

    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});
