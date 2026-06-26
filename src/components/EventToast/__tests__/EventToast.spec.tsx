import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Switch } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import EventToast from "../EventToast";

afterEach(cleanup);

const stubToast = { visible: true } as any;
const ROOT_ENTRIES = ["/"];

const manageLiquidityEvent = {
  id: "delisting-liquidity",
  title: "Market delistings",
  bodyText: "Withdraw your liquidity.",
  link: { text: "Manage liquidity", href: "/pools" },
} as any;

const externalLinkEvent = {
  id: "external-event",
  title: "External link event",
  bodyText: "Visit our docs.",
  link: { text: "View docs", href: "https://example.com", newTab: true },
} as any;

describe("EventToast link rendering", () => {
  it("internal /pools link navigates via react-router (no full reload)", () => {
    render(
      <MemoryRouter initialEntries={ROOT_ENTRIES}>
        <Switch>
          <Route
            exact
            path="/"
            render={() => (
              <EventToast
                event={manageLiquidityEvent}
                id={manageLiquidityEvent.id}
                onClick={() => undefined}
                toast={stubToast}
              />
            )}
          />
          <Route path="/pools" render={() => <div>POOLS PAGE</div>} />
        </Switch>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("Manage liquidity"));

    expect(screen.getByText("POOLS PAGE")).toBeTruthy();
  });

  it("external link renders an anchor with target _blank and does not navigate the router", () => {
    render(
      <MemoryRouter initialEntries={ROOT_ENTRIES}>
        <Switch>
          <Route
            exact
            path="/"
            render={() => (
              <EventToast
                event={externalLinkEvent}
                id={externalLinkEvent.id}
                onClick={() => undefined}
                toast={stubToast}
              />
            )}
          />
          <Route render={() => <div>OTHER PAGE</div>} />
        </Switch>
      </MemoryRouter>
    );

    const anchor = screen.getByText("View docs").closest("a");
    expect(anchor).not.toBeNull();
    expect(anchor!.getAttribute("target")).toBe("_blank");
    expect(screen.queryByText("OTHER PAGE")).toBeNull();
  });
});
