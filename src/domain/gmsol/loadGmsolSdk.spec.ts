import { beforeEach, expect, it, vi } from "vitest";

import { getIsSolanaNetworkEnabled } from "config/ab";

const { sdk, initialize, entryFactory } = vi.hoisted(() => {
  return { sdk: {}, initialize: vi.fn(), entryFactory: vi.fn() };
});

vi.mock("config/ab", () => ({ getIsSolanaNetworkEnabled: vi.fn() }));

const entryUrl = new URL("/gmsol-sdk/0.9.0-test.2-v2/entry.js", window.location.origin).href;

beforeEach(() => {
  vi.resetModules();
  initialize.mockReset().mockResolvedValue(sdk);
  entryFactory.mockReset().mockReturnValue({ initialize });
  vi.doMock(entryUrl, () => entryFactory());
});

it("gates access and reuses the entry across initialization retries, concurrent calls and flag changes", async () => {
  const { loadGmsolSdk } = await import("./loadGmsolSdk");
  vi.mocked(getIsSolanaNetworkEnabled).mockReturnValue(false);
  await expect(loadGmsolSdk()).rejects.toThrow("Solana network is disabled");
  expect(entryFactory).not.toHaveBeenCalled();

  vi.mocked(getIsSolanaNetworkEnabled).mockReturnValue(true);
  const error = new TypeError("Failed to fetch WASM");
  initialize.mockRejectedValueOnce(error);
  await expect(loadGmsolSdk()).rejects.toBe(error);
  expect(await Promise.all([loadGmsolSdk(), loadGmsolSdk()])).toEqual([sdk, sdk]);
  vi.mocked(getIsSolanaNetworkEnabled).mockReturnValue(false);
  await expect(loadGmsolSdk()).rejects.toThrow("Solana network is disabled");
  expect(initialize).toHaveBeenCalledTimes(3);

  vi.mocked(getIsSolanaNetworkEnabled).mockReturnValue(true);
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
