import { cleanup, render } from "@testing-library/react";
import { MemoryRouter, Route } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { BUY_GMX_DEEP_LINK, useBuyGmxDeepLink } from "./buyGmxDeepLink";

const INITIAL_ENTRIES = [BUY_GMX_DEEP_LINK];

afterEach(cleanup);

function Probe() {
  const [isVisible] = useBuyGmxDeepLink();

  return <div>{isVisible ? "modal-open" : "modal-closed"}</div>;
}

describe("useBuyGmxDeepLink", () => {
  it("opens the modal on the deep link and drops the param from the url", () => {
    let url = "";

    const { container } = render(
      <MemoryRouter initialEntries={INITIAL_ENTRIES}>
        <Probe />
        <Route
          path="*"
          render={({ location }) => {
            url = `${location.pathname}${location.search}`;
            return null;
          }}
        />
      </MemoryRouter>
    );

    expect(container.textContent).toBe("modal-open");
    expect(url).toBe("/earn/portfolio");
  });
});
