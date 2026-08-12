import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, ARBITRUM_SEPOLIA } from "config/chains";

import { MainRoutes } from "./MainRoutes";

const chainState = vi.hoisted(() => ({ chainId: 0 }));

vi.mock("lib/chains", () => ({
  useChainId: () => ({ chainId: chainState.chainId }),
}));

vi.mock("context/SyntheticsStateContext/SyntheticsStateContextProvider", () => ({
  SyntheticsStateContextProvider: ({
    children,
    overrideChainId,
    pageType,
  }: {
    children: React.ReactNode;
    overrideChainId?: number;
    pageType: string;
  }) => (
    <div data-override-chain-id={overrideChainId ?? ""} data-page-type={pageType} data-testid="synthetics-provider">
      {children}
    </div>
  ),
}));

vi.mock("pages/Actions/ActionsRouter", () => ({
  AccountsRouter: () => <div>trader-activity-page</div>,
}));

vi.mock("pages/AccountDashboard/AccountDashboard", () => ({
  AccountDashboard: () => <div>trader-profile-page</div>,
}));

vi.mock("pages/TradingCosts/TradingCosts", () => ({
  TradingCostsPage: () => <div>Trading Costs Page</div>,
}));

vi.mock("pages/MarketOrderExecution/MarketOrderExecution", () => ({
  MarketOrderExecution: () => <div>Market Order Execution Page</div>,
}));

const ACCOUNT = "0x8446ea6eA4f7bECCe4b9dBC5c61Ce1e9Cd25f22f";

function noop() {
  return undefined;
}

afterEach(cleanup);

function toInitialEntries(entry: string) {
  return [entry];
}

function renderAt(entry: string) {
  let url = "";

  const { container } = render(
    <MemoryRouter initialEntries={toInitialEntries(entry)}>
      <MainRoutes openSettings={noop} />
      <Route
        path="*"
        render={({ location }) => {
          url = `${location.pathname}${location.search}`;
          return null;
        }}
      />
    </MemoryRouter>
  );

  return { url, text: container.textContent ?? "" };
}

describe("MainRoutes trader routes", () => {
  beforeEach(() => {
    chainState.chainId = ARBITRUM;
  });

  it("renders the trader activity page on /traders", () => {
    const { url, text } = renderAt("/traders?network=arbitrum&v=2");

    expect(url).toBe("/traders?network=arbitrum&v=2");
    expect(text).toContain("trader-activity-page");
  });

  it("renders the trader profile page on /traders/:account", () => {
    const { url, text } = renderAt(`/traders/${ACCOUNT}?network=arbitrum&v=2`);

    expect(url).toBe(`/traders/${ACCOUNT}?network=arbitrum&v=2`);
    expect(text).toContain("trader-profile-page");
  });

  describe("redirects legacy urls to /traders", () => {
    it.each([
      ["/accounts?network=avalanche&v=1", "/traders?network=avalanche&v=1"],
      ["/actions", "/traders"],
      ["/actions/v2", "/traders"],
      [`/accounts/${ACCOUNT}?network=avalanche&v=1`, `/traders/${ACCOUNT}?network=avalanche&v=1`],
      [`/actions/${ACCOUNT}`, `/traders/${ACCOUNT}`],
      [`/actions/v2/${ACCOUNT}?network=avalanche`, `/traders/${ACCOUNT}?network=avalanche&v=2`],
      [`/actions/v1/${ACCOUNT}`, `/traders/${ACCOUNT}?network=arbitrum&v=1`],
    ])("%s -> %s", (from, to) => {
      expect(renderAt(from).url).toBe(to);
    });
  });

  it("keeps an invalid address in the url so the page can report it", () => {
    const { url, text } = renderAt("/accounts/not-an-address?network=arbitrum&v=2");

    expect(url).toBe("/traders/not-an-address?network=arbitrum&v=2");
    expect(text).toContain("trader-profile-page");
  });
});

describe("MainRoutes dashboards", () => {
  beforeEach(() => {
    chainState.chainId = ARBITRUM_SEPOLIA;
  });

  it("renders the trading costs dashboard against Arbitrum production markets", () => {
    render(
      <MemoryRouter initialEntries={toInitialEntries("/costs")}>
        <MainRoutes openSettings={noop} />
      </MemoryRouter>
    );

    expect(screen.getByText("Trading Costs Page")).toBeTruthy();
    expect(screen.getByTestId("synthetics-provider").getAttribute("data-page-type")).toBe("tradingCosts");
    expect(screen.getByTestId("synthetics-provider").getAttribute("data-override-chain-id")).toBe(String(ARBITRUM));
  });

  it("renders the market order execution dashboard", async () => {
    render(
      <MemoryRouter initialEntries={toInitialEntries("/market_order_execution")}>
        <MainRoutes openSettings={noop} />
      </MemoryRouter>
    );

    await vi.dynamicImportSettled();
    expect(await screen.findByText("Market Order Execution Page")).toBeTruthy();
  });
});
