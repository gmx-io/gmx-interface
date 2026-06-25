import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { ARBITRUM, ARBITRUM_SEPOLIA } from "config/chains";

vi.mock("lib/chains", () => ({
  useChainId: () => ({ chainId: ARBITRUM_SEPOLIA }),
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

vi.mock("pages/TradingCosts/TradingCosts", () => ({
  TradingCostsPage: () => <div>Trading Costs Page</div>,
}));

import { MainRoutes } from "./MainRoutes";

const COSTS_ROUTE_ENTRIES = ["/costs"];

describe("MainRoutes", () => {
  it("renders the trading costs dashboard against Arbitrum production markets", () => {
    render(
      <MemoryRouter initialEntries={COSTS_ROUTE_ENTRIES}>
        <MainRoutes openSettings={() => undefined} />
      </MemoryRouter>
    );

    expect(screen.getByText("Trading Costs Page")).toBeTruthy();
    expect(screen.getByTestId("synthetics-provider").getAttribute("data-page-type")).toBe("tradingCosts");
    expect(screen.getByTestId("synthetics-provider").getAttribute("data-override-chain-id")).toBe(String(ARBITRUM));
  });
});
