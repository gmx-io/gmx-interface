import { describe, expect, it } from "vitest";

import { getUrlWithoutLegacyHashRoute } from "./legacyHashUrl";

describe("getUrlWithoutLegacyHashRoute", () => {
  it("rewrites a legacy hash route to a path", () => {
    expect(getUrlWithoutLegacyHashRoute("https://app.gmx.io/#/trade")).toBe("https://app.gmx.io/trade");
  });

  it("rewrites the legacy root", () => {
    expect(getUrlWithoutLegacyHashRoute("https://app.gmx.io/#/")).toBe("https://app.gmx.io/");
  });

  it("keeps the query of the hash route", () => {
    expect(getUrlWithoutLegacyHashRoute("https://app.gmx.io/#/trade/?ref=CODE")).toBe(
      "https://app.gmx.io/trade/?ref=CODE"
    );
  });

  it("merges a query placed in front of the hash", () => {
    expect(getUrlWithoutLegacyHashRoute("https://app.gmx.io/?ref=CODE#/trade?chainId=42161")).toBe(
      "https://app.gmx.io/trade?chainId=42161&ref=CODE"
    );
  });

  it("prefers the hash query over the one in front of the hash", () => {
    expect(getUrlWithoutLegacyHashRoute("https://app.gmx.io/?ref=OUTER#/trade?ref=INNER")).toBe(
      "https://app.gmx.io/trade?ref=INNER"
    );
  });

  // Relocating these out of the query once broke social login: the Privy SDK reads them from
  // window.location.search to finish the OAuth redirect flow.
  it("keeps Privy OAuth redirect params in the query", () => {
    expect(getUrlWithoutLegacyHashRoute("https://app.gmx.io/?privy_oauth_code=abc&privy_oauth_state=xyz#/trade")).toBe(
      "https://app.gmx.io/trade?privy_oauth_code=abc&privy_oauth_state=xyz"
    );
  });

  it("keeps the anchor of the hash route", () => {
    expect(getUrlWithoutLegacyHashRoute("https://app.gmx.io/#/buy_gmx?foo=bar#bridge")).toBe(
      "https://app.gmx.io/buy_gmx?foo=bar#bridge"
    );
  });

  it("drops the path the legacy hash route was rendered on", () => {
    expect(getUrlWithoutLegacyHashRoute("https://app.gmx.io/trade#/orders")).toBe("https://app.gmx.io/orders");
  });

  it("ignores urls without a hash route", () => {
    expect(getUrlWithoutLegacyHashRoute("https://app.gmx.io/trade?ref=CODE")).toBeUndefined();
  });

  it("ignores plain anchors", () => {
    expect(getUrlWithoutLegacyHashRoute("https://app.gmx.io/buy_gmx#bridge")).toBeUndefined();
  });
});
