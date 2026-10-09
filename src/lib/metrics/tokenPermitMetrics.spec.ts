import { beforeEach, describe, expect, it, vi } from "vitest";

import { sendTokenPermitMetric } from "./tokenPermitMetrics";

const mocks = vi.hoisted(() => ({ pushEvent: vi.fn() }));

vi.mock("./Metrics", () => ({ metrics: { pushEvent: mocks.pushEvent } }));

const ARBITRUM = 42161;
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

describe("sendTokenPermitMetric", () => {
  beforeEach(() => {
    mocks.pushEvent.mockClear();
  });

  it("reports the outcome with the token symbol, chain and account type", () => {
    sendTokenPermitMetric({ outcome: "signed", chainId: ARBITRUM, tokenAddress: USDC, accountType: "eoa" });

    expect(mocks.pushEvent).toHaveBeenCalledWith({
      event: "tokenPermit",
      isError: false,
      data: { outcome: "signed", chainId: ARBITRUM, token: "USDC", accountType: "eoa", reason: undefined },
    });
  });

  it.each(["failedCheck", "fallback"] as const)("flags %s as an error", (outcome) => {
    sendTokenPermitMetric({ outcome, chainId: ARBITRUM, tokenAddress: USDC, accountType: "eoa", reason: "x" });

    expect(mocks.pushEvent).toHaveBeenCalledWith(expect.objectContaining({ isError: true }));
  });

  it("keeps the address for tokens outside the config", () => {
    const unknown = "0x0000000000000000000000000000000000000009";
    sendTokenPermitMetric({ outcome: "rejected", chainId: ARBITRUM, tokenAddress: unknown, accountType: undefined });

    expect(mocks.pushEvent.mock.calls[0][0].data.token).toBe(unknown);
  });
});
