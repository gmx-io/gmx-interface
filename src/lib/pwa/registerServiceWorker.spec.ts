import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { registerServiceWorker } from "./registerServiceWorker";

describe("registerServiceWorker", () => {
  const register = vi.fn();
  const fetch = vi.fn();
  const cacheNames = vi.fn();
  const openCache = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_APP_DISABLE_PWA", "false");
    register.mockReset().mockResolvedValue(undefined);
    fetch.mockReset().mockRejectedValue(new Error("offline"));
    cacheNames.mockReset().mockResolvedValue([]);
    openCache.mockReset().mockRejectedValue(new Error("No existing cache"));
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("caches", { keys: cacheNames, open: openCache });
    vi.stubGlobal("navigator", {
      serviceWorker: {
        controller: { scriptURL: "https://app.example/sw.js?build=100" },
        register,
      },
    });
    const meta = document.createElement("meta");
    meta.name = "gmx-pwa-build-id";
    meta.content = "100";
    document.head.appendChild(meta);
  });

  afterEach(() => {
    document.querySelectorAll('meta[name="gmx-pwa-build-id"]').forEach((element) => element.remove());
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("registers the document build while offline without an HTML probe", async () => {
    registerServiceWorker();
    await vi.runAllTimersAsync();

    expect(register).toHaveBeenCalledExactlyOnceWith("/sw.js?build=100", { updateViaCache: "none" });
    expect(fetch).not.toHaveBeenCalled();
    expect(openCache).not.toHaveBeenCalled();
  });

  it("allows an existing registration to receive updated worker code for the same document build", async () => {
    registerServiceWorker();
    await vi.runAllTimersAsync();
    registerServiceWorker();
    await vi.runAllTimersAsync();

    expect(register).toHaveBeenCalledTimes(2);
    expect(register).toHaveBeenLastCalledWith("/sw.js?build=100", { updateViaCache: "none" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not register without a document build identifier", async () => {
    document.querySelector('meta[name="gmx-pwa-build-id"]')?.remove();

    registerServiceWorker();
    await vi.runAllTimersAsync();

    expect(register).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not register in development", async () => {
    vi.stubEnv("PROD", false);

    registerServiceWorker();
    await vi.runAllTimersAsync();

    expect(register).not.toHaveBeenCalled();
  });

  it("handles registration failure without interrupting the application", async () => {
    register.mockRejectedValue(new Error("Registration failed"));

    registerServiceWorker();

    await vi.runAllTimersAsync();
    expect(register).toHaveBeenCalledOnce();
  });

  it.each([100, 101])(
    "does not revive an existing controller when build %i disabled this document build",
    async (disabledBuild) => {
      cacheNames.mockResolvedValue(["gmx-pwa-control-v2"]);
      openCache.mockResolvedValue({
        keys: async () => [{ url: `https://app.example/__gmx_pwa_disabled__/${disabledBuild}` }],
      });

      registerServiceWorker();
      await vi.runAllTimersAsync();

      expect(register).not.toHaveBeenCalled();
      expect(openCache).toHaveBeenCalledExactlyOnceWith("gmx-pwa-control-v2");
      expect(fetch).not.toHaveBeenCalled();
    }
  );

  it("registers a newer document build despite an older disabled marker", async () => {
    cacheNames.mockResolvedValue(["gmx-pwa-control-v2"]);
    openCache.mockResolvedValue({
      keys: async () => [{ url: "https://app.example/__gmx_pwa_disabled__/99" }],
    });

    registerServiceWorker();
    await vi.runAllTimersAsync();

    expect(register).toHaveBeenCalledExactlyOnceWith("/sw.js?build=100", { updateViaCache: "none" });
  });

  it.each(["unavailable", "absent"])(
    "registers when CacheStorage is %s without creating a cache",
    async (storageState) => {
      if (storageState === "absent") {
        vi.stubGlobal("caches", undefined);
      } else {
        cacheNames.mockRejectedValue(new Error("CacheStorage unavailable"));
      }

      registerServiceWorker();
      await vi.runAllTimersAsync();

      expect(register).toHaveBeenCalledExactlyOnceWith("/sw.js?build=100", { updateViaCache: "none" });
      expect(openCache).not.toHaveBeenCalled();
    }
  );
});
