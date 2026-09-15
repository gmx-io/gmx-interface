import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { HeaderMenu } from "landing/components/HeaderMenu/HeaderMenu";
import { MemoryRouter, Route } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { userAnalytics } from "lib/userAnalytics/UserAnalytics";

import Rewards from "./Rewards";

vi.mock("lib/userAnalytics/UserAnalytics", () => ({
  userAnalytics: {
    pushEvent: vi.fn(),
    getSessionForwardParams: () => "sessionId=original-user&utm_source=original&utm_medium=email",
  },
}));
vi.mock("landing/pages/Home/contexts/HomePageContext", () => ({
  useHomePageContext: () => ({ redirectWithWarning: vi.fn() }),
}));
vi.mock("domain/synthetics/incentives/v2/useIncentivesConfig", () => ({
  useIncentivesConfig: () => ({ data: undefined, loading: true }),
}));
vi.mock("./ReturningTrader", () => ({ ReturningTrader: () => null }));
vi.mock("./RewardsEpochSummary", () => ({ RewardsEpochSummary: () => null }));
vi.mock("./RewardsMultipliers", () => ({ RewardsMultipliers: () => null }));
vi.mock("./RewardsTokens", () => ({ RewardsTokens: () => null }));
vi.mock("./RewardsFaq", () => ({ RewardsFaq: () => null }));

const initialEntries = ["/rewards"];
let destination: { href: string };

function Page() {
  return (
    <I18nProvider i18n={i18n}>
      <MemoryRouter initialEntries={initialEntries}>
        <HeaderMenu />
        <Route exact path="/rewards">
          <Rewards />
        </Route>
      </MemoryRouter>
    </I18nProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  i18n.load("en", {});
  i18n.activate("en");
  destination = { href: "https://preview.example/rewards" };
  vi.spyOn(window, "location", "get").mockReturnValue(destination as Location);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("rewards landing analytics", () => {
  it("tracks one page view per visit, including navigating back from home", () => {
    const view = render(<Page />);
    view.rerender(<Page />);
    const pageViews = () =>
      vi
        .mocked(userAnalytics.pushEvent)
        .mock.calls.filter(([event]) => "action" in event.data && event.data.action === "RewardsPageView");
    expect(pageViews()).toHaveLength(1);
    fireEvent.click(view.getByRole("link", { name: "GMX" }));
    fireEvent.click(view.getByRole("link", { name: "Rewards" }));
    expect(pageViews()).toHaveLength(2);
  });

  it.each([
    ["Calculator", 0],
    ["MobileCalculator", 1],
    ["Closing", 2],
  ])("tracks %s trading clicks and forwards the existing attribution", (placement, index) => {
    const view = render(<Page />);
    fireEvent.click(view.getAllByRole("button", { name: "Start Trading" })[index]);
    expect(userAnalytics.pushEvent).toHaveBeenLastCalledWith(
      { event: "RewardsPageAction", data: { action: "StartTradingClick", placement } },
      { instantSend: true }
    );
    const url = new URL(destination.href);
    expect(url.pathname).toBe("/trade");
    expect(url.searchParams.get("sessionId")).toBe("original-user");
    expect(url.searchParams.get("utm_source")).toBe("original");
    expect(url.searchParams.get("utm_medium")).toBe("email");
  });

  it.each([false, true])("attributes the rewards header trade button (mobile menu: %s)", (mobile) => {
    const view = render(<Page />);
    if (mobile) fireEvent.click(view.getByRole("button", { name: "Open menu" }));
    fireEvent.click(view.getAllByRole("button", { name: "Open app" }).at(-1)!);
    expect(userAnalytics.pushEvent).toHaveBeenLastCalledWith(
      {
        event: "RewardsPageAction",
        data: { action: "StartTradingClick", placement: mobile ? "MobileMenu" : "Header" },
      },
      { instantSend: true }
    );
  });
});
