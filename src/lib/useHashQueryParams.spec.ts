import { describe, expect, it } from "vitest";

import { getRelocatedHashQuery } from "./useHashQueryParams";

describe("getRelocatedHashQuery", () => {
  it("leaves Privy OAuth redirect params in the query string so social login can finish", () => {
    // Privy reads privy_oauth_* from window.location.search; relocating them breaks social login.
    expect(
      getRelocatedHashQuery("?privy_oauth_code=abc&privy_oauth_state=xyz&privy_oauth_provider=google", "#/trade", "/")
    ).toBeNull();

    expect(getRelocatedHashQuery("?privy_oauth_error=access_denied", "#/trade", "/")).toBeNull();
  });

  it("does not relocate even when an OAuth param is mixed with other params", () => {
    expect(getRelocatedHashQuery("?privy_oauth_code=abc&ref=alice", "#/trade", "/")).toBeNull();
  });

  it("moves non-Privy query params from before the hash into the hash", () => {
    expect(getRelocatedHashQuery("?ref=alice", "#/trade", "/")).toEqual({
      newUrl: "/#/trade?ref=alice",
      newHash: "/trade?ref=alice",
    });
  });

  it("merges with existing hash params, letting hash params take precedence", () => {
    expect(getRelocatedHashQuery("?ref=alice&chainId=42161", "#/trade?ref=bob", "/")).toEqual({
      newUrl: "/#/trade?ref=bob&chainId=42161",
      newHash: "/trade?ref=bob&chainId=42161",
    });
  });

  it("returns null when there is nothing to relocate", () => {
    expect(getRelocatedHashQuery("", "#/trade", "/")).toBeNull();
    expect(getRelocatedHashQuery("?ref=alice", "", "/")).toBeNull();
  });
});
