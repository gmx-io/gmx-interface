import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { registerServiceWorker, unregisterServiceWorker } from "./registerServiceWorker";

describe("registerServiceWorker", () => {
  const register = vi.fn().mockResolvedValue(undefined);

  function setDocumentReadyState(readyState: DocumentReadyState) {
    Object.defineProperty(document, "readyState", {
      value: readyState,
      configurable: true,
    });
  }

  beforeEach(() => {
    vi.stubEnv("PROD", true);
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register },
      configurable: true,
    });
    setDocumentReadyState("complete");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    Reflect.deleteProperty(navigator, "serviceWorker");
    Reflect.deleteProperty(document, "readyState");
  });

  it("registers the service worker in production builds", () => {
    registerServiceWorker();

    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it("does not surface registration failures", async () => {
    register.mockRejectedValueOnce(new Error("registration failed"));

    expect(() => registerServiceWorker()).not.toThrow();
    await Promise.resolve();

    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it("does not register the service worker in non-production builds", () => {
    vi.stubEnv("PROD", false);

    registerServiceWorker();

    expect(register).not.toHaveBeenCalled();
  });

  it("does nothing when service workers are not supported", () => {
    Reflect.deleteProperty(navigator, "serviceWorker");

    expect(() => registerServiceWorker()).not.toThrow();
    expect(register).not.toHaveBeenCalled();
  });

  it("defers registration until the page load event when the document is still loading", () => {
    setDocumentReadyState("loading");

    registerServiceWorker();

    expect(register).not.toHaveBeenCalled();

    window.dispatchEvent(new Event("load"));

    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it("unregisters the worker and purges caches instead of registering when the kill-switch is set", async () => {
    vi.stubEnv("VITE_APP_DISABLE_PWA", "true");
    const unregister = vi.fn().mockResolvedValue(true);
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register, getRegistration: vi.fn().mockResolvedValue({ unregister }) },
      configurable: true,
    });
    const cacheDelete = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("caches", {
      keys: vi.fn().mockResolvedValue(["gmx-pwa-shell-v1", "gmx-pwa-assets-v1", "other-app-v1"]),
      delete: cacheDelete,
    });

    registerServiceWorker();

    await vi.waitFor(() => expect(cacheDelete).toHaveBeenCalledTimes(2));
    expect(register).not.toHaveBeenCalled();
    expect(unregister).toHaveBeenCalledTimes(1);
    expect(cacheDelete).toHaveBeenCalledWith("gmx-pwa-shell-v1");
    expect(cacheDelete).toHaveBeenCalledWith("gmx-pwa-assets-v1");
    expect(cacheDelete).not.toHaveBeenCalledWith("other-app-v1");
  });

  it("purges caches and does not surface registration cleanup failures", async () => {
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register, getRegistration: vi.fn().mockRejectedValue(new Error("cleanup failed")) },
      configurable: true,
    });
    const cacheDelete = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("caches", {
      keys: vi.fn().mockResolvedValue(["gmx-pwa-shell-v1", "other-app-v1"]),
      delete: cacheDelete,
    });

    await expect(unregisterServiceWorker()).resolves.toBeUndefined();
    expect(cacheDelete).toHaveBeenCalledWith("gmx-pwa-shell-v1");
    expect(cacheDelete).not.toHaveBeenCalledWith("other-app-v1");
  });
});
