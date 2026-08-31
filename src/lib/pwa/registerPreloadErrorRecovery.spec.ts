import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { registerPreloadErrorRecovery } from "./registerPreloadErrorRecovery";

function setDocumentBuildId(buildId: string) {
  const meta = document.createElement("meta");
  meta.name = "gmx-pwa-build-id";
  meta.content = buildId;
  document.head.appendChild(meta);
  return meta;
}

function createPreloadErrorEvent(error = new Error("Unable to preload module")) {
  const event = new Event("vite:preloadError", { cancelable: true }) as VitePreloadErrorEvent;
  Object.defineProperty(event, "payload", { value: error });
  return event;
}

describe("registerPreloadErrorRecovery", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    document.querySelectorAll('meta[name="gmx-pwa-build-id"]').forEach((element) => element.remove());
    window.history.replaceState({}, "", "/");
  });

  it("reloads once when a preload fails", () => {
    setDocumentBuildId("100");
    const reloadPage = vi.fn();
    const unregister = registerPreloadErrorRecovery({ isOnline: () => true, reloadPage });
    const event = createPreloadErrorEvent();

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(reloadPage).toHaveBeenCalledTimes(1);
    expect(reloadPage.mock.calls[0][0]).toContain("__gmx_pwa_recovery=100");
    unregister();
  });

  it("removes the recovery query parameter after the fresh shell loads", () => {
    window.history.replaceState({}, "", "/trade?foo=bar&__gmx_pwa_recovery=100#/orders");

    const unregister = registerPreloadErrorRecovery({ reloadPage: vi.fn() });

    expect(window.location.pathname).toBe("/trade");
    expect(window.location.search).toBe("?foo=bar");
    expect(window.location.hash).toBe("#/orders");
    unregister();
  });

  it("reports the recovered error after reload and does not loop on the same build", () => {
    setDocumentBuildId("100");
    const firstUnregister = registerPreloadErrorRecovery({ isOnline: () => true, reloadPage: vi.fn() });
    window.dispatchEvent(createPreloadErrorEvent(new TypeError("Import failed")));
    firstUnregister();

    const reloadPage = vi.fn();
    const reportError = vi.fn();
    const secondUnregister = registerPreloadErrorRecovery({ isOnline: () => true, reloadPage, reportError });
    const repeatedEvent = createPreloadErrorEvent();

    window.dispatchEvent(repeatedEvent);

    expect(reportError).toHaveBeenCalledTimes(2);
    expect(reportError.mock.calls[0][0].message).toContain("TypeError: Import failed");
    expect(reportError.mock.calls[1][0].message).toContain("reload already attempted");
    expect(repeatedEvent.defaultPrevented).toBe(false);
    expect(reloadPage).not.toHaveBeenCalled();
    secondUnregister();
  });

  it("can recover a preload failure from a newer build", () => {
    const meta = setDocumentBuildId("100");
    const reloadPage = vi.fn();
    const unregister = registerPreloadErrorRecovery({ isOnline: () => true, reloadPage });

    window.dispatchEvent(createPreloadErrorEvent());
    meta.content = "101";
    const newerBuildEvent = createPreloadErrorEvent();
    window.dispatchEvent(newerBuildEvent);

    expect(newerBuildEvent.defaultPrevented).toBe(true);
    expect(reloadPage).toHaveBeenCalledTimes(2);
    unregister();
  });

  it("does not reload while offline", () => {
    setDocumentBuildId("100");
    const reloadPage = vi.fn();
    const reportError = vi.fn();
    const unregister = registerPreloadErrorRecovery({ isOnline: () => false, reloadPage, reportError });
    const event = createPreloadErrorEvent();

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(reportError.mock.calls[0][0].message).toContain("offline");
    expect(reloadPage).not.toHaveBeenCalled();
    unregister();
  });

  it("does not abort when session storage is unavailable", () => {
    setDocumentBuildId("100");
    const sessionStorageSpy = vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new DOMException("Access denied", "SecurityError");
    });
    const reloadPage = vi.fn();
    const reportError = vi.fn();

    try {
      const unregister = registerPreloadErrorRecovery({ isOnline: () => true, reloadPage, reportError });
      const event = createPreloadErrorEvent();

      window.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(reportError.mock.calls[0][0].message).toContain("session storage unavailable");
      expect(reloadPage).not.toHaveBeenCalled();
      unregister();
    } finally {
      sessionStorageSpy.mockRestore();
    }
  });
});
