import { cleanup, fireEvent, render } from "@testing-library/react";
import { MemoryRouter, Route, Switch } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { customMock, dismissMock, getActionsMock, writeDismissalMock } = vi.hoisted(() => ({
  customMock: vi.fn(),
  dismissMock: vi.fn(),
  getActionsMock: vi.fn(),
  writeDismissalMock: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    custom: (...args: any[]) => customMock(...args),
    dismiss: (...args: any[]) => dismissMock(...args),
  },
}));

// All selectors return undefined; the orchestration result is fully stubbed below.
vi.mock("context/SyntheticsStateContext/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("context/SyntheticsStateContext/utils")>()),
  useSelector: () => undefined,
}));

vi.mock("../delistingExitAnnouncementsLogic", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../delistingExitAnnouncementsLogic")>()),
  getDelistingAnnouncementActions: (...args: any[]) => getActionsMock(...args),
  writeDismissal: (...args: any[]) => writeDismissalMock(...args),
}));

import { DelistingExitAnnouncements } from "../DelistingExitAnnouncements";

const ROOT_ENTRIES = ["/"];

describe("DelistingExitAnnouncements", () => {
  beforeEach(() => {
    customMock.mockClear();
    dismissMock.mockClear();
    getActionsMock.mockClear();
    writeDismissalMock.mockClear();
  });
  afterEach(cleanup);

  it("shows a toast for each item in toShow", () => {
    getActionsMock.mockReturnValue({
      toShow: [{ id: "delisting-positions", title: "Market delistings", bodyText: "body text", markets: ["0xA"] }],
      toDismiss: [],
    });

    render(<DelistingExitAnnouncements />);

    expect(customMock).toHaveBeenCalledTimes(1);
    expect(customMock.mock.calls[0][1]).toEqual({ id: "delisting-positions", style: {} });
  });

  it("close handler dismisses the toast and records the dismissal with its markets", () => {
    getActionsMock.mockReturnValue({
      toShow: [{ id: "delisting-positions", title: "Market delistings", bodyText: "body text", markets: ["0xA"] }],
      toDismiss: [],
    });

    render(<DelistingExitAnnouncements />);

    // Render the toast element returned by the toast.custom render function.
    const renderToast = customMock.mock.calls[0][0] as (t: any) => JSX.Element;
    const toastRender = render(renderToast({ visible: true }));
    fireEvent.click(toastRender.container.querySelector('[data-qa="close-toast"]')!);

    expect(dismissMock).toHaveBeenCalledWith("delisting-positions");
    expect(writeDismissalMock).toHaveBeenCalledWith("delisting-positions", ["0xA"], expect.any(Number));
  });

  it("renders the action link inline in the body and navigates to /pools via react-router", () => {
    getActionsMock.mockReturnValue({
      toShow: [
        {
          id: "delisting-liquidity",
          title: "Market delistings",
          bodyText: "KTA/USD is being delisted. Withdraw your liquidity.",
          markets: ["0xB"],
          link: { text: "Manage liquidity", href: "/pools" },
        },
      ],
      toDismiss: [],
    });

    render(<DelistingExitAnnouncements />);

    const renderToast = customMock.mock.calls[0][0] as (t: any) => JSX.Element;
    const r = render(
      <MemoryRouter initialEntries={ROOT_ENTRIES}>
        <Switch>
          <Route exact path="/" render={() => renderToast({ visible: true })} />
          <Route path="/pools" render={() => <div>POOLS PAGE</div>} />
        </Switch>
      </MemoryRouter>
    );

    // The link is part of the toast body (not a separate field) and uses client-side navigation.
    const link = r.getByText("Manage liquidity");
    expect(link.closest("a")).not.toBeNull();
    fireEvent.click(link);
    expect(r.getByText("POOLS PAGE")).toBeTruthy();
  });
});
