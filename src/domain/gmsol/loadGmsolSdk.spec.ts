import { beforeEach, describe, expect, it, vi } from "vitest";

import { getIsSolanaNetworkEnabled } from "config/ab";

const { sdk, initialize, entryFactory } = vi.hoisted(() => {
  const sdk = { create_orders: vi.fn() };
  const initialize = vi.fn();
  return { sdk, initialize, entryFactory: vi.fn() };
});

vi.mock("config/ab", () => ({ getIsSolanaNetworkEnabled: vi.fn() }));

beforeEach(() => {
  vi.resetModules();
  initialize.mockReset().mockResolvedValue(sdk);
  entryFactory.mockReset().mockReturnValue({ initialize });
  vi.doMock("/gmsol-sdk/0.9.0-test.2-v2/entry.js", () => entryFactory());
});

describe("loadGmsolSdk", () => {
  it("gates access and loads the entry once across concurrent calls and flag changes", async () => {
    const { loadGmsolSdk } = await import("./loadGmsolSdk");
    vi.mocked(getIsSolanaNetworkEnabled).mockReturnValue(false);
    await expect(loadGmsolSdk()).rejects.toThrow("Solana network is disabled");
    expect(entryFactory).not.toHaveBeenCalled();

    vi.mocked(getIsSolanaNetworkEnabled).mockReturnValue(true);
    expect(await Promise.all([loadGmsolSdk(), loadGmsolSdk()])).toEqual([sdk, sdk]);
    vi.mocked(getIsSolanaNetworkEnabled).mockReturnValue(false);
    await expect(loadGmsolSdk()).rejects.toThrow("Solana network is disabled");
    expect(initialize).toHaveBeenCalledTimes(2);

    vi.mocked(getIsSolanaNetworkEnabled).mockReturnValue(true);
    await expect(loadGmsolSdk()).resolves.toBe(sdk);
    expect(entryFactory).toHaveBeenCalledTimes(1);
  });

  it("allows the entry to retry initialization after a WASM loading failure", async () => {
    const error = new TypeError("Failed to fetch WASM");
    initialize.mockRejectedValueOnce(error);
    const { loadGmsolSdk } = await import("./loadGmsolSdk");
    vi.mocked(getIsSolanaNetworkEnabled).mockReturnValue(true);
    await expect(loadGmsolSdk()).rejects.toBe(error);
    await expect(loadGmsolSdk()).resolves.toBe(sdk);
    expect(entryFactory).toHaveBeenCalledTimes(1);
  });

  it("allows another module import after an entry loading failure", async () => {
    entryFactory.mockImplementationOnce(() => {
      throw new TypeError("Failed to fetch entry");
    });
    const { loadGmsolSdk } = await import("./loadGmsolSdk");
    vi.mocked(getIsSolanaNetworkEnabled).mockReturnValue(true);
    await expect(loadGmsolSdk()).rejects.toThrow();
    // Model a later successful network import without resetting the loader module.
    vi.doMock("/gmsol-sdk/0.9.0-test.2-v2/entry.js", () => entryFactory());
    await expect(loadGmsolSdk()).resolves.toBe(sdk);
    expect(entryFactory).toHaveBeenCalledTimes(2);
  });
});
