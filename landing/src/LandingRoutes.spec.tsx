import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import { Link, MemoryRouter, Route, type RouteComponentProps } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { userAnalytics } from "lib/userAnalytics/UserAnalytics";

import { LandingRoutes } from "./LandingRoutes";

vi.mock("lib/userAnalytics/UserAnalytics", () => ({
  userAnalytics: { pushEvent: vi.fn(), pushProfileProps: vi.fn(), setCommonEventParams: vi.fn() },
}));
vi.mock("./pages/Home/Home", () => ({ default: () => <h1>Home page</h1> }));
vi.mock("./pages/Rewards/Rewards", () => ({
  default: () => (
    <>
      <h1>Rewards page</h1>
      <Link to="/rewards-terms-and-conditions">Terms and Conditions</Link>
    </>
  ),
}));
vi.mock("./pages/Builders/Builders", () => ({ default: () => <h1>Builders page</h1> }));
vi.mock("./pages/TraderAffiliateProgram/TraderAffiliateProgram", () => ({ default: () => <h1>VIP page</h1> }));
vi.mock("./pages/TermsAndConditions/TermsAndConditions", () => ({ default: () => <h1>Terms page</h1> }));
vi.mock("./pages/ReferralTerms/ReferralTerms", () => ({ default: () => <h1>Referral terms page</h1> }));
vi.mock("./pages/RewardsTermsAndConditions/RewardsTermsAndConditions", () => ({
  default: () => <h1>Rewards terms page</h1>,
}));
vi.mock("landing/pages/Home/hooks/useGoToTrade", () => ({
  RedirectChainIds: { Arbitum: 42161 },
  useGoToTrade: () => vi.fn(),
}));

function toInitialEntries(entry: string) {
  return [entry];
}

