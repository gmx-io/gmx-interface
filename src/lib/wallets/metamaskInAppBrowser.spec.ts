import { afterEach, describe, expect, it, vi } from "vitest";

import { isMetaMaskIosInAppBrowser, waitForMetaMaskIosProvider } from "./metamaskInAppBrowser";

const METAMASK_IOS_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_4_1 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 WebView MetaMaskMobile";
const originalEthereumDescriptor = Object.getOwnPropertyDescriptor(window, "ethereum");

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  if (originalEthereumDescriptor) {
    Object.defineProperty(window, "ethereum", originalEthereumDescriptor);
  } else {
    delete window.ethereum;
  }
});

describe("MetaMask iOS in-app browser", () => {
  it("does not match Safari or MetaMask Android", () => {
    expect(isMetaMaskIosInAppBrowser(METAMASK_IOS_USER_AGENT)).toBe(true);
    expect(isMetaMaskIosInAppBrowser("Mozilla/5.0 (iPhone) Mobile Safari/604.1")).toBe(false);
    expect(isMetaMaskIosInAppBrowser("Mozilla/5.0 (Linux; Android 15) MetaMaskMobile")).toBe(false);
  });

  it("waits for the asynchronously injected provider", async () => {
    vi.useFakeTimers();
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(METAMASK_IOS_USER_AGENT);
    Object.defineProperty(window, "ethereum", { configurable: true, value: undefined });
    const resolved = vi.fn();

    void waitForMetaMaskIosProvider().then(resolved);
    await vi.advanceTimersByTimeAsync(1000);
    expect(resolved).not.toHaveBeenCalled();

    window.dispatchEvent(new Event("ethereum#initialized"));
    await vi.runAllTimersAsync();
    expect(resolved).toHaveBeenCalledTimes(1);
  });
});
