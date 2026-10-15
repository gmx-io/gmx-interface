import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { CLAIMS_HISTORY_PER_PAGE } from "config/ui";
import type { ClaimAction } from "domain/synthetics/claimHistory/types";
import { ClaimType } from "domain/synthetics/claimHistory/types";

import { ClaimsHistory } from "../ClaimsHistory";

const { state, setPageIndex } = vi.hoisted(() => ({
  state: {
    account: "0x0000000000000000000000000000000000000001" as string | undefined,
    chainId: 42161,
    claimActions: undefined as ClaimAction[] | undefined,
    isLoading: true,
    startDate: undefined as Date | undefined,
  },
  setPageIndex: vi.fn(),
}));

vi.mock("context/SyntheticsStateContext/hooks/globalsHooks", () => ({
  useAccount: () => state.account,
}));

vi.mock("context/SyntheticsStateContext/selectors/globalSelectors", () => ({
  selectChainId: vi.fn(),
}));

vi.mock("context/SyntheticsStateContext/utils", () => ({
  useSelector: () => state.chainId,
}));

vi.mock("domain/synthetics/claimHistory", () => ({
  useClaimCollateralHistory: () => ({
    claimActions: state.claimActions,
    isLoading: state.isLoading,
    hasMorePages: false,
    setPageIndex,
  }),
}));

vi.mock("lib/dates", () => ({
  useDateRange: () => [state.startDate, undefined, vi.fn()],
  useNormalizeDateRange: () => [state.startDate?.getTime(), undefined],
}));

vi.mock("lib/useBreakpoints", () => ({
  useBreakpoints: () => ({ isMobile: false }),
}));

