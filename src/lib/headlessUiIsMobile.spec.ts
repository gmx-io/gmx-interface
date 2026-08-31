import { afterEach, describe, expect, it, vi } from "vitest";

import { isIOS } from "./headlessUiIsMobile";

function mockNavigator({ userAgent, platform, maxTouchPoints }: Partial<Navigator>) {
  vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(userAgent ?? "");
  vi.spyOn(window.navigator, "platform", "get").mockReturnValue(platform ?? "");
  vi.spyOn(window.navigator, "maxTouchPoints", "get").mockReturnValue(maxTouchPoints ?? 0);
}

describe("isIOS", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("detects iPhone user agents", () => {
    mockNavigator({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15",
      platform: "iPhone",
    });

    expect(isIOS()).toBe(true);
  });

  it("detects iPadOS desktop mode", () => {
    mockNavigator({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15",
      platform: "MacIntel",
      maxTouchPoints: 5,
    });

    expect(isIOS()).toBe(true);
  });

  it("does not detect a desktop Mac as iOS", () => {
    mockNavigator({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
      platform: "MacIntel",
      maxTouchPoints: 0,
    });

    expect(isIOS()).toBe(false);
  });
});
