import { beforeEach, describe, expect, it, vi } from "vitest";

import { getIsSolanaNetworkEnabled } from "config/ab";

const { sdk, initialize, entryFactory } = vi.hoisted(() => {
  const sdk = { create_orders: vi.fn() };
  const initialize = vi.fn();
  return { sdk, initialize, entryFactory: vi.fn() };
});

vi.mock("config/ab", () => ({ getIsSolanaNetworkEnabled: vi.fn() }));

const entryUrl = new URL("/gmsol-sdk/0.9.0-test.2-v2/entry.js", window.location.origin).href;

beforeEach(() => {
  vi.resetModules();
  initialize.mockReset().mockResolvedValue(sdk);
  entryFactory.mockReset().mockReturnValue({ initialize });
  vi.doMock(entryUrl, () => entryFactory());
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

  it("bypasses the failed entry URL and shares the retry across callers (FESOL-55)", async () => {
    entryFactory.mockImplementation(() => {
      throw new TypeError("Failed to fetch entry");
    });
    const { loadGmsolSdk } = await import("./loadGmsolSdk");
    vi.mocked(getIsSolanaNetworkEnabled).mockReturnValue(true);
    await expect(loadGmsolSdk()).rejects.toThrow();
    // Leave the original URL failed, as it remains in the browser's module map.
    vi.doMock(`${entryUrl}?retry=1`, () => ({ initialize }));
    await expect(Promise.all([loadGmsolSdk(), loadGmsolSdk()])).resolves.toEqual([sdk, sdk]);
    await expect(loadGmsolSdk()).resolves.toBe(sdk);
    expect(entryFactory).toHaveBeenCalledTimes(1);
  });
});
