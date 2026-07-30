import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { TooltipProps } from "recharts";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { SortDirection } from "context/SorterContext/types";
import type { MarketOrderExecutionRow } from "domain/synthetics/orders/marketOrderExecutions";
import { OrderType } from "domain/synthetics/orders/types";
import { shortenAddress } from "lib/legacy";

import { MarketOrderChartTooltip, MarketOrderPairsTable, formatOracleAgeDuration } from "./MarketOrderExecution";

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
  creationReferenceTimestamp: null,
  creationReferenceTxnHash: null,
  creationReferenceProvider: null,
  creationReferenceObservationId: null,
  executionReferencePrice: null,
  executionReferenceTimestamp: null,
  executionReferenceTxnHash: null,
  executionReferenceProvider: null,
  executionReferenceObservationId: null,
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

function renderChartTooltip(row: MarketOrderExecutionRow) {
  if (row.kind !== "perp") {
    throw new Error("Expected a perp row");
  }

  const tooltipProps: TooltipProps<number, string> = {
    active: true,
    payload: [
      {
        payload: {
          ...row,
          delaySeconds: row.delaySeconds ?? 0,
          fillDeltaBps: row.fillDeltaBps ?? 0,
          marketName: "ETH / USD",
        },
      },
    ],
  };

  return render(
    <I18nProvider i18n={i18n}>
      <MarketOrderChartTooltip {...tooltipProps} chainId={42161} marketsInfoData={undefined} tokensData={undefined} />
    </I18nProvider>
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

  it("explains when no preceding oracle observation is available", () => {
    const { getAllByText } = renderTable("perp", "unspecified", vi.fn(), [PERP_ROW]);

    expect(getAllByText("No preceding Chainlink Data Streams observation available")).not.toHaveLength(0);
  });

  it("links the order and oracle transactions separately and shows a readable observation age", () => {
    const row: MarketOrderExecutionRow = {
      ...PERP_ROW,
      submittedTransactionHash: "0xcreation",
      creationReferencePrice: "100",
      creationReferenceTimestamp: 99,
      creationReferenceTxnHash: "0xoracle",
      creationReferenceProvider: "0xProvider",
      creationReferenceObservationId: "0xoracle:1",
      referenceAgeSeconds: 7_200,
      fillDeltaBps: 1,
    };
    const { getByRole, getByText } = renderTable("perp", "unspecified", vi.fn(), [row]);

    expect(getByRole("link", { name: "order tx" }).getAttribute("href")).toContain("tx/0xcreation");
    expect(getByRole("link", { name: "oracle tx" }).getAttribute("href")).toContain("tx/0xoracle");
    expect(getByText("2h before creation")).not.toBeNull();
  });
});

describe("MarketOrderChartTooltip", () => {
  it("distinguishes creation and execution observation provenance", () => {
    const row: MarketOrderExecutionRow = {
      ...PERP_ROW,
      creationReferencePrice: "100",
      creationReferenceTimestamp: 99,
      creationReferenceTxnHash: "0xCreationOracle",
      creationReferenceProvider: "0xCreationProvider",
      creationReferenceObservationId: "0xCreationOracle:1",
      referenceAgeSeconds: 1,
      executionReferencePrice: "101",
      executionReferenceTimestamp: 101,
      executionReferenceTxnHash: "0xExecutionOracle",
      executionReferenceProvider: "0xExecutionProvider",
      executionReferenceObservationId: "0xExecutionOracle:2",
      executionReferenceAgeSeconds: 0,
      executionPrice: "102",
      fillDeltaBps: 2,
    };
    const { getAllByRole, getAllByText, getByText } = renderChartTooltip(row);

    expect(getByText("Pre-creation oracle price")).not.toBeNull();
    expect(getByText("Oracle age at creation")).not.toBeNull();
    expect(getByText("Execution oracle price")).not.toBeNull();
    expect(getByText("Oracle age at execution")).not.toBeNull();
    expect(getByText("0xCreationProvider")).not.toBeNull();
    expect(getByText("0xExecutionProvider")).not.toBeNull();
    expect(getByText("0xCreationOracle:1")).not.toBeNull();
    expect(getByText("0xExecutionOracle:2")).not.toBeNull();
    expect(getAllByText("Chainlink Data Streams")).toHaveLength(2);

    const oracleLinks = getAllByRole("link", { name: "View" });
    expect(oracleLinks[0].getAttribute("href")).toContain("tx/0xCreationOracle");
    expect(oracleLinks[1].getAttribute("href")).toContain("tx/0xExecutionOracle");
  });

  it("does not claim an execution oracle source when its canonical observation is unavailable", () => {
    const { getAllByText } = renderChartTooltip(PERP_ROW);

    expect(getAllByText("Chainlink Data Streams")).toHaveLength(1);
  });
});

describe("formatOracleAgeDuration", () => {
  it.each([
    [59, "59s"],
    [90, "1.5m"],
    [7_200, "2h"],
    [172_800, "2d"],
  ])("formats %s seconds as %s", (value, expected) => {
    expect(formatOracleAgeDuration(value)).toBe(expected);
  });
});
