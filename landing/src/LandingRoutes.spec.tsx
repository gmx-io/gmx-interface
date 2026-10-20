import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter, Route, type RouteComponentProps } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LandingRoutes } from "./LandingRoutes";

vi.mock("lib/userAnalytics/UserAnalytics", () => ({
  userAnalytics: { pushEvent: vi.fn(), pushProfileProps: vi.fn(), setCommonEventParams: vi.fn() },
}));
vi.mock("./pages/Home/Home", () => ({ default: () => <h1>Home page</h1> }));
vi.mock("./pages/Rewards/Rewards", () => ({ default: () => <h1>Rewards page</h1> }));
vi.mock("landing/pages/Home/hooks/useGoToTrade", () => ({
  RedirectChainIds: { Arbitum: 42161 },
  useGoToTrade: () => vi.fn(),
}));
vi.mock("domain/synthetics/incentives/v2/useIncentivesConfig", () => ({
  useIncentivesConfig: () => ({ data: { programStartTimestamp: 0 } }),
}));

const initialEntries = ["/comeback?ref=TraderCode#season"];

beforeEach(() => {
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
  it("opens /comeback with the Rewards badge and preserves referral parameters", () => {
    let router!: RouteComponentProps;
    const view = render(
      <I18nProvider i18n={i18n}>
        <MemoryRouter initialEntries={initialEntries}>
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

    expect(view.getByRole("heading", { name: "Rewards page" })).toBeTruthy();
    expect(view.getByTitle("Season 1 · Live")).toBeTruthy();
    expect(router.location.search).toBe("?ref=TraderCode");
    expect(router.location.hash).toBe("#season");
  });
});
