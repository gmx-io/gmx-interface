import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { SortDirection } from "context/SorterContext/types";
import type { MarketOrderExecutionRow } from "domain/synthetics/orders/marketOrderExecutions";
import { OrderType } from "domain/synthetics/orders/types";
import { shortenAddress } from "lib/legacy";

import { MarketOrderPairsTable } from "./MarketOrderExecution";

const EMPTY_ROWS: MarketOrderExecutionRow[] = [];
const ACCOUNT = "0x1234567890aBCDEF1234567890abCDef12345678";
const PERP_ROW: MarketOrderExecutionRow = {
  kind: "perp",
  orderKey: "0xorder",
  orderType: OrderType.MarketIncrease,
  account: ACCOUNT,
  marketAddress: "0x9876543210ABCDEF1234567890AbCdEf12345678",
  phase: "increase",
  side: "long",
  sizeDeltaUsd: "0",
  submittedTimestamp: 100,
  submittedTransactionHash: "0xcreation",
  executedTimestamp: 101,
  executedTransactionHash: "0xexecution",
  delaySeconds: 1,
};

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

afterEach(cleanup);

function renderTable({
  kind = "perp",
  rows = EMPTY_ROWS,
  direction = "unspecified",
  onChange = vi.fn(),
  isLoading = false,
}: {
  kind?: "perp" | "swap";
  rows?: MarketOrderExecutionRow[];
  direction?: SortDirection;
  onChange?: (direction: SortDirection) => void;
  isLoading?: boolean;
} = {}) {
  return render(
    <MemoryRouter>
      <I18nProvider i18n={i18n}>
        <MarketOrderPairsTable
          chainId={42161}
          kind={kind}
          rows={rows}
          marketsData={undefined}
          isLoading={isLoading}
          error={undefined}
          executionDelaySortDirection={direction}
          onExecutionDelaySortChange={onChange}
        />
      </I18nProvider>
    </MemoryRouter>
  );
}

describe("MarketOrderPairsTable", () => {
  it.each([
    ["unspecified", "none"],
    ["desc", "descending"],
    ["asc", "ascending"],
  ] as const)("exposes the execution delay sort direction %s", (direction, ariaSort) => {
    const { getByRole } = renderTable({ direction });

    expect(getByRole("columnheader", { name: "Execution delay" }).getAttribute("aria-sort")).toBe(ariaSort);
  });

  it.each([
    ["unspecified", "desc"],
    ["desc", "asc"],
    ["asc", "unspecified"],
  ] as const)("cycles the execution delay sort from %s to %s", (direction, expectedDirection) => {
    const onChange = vi.fn();
    const { getByRole } = renderTable({ direction, onChange });

    fireEvent.click(getByRole("button", { name: "Execution delay" }));

    expect(onChange).toHaveBeenCalledWith(expectedDirection);
  });

  it("renders six-column skeleton rows while loading", () => {
    const { container, queryByText } = renderTable({ isLoading: true });
    const tableBody = container.querySelector("tbody");
    const skeletonRows = tableBody?.querySelectorAll("tr");

    expect(tableBody?.getAttribute("aria-busy")).toBe("true");
    expect(skeletonRows).toHaveLength(10);
    skeletonRows?.forEach((row) => expect(row.querySelectorAll("td")).toHaveLength(6));
    expect(tableBody?.querySelector(".react-loading-skeleton")).not.toBeNull();
    expect(queryByText("No matching executions")).toBeNull();
  });

  it.each(["perp", "swap"] as const)("does not render price or oracle columns for %s orders", (kind) => {
    const { getByRole, queryByRole, queryByText } = renderTable({ kind });

    expect(getByRole("columnheader", { name: "Created" })).not.toBeNull();
    expect(getByRole("columnheader", { name: "Executed" })).not.toBeNull();
    expect(queryByRole("columnheader", { name: "Execution price" })).toBeNull();
    expect(queryByRole("columnheader", { name: "Price quality" })).toBeNull();
    expect(queryByText(/oracle/i)).toBeNull();
  });

  it("links accounts to the in-app account page", () => {
    const { getByRole } = renderTable({ rows: [PERP_ROW] });

    expect(getByRole("link", { name: shortenAddress(ACCOUNT, 13) }).getAttribute("href")).toBe(
      `/accounts/${ACCOUNT}?network=arbitrum&v=2`
    );
  });

  it("shows creation and execution timestamps with their transaction links", () => {
    const { getAllByText, getByRole } = renderTable({ rows: [PERP_ROW] });

    expect(getAllByText(/Jan 1, \d{2}:01:4[01]/)).toHaveLength(2);
    expect(getByRole("link", { name: "order tx" }).getAttribute("href")).toContain("tx/0xcreation");
    expect(getByRole("link", { name: "tx" }).getAttribute("href")).toContain("tx/0xexecution");
  });
});
