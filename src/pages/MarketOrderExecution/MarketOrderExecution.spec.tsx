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
  submittedTransactionHash: null,
  executedTimestamp: 101,
  executedTransactionHash: "0xexecution",
  delaySeconds: 1,
  creationReferencePrice: null,
  executionReferencePrice: null,
  executionPrice: null,
  referenceAgeSeconds: null,
  executionReferenceAgeSeconds: null,
  fillDeltaBps: null,
  oracleMoveBps: null,
  executionImpactBps: null,
};

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

afterEach(cleanup);

function renderTable(
  kind: "perp" | "swap",
  direction: SortDirection,
  onChange = vi.fn(),
  rows: MarketOrderExecutionRow[] = EMPTY_ROWS,
  executionTimeDirection: SortDirection = "unspecified",
  onExecutionTimeChange = vi.fn(),
  isLoading = false
) {
  return render(
    <MemoryRouter>
      <I18nProvider i18n={i18n}>
        <MarketOrderPairsTable
          chainId={42161}
          kind={kind}
          rows={rows}
          marketsInfoData={undefined}
          tokensData={undefined}
          isLoading={isLoading}
          error={undefined}
          executionTimeSortDirection={executionTimeDirection}
          priceImprovementSortDirection={direction}
          onExecutionTimeSortChange={onExecutionTimeChange}
          onPriceImprovementSortChange={onChange}
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
  ] as const)("exposes the execution time sort direction %s", (direction, ariaSort) => {
    const { getByRole, queryByText } = renderTable("perp", "unspecified", vi.fn(), EMPTY_ROWS, direction);

    expect(getByRole("columnheader", { name: "Execution time" }).getAttribute("aria-sort")).toBe(ariaSort);
    expect(queryByText("Time Δ")).toBeNull();
  });

  it.each([
    ["unspecified", "desc"],
    ["desc", "asc"],
    ["asc", "unspecified"],
  ] as const)("cycles the execution time sort from %s to %s", (direction, expectedDirection) => {
    const onChange = vi.fn();
    const { getByRole } = renderTable("perp", "unspecified", vi.fn(), EMPTY_ROWS, direction, onChange);

    fireEvent.click(getByRole("button", { name: "Execution time" }));

    expect(onChange).toHaveBeenCalledWith(expectedDirection);
  });

  it.each([
    ["unspecified", "none"],
    ["desc", "descending"],
    ["asc", "ascending"],
  ] as const)("exposes the execution price sort direction %s", (direction, ariaSort) => {
    const { getByRole } = renderTable("perp", direction);

    expect(getByRole("columnheader", { name: "Execution price" }).getAttribute("aria-sort")).toBe(ariaSort);
  });

  it.each([
    ["unspecified", "desc"],
    ["desc", "asc"],
    ["asc", "unspecified"],
  ] as const)("cycles the execution price sort from %s to %s", (direction, expectedDirection) => {
    const onChange = vi.fn();
    const { getByRole } = renderTable("perp", direction, onChange);

    fireEvent.click(getByRole("button", { name: "Execution price" }));

    expect(onChange).toHaveBeenCalledWith(expectedDirection);
  });

  it("renders table-shaped skeleton rows while loading", () => {
    const { container, queryByText } = renderTable(
      "perp",
      "unspecified",
      vi.fn(),
      EMPTY_ROWS,
      "unspecified",
      vi.fn(),
      true
    );
    const tableBody = container.querySelector("tbody");
    const skeletonRows = tableBody?.querySelectorAll("tr");

    expect(tableBody?.getAttribute("aria-busy")).toBe("true");
    expect(skeletonRows).toHaveLength(10);
    skeletonRows?.forEach((row) => expect(row.querySelectorAll("td")).toHaveLength(7));
    expect(tableBody?.querySelector(".react-loading-skeleton")).not.toBeNull();
    expect(queryByText("No matching executions")).toBeNull();
  });

  it("does not offer price improvement sorting for swaps", () => {
    const { getByRole, queryByRole } = renderTable("swap", "unspecified");

    expect(getByRole("columnheader", { name: "Execution time" }).getAttribute("aria-sort")).toBe("none");
    expect(getByRole("button", { name: "Execution time" })).not.toBeNull();
    expect(getByRole("columnheader", { name: "Price quality" }).hasAttribute("aria-sort")).toBe(false);
    expect(queryByRole("button", { name: "Price quality" })).toBeNull();
  });

  it("links accounts to the in-app account page", () => {
    const { getByRole } = renderTable("perp", "unspecified", vi.fn(), [PERP_ROW]);

    expect(getByRole("link", { name: shortenAddress(ACCOUNT, 13) }).getAttribute("href")).toBe(
      `/accounts/${ACCOUNT}?network=arbitrum&v=2`
    );
  });
});
