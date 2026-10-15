import { beforeEach, describe, expect, it, vi } from "vitest";

import { getIsSolanaNetworkEnabled } from "config/ab";

const sdkFactory = vi.hoisted(() => vi.fn(() => ({ create_orders: vi.fn() })));

vi.mock("config/ab", () => ({ getIsSolanaNetworkEnabled: vi.fn() }));

beforeEach(() => {
  vi.resetModules();
  sdkFactory.mockClear();
  vi.doMock("@gmsol-labs/gmsol-sdk", () => sdkFactory());
});

describe("loadGmsolSdk", () => {
  it("gates every access while reusing a single SDK load across flag changes", async () => {
    const { loadGmsolSdk } = await import("./loadGmsolSdk");
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

  it("preserves a shared loading failure across later calls and flag changes", async () => {
    const loadError = new TypeError("Failed to initialize WASM");
    vi.doMock("@gmsol-labs/gmsol-sdk", () => {
      throw loadError;
    });
    const { loadGmsolSdk } = await import("./loadGmsolSdk");
    vi.mocked(getIsSolanaNetworkEnabled).mockReturnValue(true);

    const firstLoad = loadGmsolSdk();
    expect(loadGmsolSdk()).toBe(firstLoad);
    await expect(firstLoad).rejects.toMatchObject({ cause: loadError });

    expect(loadGmsolSdk()).toBe(firstLoad);
    await expect(loadGmsolSdk()).rejects.toMatchObject({ cause: loadError });

    vi.mocked(getIsSolanaNetworkEnabled).mockReturnValue(false);
    await expect(loadGmsolSdk()).rejects.toThrow("Solana network is disabled");
    expect(sdkFactory).not.toHaveBeenCalled();

    vi.mocked(getIsSolanaNetworkEnabled).mockReturnValue(true);
    expect(loadGmsolSdk()).toBe(firstLoad);
    await expect(loadGmsolSdk()).rejects.toMatchObject({ cause: loadError });
  });
});