function renderAt(entry = "/") {
  let router!: RouteComponentProps;
  const view = render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter initialEntries={toInitialEntries(entry)}>
        <LandingRoutes />
        <Route
          render={(props) => {
            router = props;
            return null;
          }}
        />
      </MemoryRouter>
    </I18nProvider>
  );

  return {
    ...view,
    get router() {
      return router;
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  i18n.load("en", {});
  i18n.activate("en");
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("landing navigation", () => {
  it("preserves the header when navigating to Rewards, home, and through history", () => {
    const view = renderAt();
    const header = view.container.querySelector("[data-landing-header]");
    expect(header).not.toBeNull();
    expect(view.queryByTitle("Season 1 · Live")).toBeNull();

    fireEvent.click(view.getByRole("link", { name: "Rewards" }));
    expect(userAnalytics.pushEvent).toHaveBeenCalledWith(
      { event: "LandingPageAction", data: { action: "RewardsPageClick" } },
      { instantSend: true }
    );
    expect(view.router.location.pathname).toBe("/rewards");
    expect(view.getByRole("heading", { name: "Rewards page" })).toBeTruthy();
    expect(view.getByTitle("Season 1 · Live")).toBeTruthy();
    expect(view.container.querySelector("[data-landing-header]")).toBe(header);
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0);

    fireEvent.click(view.getByRole("link", { name: "GMX" }));
    expect(view.router.location.pathname).toBe("/");
    expect(view.getByRole("heading", { name: "Home page" })).toBeTruthy();
    expect(view.queryByTitle("Season 1 · Live")).toBeNull();
    expect(view.container.querySelector("[data-landing-header]")).toBe(header);

    act(() => view.router.history.goBack());
    expect(view.getByTitle("Season 1 · Live")).toBeTruthy();
    expect(view.getByRole("heading", { name: "Rewards page" })).toBeTruthy();
    expect(view.container.querySelector("[data-landing-header]")).toBe(header);

    act(() => view.router.history.goForward());
    expect(view.queryByTitle("Season 1 · Live")).toBeNull();
    expect(view.getByRole("heading", { name: "Home page" })).toBeTruthy();
    expect(view.container.querySelector("[data-landing-header]")).toBe(header);
  });

  it("closes the mobile menu after a link, logo, or history navigation", () => {
    const view = renderAt();
    fireEvent.click(view.getByRole("button", { name: "Open menu" }));
    const menu = view.container.querySelector<HTMLElement>("#landing-mobile-menu")!;
    fireEvent.click(within(menu).getByRole("link", { name: "Rewards" }));
    expect(userAnalytics.pushEvent).toHaveBeenCalledWith(
      { event: "LandingPageAction", data: { action: "RewardsPageClick" } },
      { instantSend: true }
    );
    expect(view.getByRole("heading", { name: "Rewards page" })).toBeTruthy();
    expect(view.queryByRole("button", { name: "Close menu" })).toBeNull();
    expect(view.container.querySelector("#landing-mobile-menu")).toBeNull();

    fireEvent.click(view.getByRole("button", { name: "Open menu" }));
    fireEvent.click(view.getByRole("link", { name: "GMX" }));
    expect(view.getByRole("heading", { name: "Home page" })).toBeTruthy();
    expect(view.container.querySelector("#landing-mobile-menu")).toBeNull();

    fireEvent.click(view.getByRole("button", { name: "Open menu" }));
    act(() => view.router.history.goBack());
    expect(view.getByRole("heading", { name: "Rewards page" })).toBeTruthy();
    expect(view.container.querySelector("#landing-mobile-menu")).toBeNull();
  });

  it("keeps the shared header on lazy landing pages and omits it on legal pages", async () => {
    const view = renderAt("/rewards");
    const header = view.container.querySelector("[data-landing-header]");

    await act(async () => {
      fireEvent.click(view.getByRole("link", { name: "Builders" }));
      await vi.dynamicImportSettled();
    });
    expect(await view.findByRole("heading", { name: "Builders page" })).toBeTruthy();
    expect(view.container.querySelector("[data-landing-header]")).toBe(header);
    expect(view.queryByTitle("Season 1 · Live")).toBeNull();

    await act(async () => {
      fireEvent.click(view.getByRole("link", { name: "VIP" }));
      await vi.dynamicImportSettled();
    });
    expect(await view.findByRole("heading", { name: "VIP page" })).toBeTruthy();
    expect(view.container.querySelector("[data-landing-header]")).toBe(header);

    fireEvent.click(view.getByRole("link", { name: "Rewards" }));
    await act(async () => {
      fireEvent.click(view.getByRole("link", { name: "Terms and Conditions" }));
      await vi.dynamicImportSettled();
    });
    expect(await view.findByRole("heading", { name: "Rewards terms page" })).toBeTruthy();
    expect(view.router.location.pathname).toBe("/rewards-terms-and-conditions");
    expect(view.container.querySelector("[data-landing-header]")).toBeNull();

    act(() => view.router.history.goBack());
    expect(view.getByRole("heading", { name: "Rewards page" })).toBeTruthy();
    expect(view.getByTitle("Season 1 · Live")).toBeTruthy();
    expect(view.container.querySelectorAll("[data-landing-header]")).toHaveLength(1);
  });

  it.each(["/rewards", "/rewards/", "/comeback"])(
    "opens %s with the Rewards badge and preserves referral parameters",
    (path) => {
      const view = renderAt(`${path}?ref=TraderCode#season`);
      expect(view.getByRole("heading", { name: "Rewards page" })).toBeTruthy();
      expect(view.getByTitle("Season 1 · Live")).toBeTruthy();
      expect(view.router.location.search).toBe("?ref=TraderCode");
      expect(view.router.location.hash).toBe("#season");
    }
  );

  it.each(["/rewards-terms-and-conditions", "/rewards-terms-and-conditions/"])(
    "opens the rewards terms directly at %s",
    async (path) => {
      const view = renderAt(path);
      expect(await view.findByRole("heading", { name: "Rewards terms page" })).toBeTruthy();
      expect(view.router.location.pathname).toBe(path);
      expect(view.container.querySelector("[data-landing-header]")).toBeNull();
    }
  );
});
