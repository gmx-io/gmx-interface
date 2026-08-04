import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  consumeAtomicBatchingFallbackReason,
  isAtomicBatchingDisabledForSession,
  resetAtomicBatchingSessionOverride,
} from "lib/wallets/eip5792";

import { sendWalletCalls } from "./sendWalletCalls";

const { mocks, ACCOUNT, CONNECTOR, CHAIN_ID } = vi.hoisted(() => ({
  mocks: {
    getAccount: vi.fn(),
    getCallsStatus: vi.fn(),
    sendCalls: vi.fn(),
    waitForCallsStatus: vi.fn(),
    pushBatchApprovalAnalyticsEvent: vi.fn(),
  },
  ACCOUNT: "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa" as const,
  CONNECTOR: { uid: "connector-1", name: "Test Wallet" },
  CHAIN_ID: 42161,
}));

vi.mock("@wagmi/core", () => ({
  getAccount: mocks.getAccount,
  getCallsStatus: mocks.getCallsStatus,
  sendCalls: mocks.sendCalls,
  waitForCallsStatus: mocks.waitForCallsStatus,
}));

vi.mock("lib/wallets/walletConfig", () => ({
  getWagmiConfig: () => ({ chains: [{ id: CHAIN_ID }] }),
}));

vi.mock("lib/userAnalytics/batchApprovalAnalytics", () => ({
  pushBatchApprovalAnalyticsEvent: mocks.pushBatchApprovalAnalyticsEvent,
}));

const analytics = {
  source: "Classic" as const,
  chainId: CHAIN_ID,
  capabilityStatus: "supported" as const,
  tokenCount: 1,
  walletProvider: CONNECTOR.name,
};

const calls = [
  {
    to: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB" as const,
    data: "0x1234" as const,
    value: 0n,
  },
];

const sessionKey = {
  connectorUid: CONNECTOR.uid,
  account: ACCOUNT,
  chainId: CHAIN_ID,
};

