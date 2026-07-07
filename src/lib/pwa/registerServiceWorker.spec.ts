import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { registerServiceWorker } from "./registerServiceWorker";

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
    vi.clearAllMocks();
    Reflect.deleteProperty(navigator, "serviceWorker");
    Reflect.deleteProperty(document, "readyState");
  });

  it("registers the service worker in production builds", () => {
    registerServiceWorker();

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
});
