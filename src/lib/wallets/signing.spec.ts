import { describe, expect, it } from "vitest";

import { shouldSwitchToVerificationChain } from "./signing";

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