vi.mock("components/Button/Button", () => ({
  default: ({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("components/DateRangeSelect/DateRangeSelect", () => ({ DateRangeSelect: () => null }));
vi.mock("components/TableMarketFilter/MarketFilter", () => ({ MarketFilter: () => "Market" }));
vi.mock("../filters/ActionFilter", () => ({ ActionFilter: () => "Action" }));
vi.mock("components/HistoryExport/HistoryExportModal", () => ({
  CLAIMS_EXPORT_OPTIONS: [],
  HistoryExportModal: () => null,
}));

vi.mock("../useClaimsHistoryExport", () => ({
  useClaimsHistoryExport: () => ({ isModalVisible: false, setIsModalVisible: vi.fn() }),
}));

vi.mock("../ClaimHistoryRow/ClaimHistoryRow", () => ({
  ClaimHistoryRow: ({ claimAction }: { claimAction: ClaimAction }) => (
    <tr data-claim-id={claimAction.id}>
      <td>{claimAction.id}</td>
      <td>ETH/USD</td>
      <td>$10</td>
    </tr>
  ),
}));

const geometry = {
  resultsHeight: 164,
  rowHeights: new Map<string, number>(),
};
let resizeObservers: ResizeObserverMock[];

class ResizeObserverMock {
  targets = new Set<Element>();

  constructor(private callback: ResizeObserverCallback) {
    resizeObservers.push(this);
  }

  observe(target: Element) {
    this.targets.add(target);
  }

  unobserve(target: Element) {
    this.targets.delete(target);
  }

  disconnect() {
    this.targets.clear();
  }

  notify() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

function claim(id: string): ClaimAction {
  return {
    id,
    type: "collateral",
    eventName: ClaimType.ClaimFunding,
    account: state.account!,
    timestamp: 1,
    transactionHash: id,
    tokens: [],
    amounts: [],
    tokenPrices: [],
    claimItems: [],
  };
}

function renderHistory() {
  const content = () => (
    <I18nProvider i18n={i18n}>
      <ClaimsHistory />
    </I18nProvider>
  );
  const view = render(content());

  return {
    ...view,
    rerender: () => view.rerender(content()),
    results: () => view.container.querySelector<HTMLDivElement>("[aria-busy]")!,
    rows: () => Array.from(view.container.querySelectorAll<HTMLTableRowElement>("tbody > tr")),
  };
}

function loadClaims(count = CLAIMS_HISTORY_PER_PAGE + 1) {
  state.isLoading = false;
  state.claimActions = Array.from({ length: count }, (_, index) => claim(`claim-${index}`));
  state.claimActions.forEach((action, index) => geometry.rowHeights.set(action.id, 52 + (index % 3) * 28));
  geometry.resultsHeight = 2184;
}

function startLoading() {
  state.claimActions = undefined;
  state.isLoading = true;
}

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

beforeEach(() => {
  state.account = "0x0000000000000000000000000000000000000001";
  state.chainId = 42161;
  state.claimActions = undefined;
  state.isLoading = true;
  state.startDate = undefined;
  setPageIndex.mockReset();
  geometry.resultsHeight = 164;
  geometry.rowHeights.clear();
  resizeObservers = [];
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const height = this.hasAttribute("aria-busy")
      ? geometry.resultsHeight
      : geometry.rowHeights.get(this.dataset.claimId ?? "") ?? 0;
    return new DOMRect(0, 0, 900, height);
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ClaimsHistory loading layout", () => {
  it("shows skeleton rows on a cold load without claiming the history is empty", () => {
    const view = renderHistory();

    expect(view.results().getAttribute("aria-busy")).toBe("true");
    expect(view.results().style.height).toBe("");
    expect(view.rows()).toHaveLength(10);
    expect(view.rows().every((row) => row.querySelector(".react-loading-skeleton"))).toBe(true);
    expect(view.container.querySelector("thead")).not.toBeNull();
    expect(view.queryByText("No claims yet")).toBeNull();
  });

  it("replaces an empty history with a compact skeleton in its existing footprint", () => {
    state.claimActions = [];
    state.isLoading = false;
    const view = renderHistory();
    expect(view.getByText("No claims yet")).toBeTruthy();

    state.startDate = new Date("2026-01-01T00:00:00Z");
    startLoading();
    view.rerender();

    expect(view.results().getAttribute("aria-busy")).toBe("true");
    expect(view.results().style.height).toBe("164px");
    expect(view.results().style.overflow).toBe("hidden");
    expect(view.rows()).toHaveLength(3);
    expect(view.rows().every((row) => row.querySelector(".react-loading-skeleton"))).toBe(true);
    view.rows().forEach((row) => expect(parseFloat(row.style.height)).toBeCloseTo(164 / 3));
    expect(view.container.querySelector("thead")).toBeNull();
    expect(view.queryByText("No claims yet")).toBeNull();
    expect(view.queryByText("No claims match the selected filters")).toBeNull();

    state.claimActions = [];
    state.isLoading = false;
    view.rerender();
    expect(view.results().style.height).toBe("");
    expect(view.results().getAttribute("aria-busy")).toBe("false");
    expect(view.container.querySelector(".react-loading-skeleton")).toBeNull();
    expect(view.getByText("No claims match the selected filters")).toBeTruthy();
  });

  it("preserves variable row heights and the full results footprint while hiding old rows and pagination", () => {
    loadClaims();
    const view = renderHistory();
    const loadedHeights = view.rows().map((row) => geometry.rowHeights.get(row.dataset.claimId!)!);
    expect(view.rows()).toHaveLength(CLAIMS_HISTORY_PER_PAGE);
    expect(view.container.querySelector(".pagination")).not.toBeNull();
    expect(view.container.querySelector(".pagination")?.closest("[aria-busy]")).toBe(view.results());

    startLoading();
    view.rerender();

    expect(view.results().style.height).toBe("2184px");
    expect(view.rows()).toHaveLength(CLAIMS_HISTORY_PER_PAGE);
    expect(view.rows().map((row) => parseFloat(row.style.height))).toEqual(loadedHeights);
    expect(view.rows().every((row) => row.querySelector(".react-loading-skeleton"))).toBe(true);
    expect(view.container.querySelector("[data-claim-id]")).toBeNull();
    expect(view.container.querySelector(".pagination")).toBeNull();
    expect(view.container.querySelector("thead")).not.toBeNull();

    state.isLoading = false;
    state.claimActions = [claim("new-period")];
    geometry.resultsHeight = 116;
    geometry.rowHeights.set("new-period", 80);
    view.rerender();

    expect(view.results().style.height).toBe("");
    expect(view.results().style.overflow).toBe("");
    expect(view.getByText("new-period")).toBeTruthy();
    expect(view.container.querySelector(".react-loading-skeleton")).toBeNull();

    startLoading();
    view.rerender();
    expect(view.results().style.height).toBe("116px");
    expect(view.rows()).toHaveLength(1);
    expect(view.rows()[0].style.height).toBe("80px");
  });

  it("updates the preserved footprint after the settled layout is resized", () => {
    loadClaims(1);
    const view = renderHistory();
    const observer = resizeObservers.find((item) => item.targets.has(view.results()))!;
    expect(observer).toBeDefined();
    geometry.resultsHeight = 196;
    geometry.rowHeights.set("claim-0", 160);
    act(() => observer.notify());

    startLoading();
    view.rerender();
    expect(view.results().style.height).toBe("196px");
    expect(view.rows()[0].style.height).toBe("160px");
    expect(observer.targets.size).toBe(0);
  });

  it("does not treat a failed request as a successful empty layout on retry", () => {
    loadClaims(1);
    const view = renderHistory();
    startLoading();
    view.rerender();
    expect(view.results().style.height).toBe("2184px");

    state.isLoading = false;
    geometry.resultsHeight = 36;
    view.rerender();
    expect(view.rows()).toHaveLength(0);
    expect(view.queryByText("No claims yet")).toBeNull();

    startLoading();
    view.rerender();
    expect(view.results().style.height).toBe("");
    expect(view.rows()).toHaveLength(10);
    expect(view.rows().every((row) => row.style.height === "")).toBe(true);
    expect(view.container.querySelector("thead")).not.toBeNull();
  });

  it.each(["account", "chain"])("does not reuse previous geometry after changing %s", (scope) => {
    loadClaims(1);
    const view = renderHistory();
    if (scope === "account") {
      state.account = "0x0000000000000000000000000000000000000002";
    } else {
      state.chainId = 43114;
    }
    startLoading();
    view.rerender();

    expect(view.results().getAttribute("aria-busy")).toBe("true");
    expect(view.results().style.height).toBe("");
    expect(view.rows()).toHaveLength(10);
    expect(view.rows().every((row) => row.style.height === "")).toBe(true);
    expect(view.container.querySelector("[data-claim-id]")).toBeNull();
  });

  it("releases the loading footprint and removes skeletons when the account disconnects", () => {
    loadClaims(1);
    const view = renderHistory();
    startLoading();
    view.rerender();
    expect(view.results().style.height).toBe("2184px");

    state.account = undefined;
    view.rerender();

    expect(view.results().getAttribute("aria-busy")).toBe("false");
    expect(view.results().style.height).toBe("");
    expect(view.container.querySelector(".react-loading-skeleton")).toBeNull();
    expect(view.container.querySelector("[data-claim-id]")).toBeNull();
    expect(view.getByText("No claims yet")).toBeTruthy();
  });
});
