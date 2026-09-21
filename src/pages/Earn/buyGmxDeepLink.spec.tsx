import { act, cleanup, render } from "@testing-library/react";
import { MemoryRouter, Route } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { getBuyGmxDeepLinkUrl, useBuyGmxDeepLink } from "./buyGmxDeepLink";

const DEEP_LINK = getBuyGmxDeepLinkUrl();
const INITIAL_ENTRIES = [DEEP_LINK];

afterEach(cleanup);

let setIsVisible: (isVisible: boolean) => void;

function Probe() {
  const [isVisible, setIsVisibleFromHook] = useBuyGmxDeepLink();
  setIsVisible = setIsVisibleFromHook;

  return <div>{isVisible ? "modal-open" : "modal-closed"}</div>;
}

function renderDeepLink() {
  let url = "";

  const renderTree = (probeKey: string) => (
    <MemoryRouter initialEntries={INITIAL_ENTRIES}>
      <Probe key={probeKey} />
      <Route
        path="*"
        render={({ location }) => {
          url = `${location.pathname}${location.search}`;
          return null;
        }}
      />
    </MemoryRouter>
  );

  const { container, rerender } = render(renderTree("mounted"));

  return { container, getUrl: () => url, remount: () => rerender(renderTree("remounted")) };
}

describe("useBuyGmxDeepLink", () => {
  it("opens the modal on the deep link and keeps the request in the url while it is open", () => {
    const { container, getUrl } = renderDeepLink();

    expect(container.textContent).toBe("modal-open");
    expect(getUrl()).toBe(DEEP_LINK);
  });

  it("keeps the modal open when a network change remounts the page", () => {
    const { container, remount } = renderDeepLink();

    remount();

    expect(container.textContent).toBe("modal-open");
  });

  it("drops the request from the url when the modal is closed", () => {
    const { container, getUrl } = renderDeepLink();

    act(() => setIsVisible(false));

    expect(container.textContent).toBe("modal-closed");
    expect(getUrl()).toBe("/earn/portfolio");
  });
});
