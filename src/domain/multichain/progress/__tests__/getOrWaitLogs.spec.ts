import { parseAbi } from "viem";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { ARBITRUM_SEPOLIA } from "sdk/configs/chains";

import { getOrWaitLogs } from "../getOrWaitLogs";

vi.mock("lib/wallets/rainbowKitConfig", () => ({
  getPublicClientWithRpc: vi.fn(),
}));

describe("getOrWaitLogs", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should reject after timeout when logs are not found", async () => {
    const mockPublicClient = {
      getLogs: vi.fn().mockResolvedValue([]),
    };

    vi.mocked(getPublicClientWithRpc).mockReturnValue(mockPublicClient as any);

    const event = parseAbi(["event Transfer(address indexed from, address indexed to, uint256 value)"])[0];
    const promise = getOrWaitLogs({
      chainId: ARBITRUM_SEPOLIA,
      fromBlock: 0n,
      event,
      args: {},
      timeout: 60000,
    });

    // Wait for timers inside getOrWaitLogs to be set up
    await Promise.resolve();

    vi.advanceTimersByTime(61000);

    await expect(promise).rejects.toThrow("Abort signal received");
  });
});
