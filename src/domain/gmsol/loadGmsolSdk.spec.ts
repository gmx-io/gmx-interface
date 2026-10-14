import { describe, expect, it, vi } from "vitest";

import { getIsSolanaNetworkEnabled } from "config/ab";

import { loadGmsolSdk } from "./loadGmsolSdk";

const sdkFactory = vi.hoisted(() => vi.fn(() => ({ create_orders: vi.fn() })));

vi.mock("@gmsol-labs/gmsol-sdk", () => sdkFactory());
vi.mock("config/ab", () => ({ getIsSolanaNetworkEnabled: vi.fn() }));

describe("loadGmsolSdk", () => {
  it("gates every access while reusing a single SDK load across flag changes", async () => {
    vi.mocked(getIsSolanaNetworkEnabled).mockReturnValue(false);
    await expect(loadGmsolSdk()).rejects.toThrow("Solana network is disabled");
    expect(sdkFactory).not.toHaveBeenCalled();

    vi.mocked(getIsSolanaNetworkEnabled).mockReturnValue(true);
    const firstLoad = loadGmsolSdk();
    const secondLoad = loadGmsolSdk();

    expect(secondLoad).toBe(firstLoad);
    expect((await firstLoad).create_orders).toBeTypeOf("function");

    vi.mocked(getIsSolanaNetworkEnabled).mockReturnValue(false);
    await expect(loadGmsolSdk()).rejects.toThrow("Solana network is disabled");

    vi.mocked(getIsSolanaNetworkEnabled).mockReturnValue(true);
    expect(loadGmsolSdk()).toBe(firstLoad);
    expect(sdkFactory).toHaveBeenCalledTimes(1);
  });
});
