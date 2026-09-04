import { afterEach, describe, expect, it, vi } from "vitest";

import { configureInstalledApp, getIsInstalledApp, INSTALLED_APP_ATTRIBUTE } from "./getIsInstalledApp";

function setDisplayMode(standalone: boolean) {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: standalone }));
}

function setIosStandalone(standalone: boolean) {
  Object.defineProperty(window.navigator, "standalone", {
    configurable: true,
    value: standalone,
  });
}

describe("getIsInstalledApp", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window.navigator as Navigator & { standalone?: boolean }).standalone;
    document.documentElement.removeAttribute(INSTALLED_APP_ATTRIBUTE);
  });

  it("detects an installed app from its display mode", () => {
    setDisplayMode(true);
    setIosStandalone(false);

    expect(getIsInstalledApp()).toBe(true);
  });

  it("detects an installed iOS app", () => {
    setDisplayMode(false);
    setIosStandalone(true);

    expect(getIsInstalledApp()).toBe(true);
  });

  it("returns false in a browser tab", () => {
    setDisplayMode(false);
    setIosStandalone(false);

    expect(getIsInstalledApp()).toBe(false);
  });

  it("marks the document only when the app is installed", () => {
    setDisplayMode(true);

    configureInstalledApp();

    expect(document.documentElement.hasAttribute(INSTALLED_APP_ATTRIBUTE)).toBe(true);

    setDisplayMode(false);
    configureInstalledApp();

    expect(document.documentElement.hasAttribute(INSTALLED_APP_ATTRIBUTE)).toBe(false);
  });
});
