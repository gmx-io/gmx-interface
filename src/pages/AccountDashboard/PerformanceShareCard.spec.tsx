import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { USD_DECIMALS } from "config/factors";
import { SECONDS_IN_DAY } from "lib/dates";
import { expandDecimals } from "lib/numbers";

import { PerformanceShareCard } from "./PerformanceShareCard";
import type { AccountPnlHistoryPoint, PnlHistoricalData } from "./usePnlHistoricalData";

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

afterEach(cleanup);

const FIRST_TIMESTAMP = 1700000000;
const CHART_SELECTOR = ".recharts-responsive-container";

function buildPoint(index: number, cumulativePnlUsd: number | undefined): AccountPnlHistoryPoint {
  const hasValue = cumulativePnlUsd !== undefined;

  return {
    timestamp: FIRST_TIMESTAMP + index * SECONDS_IN_DAY,
    date: `day ${index}`,
    dateCompact: `d${index}`,
    pnl: hasValue ? expandDecimals(cumulativePnlUsd, USD_DECIMALS) : undefined,
    pnlFloat: cumulativePnlUsd,
    cumulativePnl: hasValue ? expandDecimals(cumulativePnlUsd, USD_DECIMALS) : undefined,
    cumulativePnlFloat: cumulativePnlUsd,
  } as AccountPnlHistoryPoint;
}

function buildPaddingPoints(count: number): AccountPnlHistoryPoint[] {
  return Array.from({ length: count }, (_unused, index) => buildPoint(index, undefined));
}

function renderCard(pnlHistory: AccountPnlHistoryPoint[], ref?: React.Ref<HTMLDivElement>) {
  return render(
    <I18nProvider i18n={i18n}>
      <PerformanceShareCard
        ref={ref}
        pnlBps={1234n}
        pnlUsd={expandDecimals(150, USD_DECIMALS)}
        winsLossesRatioBps={6000n}
        tradesCount={7}
        periodLabel="Today"
        pnlHistory={pnlHistory as PnlHistoricalData}
        loading={false}
        sharePerformanceBgImg={null}
        referralCodeOwnerKind="created"
        code="GMXCODE"
        showPnlAmounts
      />
    </I18nProvider>
  );
}

describe("PerformanceShareCard", () => {
  it("renders the chart when the period has at least two valid points", () => {
    const { container } = renderCard([buildPoint(0, 100), buildPoint(1, 150)]);

    expect(container.querySelector(CHART_SELECTOR)).not.toBeNull();
  });

  it("hides the chart area when the period has a single valid point", () => {
    const { container } = renderCard([...buildPaddingPoints(6), buildPoint(6, 150)]);

    expect(container.querySelector(CHART_SELECTOR)).toBeNull();
  });

  it("hides the chart area when the period has no valid points", () => {
    const { container } = renderCard(buildPaddingPoints(7));

    expect(container.querySelector(CHART_SELECTOR)).toBeNull();
  });

  it("keeps the stats visible on a single valid point", () => {
    const { container } = renderCard([buildPoint(0, 150)]);

    // the formatters separate the sign and the amount with a hair space, hence the loose whitespace matching
    expect(container.textContent).toMatch(/\+\s*12\.34%/);
    expect(container.textContent).toMatch(/\$\s*150\.00/);
    expect(container.textContent).toContain("Period");
    expect(container.textContent).toContain("Today");
    expect(container.textContent).toContain("Win rate");
    expect(container.textContent).toContain("60.00%");
    expect(container.textContent).toContain("Trades");
    expect(container.textContent).toContain("GMXCODE");
  });

  it("hides the chart area inside the element captured for the shared image", () => {
    const cardRef = createRef<HTMLDivElement>();
    renderCard([buildPoint(0, 150)], cardRef);

    expect(cardRef.current).not.toBeNull();
    expect(cardRef.current!.querySelector(CHART_SELECTOR)).toBeNull();
    expect(cardRef.current!.textContent).toMatch(/12\.34%/);
  });
});
