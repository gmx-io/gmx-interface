import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter, Route } from "react-router-dom";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";

import { AccountDashboard } from "./AccountDashboard";

vi.mock("lib/chains", () => ({
  useChainId: () => ({ chainId: ARBITRUM }),
}));

vi.mock("components/AppPageLayout/AppPageLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("components/ChainContentHeader/ChainContentHeader", () => ({
  ChainContentHeader: () => null,
}));

vi.mock("context/SyntheticsStateContext/SyntheticsStateContextProvider", () => ({
  SyntheticsStateContextProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("components/AddressView/AddressView", () => ({
  default: ({ address }: { address: string }) => <span>{address}</span>,
}));

vi.mock("./VersionNetworkSwitcherRow", () => ({
  VersionNetworkSwitcherRow: () => null,
}));

vi.mock("./GeneralPerformanceDetails", () => ({
  GeneralPerformanceDetails: () => null,
}));

vi.mock("./DailyAndCumulativePnL", () => ({
  DailyAndCumulativePnL: () => null,
}));

vi.mock("./HistoricalLists", () => ({
  HistoricalLists: () => null,
}));

const ACCOUNT = "0x8446ea6eA4f7bECCe4b9dBC5c61Ce1e9Cd25f22f";

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

afterEach(cleanup);

function renderAt(entry: string) {
  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter initialEntries={[entry]}>
        <Route exact path="/traders/:account">
          <AccountDashboard />
        </Route>
      </MemoryRouter>
    </I18nProvider>
  );
}

describe("AccountDashboard", () => {
  it("reports an invalid address on /traders/:account", () => {
    const { getByText, queryByText } = renderAt("/traders/not-an-address?network=arbitrum&v=2");

    expect(getByText("Invalid Ethereum address")).toBeTruthy();
    expect(getByText("Trader Profile")).toBeTruthy();
    expect(queryByText("GMX Account")).toBeNull();
  });

  it("titles the page Trader Profile for a valid address", () => {
    const { getByText, queryByText } = renderAt(`/traders/${ACCOUNT}?network=arbitrum&v=2`);

    expect(getByText("Trader Profile")).toBeTruthy();
    expect(getByText(ACCOUNT)).toBeTruthy();
    expect(queryByText("Invalid Ethereum address")).toBeNull();
    expect(queryByText("GMX Account")).toBeNull();
  });
});