describe("sendWalletCalls", () => {
  beforeEach(() => {
    mocks.getAccount.mockReturnValue({ address: ACCOUNT, connector: CONNECTOR });
    mocks.sendCalls.mockResolvedValue({ id: "bundle-1" });
    mocks.pushBatchApprovalAnalyticsEvent.mockResolvedValue(undefined);
  });

  afterEach(() => {
    resetAtomicBatchingSessionOverride();
    vi.clearAllMocks();
  });

  it("requests an atomic batch and records submission and success", async () => {
    mocks.waitForCallsStatus.mockResolvedValue({
      id: "bundle-1",
      atomic: true,
      status: "success",
      statusCode: 200,
      receipts: [],
    });

    const result = await sendWalletCalls({
      chainId: CHAIN_ID,
      account: ACCOUNT,
      calls,
      analytics,
    });

    expect(mocks.sendCalls).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        account: ACCOUNT,
        calls,
        chainId: CHAIN_ID,
        connector: CONNECTOR,
        forceAtomic: true,
      })
    );
    expect(mocks.pushBatchApprovalAnalyticsEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ action: "BatchApproveAttempt" })
    );
    expect(mocks.pushBatchApprovalAnalyticsEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ action: "BatchApproveSubmitted" })
    );

    await result.wait();

    expect(mocks.pushBatchApprovalAnalyticsEvent).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ action: "BatchApproveSuccess" })
    );
  });

  it("records a rejected request and disables batching for the session", async () => {
    mocks.sendCalls.mockRejectedValue(Object.assign(new Error("Rejected"), { code: 4001 }));

    await expect(
      sendWalletCalls({
        chainId: CHAIN_ID,
        account: ACCOUNT,
        calls,
        analytics,
      })
    ).rejects.toThrow("Rejected");

    expect(mocks.pushBatchApprovalAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "BatchApproveFail",
        reason: "UserRejected",
      })
    );
    expect(mocks.pushBatchApprovalAnalyticsEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: "BatchApproveFallback" })
    );
    expect(isAtomicBatchingDisabledForSession(sessionKey)).toBe(true);
    expect(consumeAtomicBatchingFallbackReason(sessionKey)).toBe("UserRejected");
  });

  it.each([
    [5750, "UpgradeRejected"],
    [5760, "AtomicUnsupported"],
    [4200, "AtomicUnsupported"],
    [-32601, "AtomicUnsupported"],
  ] as const)("classifies provider error code %s", async (code, reason) => {
    mocks.sendCalls.mockRejectedValue(Object.assign(new Error("Provider error"), { code }));

    await expect(
      sendWalletCalls({
        chainId: CHAIN_ID,
        account: ACCOUNT,
        calls,
        analytics,
      })
    ).rejects.toThrow("Provider error");

    expect(mocks.pushBatchApprovalAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "BatchApproveFail",
        reason,
      })
    );
  });

  it("classifies nested provider errors", async () => {
    mocks.sendCalls.mockRejectedValue(
      Object.assign(new Error("Wrapped error"), {
        cause: Object.assign(new Error("Upgrade rejected"), { code: 5750 }),
      })
    );

    await expect(
      sendWalletCalls({
        chainId: CHAIN_ID,
        account: ACCOUNT,
        calls,
        analytics,
      })
    ).rejects.toThrow("Wrapped error");

    expect(mocks.pushBatchApprovalAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "BatchApproveFail",
        reason: "UpgradeRejected",
      })
    );
  });

  it("keeps an unresolved status separate from a failure", async () => {
    mocks.waitForCallsStatus.mockRejectedValue(
      Object.assign(new Error("Timed out"), { name: "WaitForCallsStatusTimeoutError" })
    );

    const result = await sendWalletCalls({
      chainId: CHAIN_ID,
      account: ACCOUNT,
      calls,
      analytics,
    });

    await expect(result.wait()).rejects.toThrow("Timed out");

    expect(mocks.pushBatchApprovalAnalyticsEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: "BatchApproveStatusUnknown",
        reason: "StatusTimeout",
      })
    );
    expect(isAtomicBatchingDisabledForSession(sessionKey)).toBe(false);
  });

  it("rejects a successful result that was not atomic", async () => {
    mocks.getCallsStatus.mockResolvedValue({
      id: "bundle-1",
      atomic: false,
      status: "success",
      statusCode: 200,
      receipts: [],
    });

    const result = await sendWalletCalls({
      chainId: CHAIN_ID,
      account: ACCOUNT,
      calls,
      analytics,
    });

    await expect(result.getStatus()).resolves.toMatchObject({ atomic: false, status: "success" });
    expect(mocks.pushBatchApprovalAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "BatchApproveFail",
        reason: "AtomicUnsupported",
      })
    );
    expect(mocks.pushBatchApprovalAnalyticsEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: "BatchApproveFallback" })
    );
    expect(isAtomicBatchingDisabledForSession(sessionKey)).toBe(true);
  });

  it("records a terminal bundle failure and disables batching", async () => {
    mocks.waitForCallsStatus.mockResolvedValue({
      id: "bundle-1",
      atomic: true,
      status: "failure",
      statusCode: 500,
      receipts: [],
    });

    const result = await sendWalletCalls({
      chainId: CHAIN_ID,
      account: ACCOUNT,
      calls,
      analytics,
    });

    await expect(result.wait()).resolves.toMatchObject({ status: "failure" });
    expect(mocks.pushBatchApprovalAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "BatchApproveFail",
        reason: "BundleFailed",
      })
    );
    expect(mocks.pushBatchApprovalAnalyticsEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: "BatchApproveFallback" })
    );
    expect(isAtomicBatchingDisabledForSession(sessionKey)).toBe(true);
  });

  it("rejects a non-atomic success when waiting for an approval bundle", async () => {
    mocks.waitForCallsStatus.mockResolvedValue({
      id: "bundle-1",
      atomic: false,
      status: "success",
      statusCode: 200,
      receipts: [],
    });

    const result = await sendWalletCalls({
      chainId: CHAIN_ID,
      account: ACCOUNT,
      calls,
      analytics,
    });

    await expect(result.wait()).rejects.toThrow("not executed atomically");
    expect(isAtomicBatchingDisabledForSession(sessionKey)).toBe(true);
  });
});
