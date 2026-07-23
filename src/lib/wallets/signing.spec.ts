import { describe, expect, it, vi } from "vitest";

import { shouldSwitchToVerificationChain, withNetworkRestoration } from "./signing";

describe("shouldSwitchToVerificationChain", () => {
  it("switches when a smart wallet is deployed on the verification chain", () => {
    expect(
      shouldSwitchToVerificationChain({
        currentChainId: 1,
        verificationChainId: 42161,
        hasCodeOnCurrentChain: false,
        hasCodeOnVerificationChain: true,
        isKnownSmartAccount: false,
      })
    ).toBe(true);
  });

  it("switches for a counterfactual wallet detected on the current chain", () => {
    expect(
      shouldSwitchToVerificationChain({
        currentChainId: 1,
        verificationChainId: 42161,
        hasCodeOnCurrentChain: true,
        hasCodeOnVerificationChain: false,
        isKnownSmartAccount: false,
      })
    ).toBe(true);
  });

  it("does not switch an EOA", () => {
    expect(
      shouldSwitchToVerificationChain({
        currentChainId: 1,
        verificationChainId: 42161,
        hasCodeOnCurrentChain: false,
        hasCodeOnVerificationChain: false,
        isKnownSmartAccount: false,
      })
    ).toBe(false);
  });

  it("does not switch when already connected to the verification chain", () => {
    expect(
      shouldSwitchToVerificationChain({
        currentChainId: 42161,
        verificationChainId: 42161,
        hasCodeOnCurrentChain: true,
        hasCodeOnVerificationChain: true,
        isKnownSmartAccount: false,
      })
    ).toBe(false);
  });

  it("switches a known counterfactual smart-wallet connector", () => {
    expect(
      shouldSwitchToVerificationChain({
        currentChainId: 1,
        verificationChainId: 42161,
        hasCodeOnCurrentChain: false,
        hasCodeOnVerificationChain: false,
        isKnownSmartAccount: true,
      })
    ).toBe(true);
  });
});

describe("withNetworkRestoration", () => {
  it("returns the action result after restoring the original network", async () => {
    const restore = vi.fn().mockResolvedValue(undefined);

    await expect(
      withNetworkRestoration({
        action: () => Promise.resolve("signature"),
        restore,
      })
    ).resolves.toBe("signature");
    expect(restore).toHaveBeenCalledOnce();
  });

  it("surfaces a restoration failure after a successful action", async () => {
    const restoreError = new Error("User rejected network restoration");

    await expect(
      withNetworkRestoration({
        action: () => Promise.resolve("signature"),
        restore: () => Promise.reject(restoreError),
      })
    ).rejects.toBe(restoreError);
  });

  it("preserves the action error if restoration also fails", async () => {
    const actionError = new Error("Signing failed");
    const restore = vi.fn().mockRejectedValue(new Error("Restoration failed"));

    await expect(
      withNetworkRestoration({
        action: () => Promise.reject(actionError),
        restore,
      })
    ).rejects.toBe(actionError);
    expect(restore).toHaveBeenCalledOnce();
  });
});
