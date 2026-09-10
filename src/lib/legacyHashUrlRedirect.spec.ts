import { beforeEach, describe, expect, it, vi } from "vitest";

describe("legacyHashUrlRedirect", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("rewrites a legacy hash url while the module is being imported", async () => {
    window.history.replaceState({}, "", "/?ref=CODE#/trade");

    await import("./legacyHashUrlRedirect");

    expect(window.location.pathname).toBe("/trade");
    expect(window.location.search).toBe("?ref=CODE");
  });

  it("leaves a Privy OAuth return url untouched while the module is being imported", async () => {
    window.history.replaceState({}, "", "/?privy_oauth_code=abc&privy_oauth_state=xyz#/trade");

    await import("./legacyHashUrlRedirect");

    expect(window.location.pathname).toBe("/");
    expect(window.location.search).toBe("?privy_oauth_code=abc&privy_oauth_state=xyz");
    expect(window.location.hash).toBe("#/trade");
  });

  it("leaves a path based url untouched", async () => {
    window.history.replaceState({}, "", "/buy_gmx?foo=bar#bridge");

    await import("./legacyHashUrlRedirect");

    expect(window.location.pathname).toBe("/buy_gmx");
    expect(window.location.search).toBe("?foo=bar");
    expect(window.location.hash).toBe("#bridge");
  });
});
