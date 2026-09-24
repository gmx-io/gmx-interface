import { act, cleanup, render, screen } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { Route, Router, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { INCENTIVES_ROUTE_PATHS, IncentivesRoute } from "../IncentivesRoute";

vi.mock("pages/RewardsPage/RewardsPage", () => ({
  RewardsPage: () => <div data-testid="rewards-page" />,
}));

vi.mock("pages/RewardsPage/RewardsPageShell", () => ({
  RewardsPageLoadingShell: () => <div data-testid="rewards-loading-shell" />,
}));

function LocationProbe() {
  const { pathname, search } = useLocation();

  return <div data-testid="location">{`${pathname}${search}`}</div>;
}

async function renderRoute(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] });

  const result = render(
    <Router history={history}>
      <Route path={INCENTIVES_ROUTE_PATHS}>
        <IncentivesRoute />
      </Route>
      <LocationProbe />
    </Router>
  );

  await act(async () => undefined);

  return result;
}

describe("IncentivesRoute", () => {
  afterEach(cleanup);

  it("renders Rewards directly without a release flag", async () => {
    await renderRoute("/rewards/history?account=0x123");

    expect(await screen.findByTestId("rewards-page")).toBeDefined();
    expect(screen.getByTestId("location").textContent).toBe("/rewards/history?account=0x123");
  });

  it("redirects legacy Points deep links to Rewards and preserves the query", async () => {
    await renderRoute("/points/leaderboard?epoch=previous");

    expect(await screen.findByTestId("rewards-page")).toBeDefined();
    expect(screen.getByTestId("location").textContent).toBe("/rewards/leaderboard?epoch=previous");
  });

  it("redirects unknown Points tabs to the Rewards overview", async () => {
    await renderRoute("/points/dashboard?account=0x123");

    expect(await screen.findByTestId("rewards-page")).toBeDefined();
    expect(screen.getByTestId("location").textContent).toBe("/rewards?account=0x123");
  });
});
