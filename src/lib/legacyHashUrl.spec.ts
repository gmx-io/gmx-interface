import { describe, expect, it, vi } from "vitest";

import {
  getUrlWithoutLegacyHashRoute,
  getUrlForMetaMaskIosHashRouter,
  isMetaMaskIosInAppBrowser,
  shouldUseLegacyHashRouter,
  watchLegacyHashUrl,
} from "./legacyHashUrl";

const METAMASK_IOS_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WebView MetaMaskMobile";

describe("MetaMask iOS legacy routing", () => {
  it("detects the MetaMask iOS in-app browser", () => {
    expect(isMetaMaskIosInAppBrowser(METAMASK_IOS_USER_AGENT)).toBe(true);
    expect(isMetaMaskIosInAppBrowser("Mozilla/5.0 (Linux; Android 15) MetaMaskMobile")).toBe(false);
    expect(isMetaMaskIosInAppBrowser("Mozilla/5.0 (iPhone) Mobile Safari/604.1")).toBe(false);
  });

  it("uses hash routing for every route in the MetaMask iOS browser", () => {
    expect(shouldUseLegacyHashRouter(METAMASK_IOS_USER_AGENT)).toBe(true);
    expect(shouldUseLegacyHashRouter("Mobile Safari")).toBe(false);
  });

  it("moves a clean route into the hash without a document navigation", () => {
    expect(getUrlForMetaMaskIosHashRouter("https://app.gmx.io/trade?chainId=42161#orders")).toBe(
      "https://app.gmx.io/#/trade?chainId=42161#orders"
    );
  });

  it("leaves Privy OAuth params in the outer query", () => {
    expect(
      getUrlForMetaMaskIosHashRouter(
        "https://app.gmx.io/trade?privy_oauth_code=abc&privy_oauth_state=xyz&chainId=42161"
      )
    ).toBe("https://app.gmx.io/?privy_oauth_code=abc&privy_oauth_state=xyz#/trade?chainId=42161");
  });

  it("does not rewrite a route that is already hash based", () => {
    expect(getUrlForMetaMaskIosHashRouter("https://app.gmx.io/#/trade")).toBeUndefined();
  });

  it("merges an outer query into an existing hash route", () => {
    expect(getUrlForMetaMaskIosHashRouter("https://app.gmx.io/?ref=CODE#/trade?chainId=42161")).toBe(
      "https://app.gmx.io/#/trade?chainId=42161&ref=CODE"
    );
  });
});

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

  // The Privy SDK reads these from window.location.search to finish the OAuth redirect flow, and
  // any rewrite mid-flow silently breaks social login — the url must be left completely alone.
  it("leaves a url with Privy OAuth redirect params untouched", () => {
    expect(
      getUrlWithoutLegacyHashRoute("https://app.gmx.io/?privy_oauth_code=abc&privy_oauth_state=xyz#/trade")
    ).toBeUndefined();
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

describe("watchLegacyHashUrl", () => {
  // Following a legacy link from the path it points at only changes the fragment, so the document
  // is never reloaded and the load time rewrite cannot help.
  it("navigates when a legacy hash route is opened in place", () => {
    window.history.replaceState({}, "", "/");
    const navigate = vi.fn();
    const stop = watchLegacyHashUrl(navigate);

    window.history.replaceState({}, "", "/#/builders");
    window.dispatchEvent(new Event("hashchange"));

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(new URL(navigate.mock.calls[0][0]).pathname).toBe("/builders");
    stop();
  });

  it("keeps the query when navigating", () => {
    window.history.replaceState({}, "", "/");
    const navigate = vi.fn();
    const stop = watchLegacyHashUrl(navigate);

    window.history.replaceState({}, "", "/#/trade?ref=CODE");
    window.dispatchEvent(new Event("hashchange"));

    const target = new URL(navigate.mock.calls[0][0]);
    expect(`${target.pathname}${target.search}`).toBe("/trade?ref=CODE");
    stop();
  });

  // The default navigation must stay in-document: a `location.replace` reloads the app and kills
  // whatever is in flight, a wallet connect above all.
  it("rewrites the url in place by default, without a document navigation", () => {
    window.history.replaceState({}, "", "/");
    const onPopState = vi.fn();
    window.addEventListener("popstate", onPopState);
    const stop = watchLegacyHashUrl();

    window.history.replaceState({}, "", "/#/builders?utm_source=x");
    window.dispatchEvent(new Event("hashchange"));

    expect(`${window.location.pathname}${window.location.search}`).toBe("/builders?utm_source=x");
    expect(window.location.hash).toBe("");
    // react-router re-reads the location on popstate, but dismisses events with an undefined state.
    expect(onPopState).toHaveBeenCalledTimes(1);
    expect(onPopState.mock.calls[0][0].state).not.toBeUndefined();

    window.removeEventListener("popstate", onPopState);
    stop();
  });

  it("does not navigate while a Privy OAuth redirect is being finished", () => {
    window.history.replaceState({}, "", "/?privy_oauth_code=abc");
    const navigate = vi.fn();
    const stop = watchLegacyHashUrl(navigate);

    window.history.replaceState({}, "", "/?privy_oauth_code=abc#/trade");
    window.dispatchEvent(new Event("hashchange"));

    expect(navigate).not.toHaveBeenCalled();
    stop();
  });

  it("ignores a plain anchor change", () => {
    window.history.replaceState({}, "", "/buy_gmx");
    const navigate = vi.fn();
    const stop = watchLegacyHashUrl(navigate);

    window.history.replaceState({}, "", "/buy_gmx#bridge");
    window.dispatchEvent(new Event("hashchange"));

    expect(navigate).not.toHaveBeenCalled();
    stop();
  });

  it("stops listening once released", () => {
    window.history.replaceState({}, "", "/");
    const navigate = vi.fn();
    watchLegacyHashUrl(navigate)();

    window.history.replaceState({}, "", "/#/builders");
    window.dispatchEvent(new Event("hashchange"));

    expect(navigate).not.toHaveBeenCalled();
  });

  it("does not watch hash changes in the MetaMask iOS in-app browser", () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(METAMASK_IOS_USER_AGENT);
    window.history.replaceState({}, "", "/");
    const navigate = vi.fn();
    const stop = watchLegacyHashUrl(navigate);

    window.history.replaceState({}, "", "/#/trade");
    window.dispatchEvent(new Event("hashchange"));

    expect(navigate).not.toHaveBeenCalled();
    stop();
  });
});
