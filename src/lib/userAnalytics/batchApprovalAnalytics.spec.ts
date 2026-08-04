import { beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, getChainName } from "config/chains";

import { pushBatchApprovalAnalyticsEvent } from "./batchApprovalAnalytics";
import { userAnalytics } from "./UserAnalytics";

vi.mock("./UserAnalytics", () => ({
  userAnalytics: {
    pushEvent: vi.fn(),
  },
}));

describe("pushBatchApprovalAnalyticsEvent", () => {
  beforeEach(() => {
    vi.mocked(userAnalytics.pushEvent).mockClear();
  });

  it("emits a bundle-level token approval event", () => {
    pushBatchApprovalAnalyticsEvent({
      action: "BatchApproveSubmitted",
      source: "Classic",
      chainId: ARBITRUM,
      capabilityStatus: "ready",
      tokenCount: 2,
      walletProvider: "MetaMask",
    });

    expect(userAnalytics.pushEvent).toHaveBeenCalledWith({
      event: "TokenApproveAction",
      data: {
        action: "BatchApproveSubmitted",
        source: "Classic",
        chain: getChainName(ARBITRUM),
        capability: "Ready",
        tokenCount: 2,
        walletProvider: "MetaMask",
        reason: undefined,
      },
    });
  });

  it("includes a controlled fallback reason", () => {
    pushBatchApprovalAnalyticsEvent({
      action: "BatchApproveFallback",
      source: "OneClickReauth",
      chainId: ARBITRUM,
      capabilityStatus: "unsupported",
      tokenCount: 3,
      reason: "CapabilityUnsupported",
    });

    expect(userAnalytics.pushEvent).toHaveBeenCalledWith({
      event: "TokenApproveAction",
      data: expect.objectContaining({
        action: "BatchApproveFallback",
        source: "OneClickReauth",
        capability: "Unsupported",
        tokenCount: 3,
        reason: "CapabilityUnsupported",
      }),
    });
  });
});
