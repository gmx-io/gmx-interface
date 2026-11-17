import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { watchInjectedProviderAnnouncements } from "./announceInjectedProviders";

describe("watchInjectedProviderAnnouncements", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("re-requests provider announcements immediately, on delays, and on ethereum#initialized", () => {
    const requests = vi.fn();
    window.addEventListener("eip6963:requestProvider", requests);
    const stop = watchInjectedProviderAnnouncements();

    vi.advanceTimersByTime(0);
    expect(requests).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5000);
    expect(requests).toHaveBeenCalledTimes(3);

    window.dispatchEvent(new Event("ethereum#initialized"));
    expect(requests).toHaveBeenCalledTimes(4);

    stop();
    window.removeEventListener("eip6963:requestProvider", requests);
  });

  it("stops re-requesting after cleanup", () => {
    const requests = vi.fn();
    window.addEventListener("eip6963:requestProvider", requests);
    const stop = watchInjectedProviderAnnouncements();

    vi.advanceTimersByTime(0);
    stop();

    vi.advanceTimersByTime(10_000);
    window.dispatchEvent(new Event("ethereum#initialized"));
    expect(requests).toHaveBeenCalledTimes(1);

    window.removeEventListener("eip6963:requestProvider", requests);
  });
});
