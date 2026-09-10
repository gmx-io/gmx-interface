import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  let viewportMeta: HTMLMetaElement;

  beforeEach(() => {
    viewportMeta = document.createElement("meta");
    viewportMeta.name = "viewport";
    viewportMeta.content = "width=device-width, initial-scale=1, maximum-scale=1";
    document.head.append(viewportMeta);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window.navigator as Navigator & { standalone?: boolean }).standalone;
    document.documentElement.removeAttribute(INSTALLED_APP_ATTRIBUTE);
    viewportMeta.remove();
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

  it("configures safe-area support only when the app is installed", () => {
    setDisplayMode(true);

    configureInstalledApp();

    expect(document.documentElement.hasAttribute(INSTALLED_APP_ATTRIBUTE)).toBe(true);
    expect(viewportMeta.content).toBe("width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover");

    configureInstalledApp();

    expect(viewportMeta.content.match(/viewport-fit=cover/g)).toHaveLength(1);

    setDisplayMode(false);
    configureInstalledApp();

    expect(document.documentElement.hasAttribute(INSTALLED_APP_ATTRIBUTE)).toBe(false);
    expect(viewportMeta.content).toBe("width=device-width, initial-scale=1, maximum-scale=1");
  });
});
