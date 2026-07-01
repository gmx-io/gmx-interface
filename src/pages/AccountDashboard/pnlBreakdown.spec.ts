import { describe, expect, it } from "vitest";

import type { PnlSummaryPoint } from "domain/synthetics/accountStats/usePnlSummaryData";

import {
  getPnlBreakdownBaseRows,
  getPnlBreakdownComponentTotal,
  getPnlBreakdownFeeAndImpactRows,
} from "./pnlBreakdown";

function buildPnlSummaryPoint(overrides: Partial<PnlSummaryPoint>): PnlSummaryPoint {
  return {
    bucketLabel: "week",
    losses: 0,
    pnlBps: 0n,
    pnlUsd: 0n,
    pnlUsdRank: undefined,
    pnlBpsRank: undefined,
    volume: 0n,
    volumeRank: undefined,
    wins: 0,
    winsLossesRatioBps: undefined,
    usedCapitalUsd: 0n,

    realizedSwapImpactUsd: 0n,
    realizedBasePnlUsd: 0n,
    realizedFeesUsd: 0n,
    realizedSwapFeesUsd: 0n,
    realizedPriceImpactUsd: 0n,
    unrealizedBasePnlUsd: 0n,
    unrealizedFeesUsd: 0n,
    startUnrealizedBasePnlUsd: 0n,
    startUnrealizedFeesUsd: 0n,

    unrealizedFeesContributionUsd: 0n,
    startUnrealizedBasePnlContributionUsd: 0n,
    openFeesUsd: 0n,
    closeFeesUsd: 0n,
    borrowingFeesUsd: 0n,
    positiveFundingFeesUsd: 0n,
    negativeFundingFeesUsd: 0n,
    liquidationFeesUsd: 0n,
    realizedFeesRemainderUsd: 0n,
    netPriceImpactUsd: 0n,
    swapFeesUsd: 0n,
    swapPriceImpactUsd: 0n,

    ...overrides,
  };
}

describe("pnlBreakdown", () => {
  it("reconciles visible signed contribution rows to total PnL", () => {
    const row = buildPnlSummaryPoint({
      pnlUsd: 884n,
      realizedBasePnlUsd: 1000n,
      unrealizedBasePnlUsd: -200n,
      startUnrealizedBasePnlContributionUsd: 50n,
      openFeesUsd: -10n,
      closeFeesUsd: -20n,
      borrowingFeesUsd: -30n,
      positiveFundingFeesUsd: 40n,
      negativeFundingFeesUsd: -5n,
      liquidationFeesUsd: -1n,
      realizedFeesRemainderUsd: 2n,
      unrealizedFeesContributionUsd: -3n,
      netPriceImpactUsd: 60n,
      swapFeesUsd: -7n,
      swapPriceImpactUsd: 8n,
    });

    const visibleRowsTotal = [...getPnlBreakdownBaseRows(row), ...getPnlBreakdownFeeAndImpactRows(row)].reduce(
      (total, breakdownRow) => total + breakdownRow.value,
      0n
    );

    expect(visibleRowsTotal).toEqual(row.pnlUsd);
    expect(getPnlBreakdownComponentTotal(row)).toEqual(row.pnlUsd);
  });

  it("keeps optional zero-value rows hidden without changing reconciliation", () => {
    const row = buildPnlSummaryPoint({
      pnlUsd: -3n,
      realizedBasePnlUsd: 10n,
      openFeesUsd: -8n,
      closeFeesUsd: -5n,
      positiveFundingFeesUsd: 0n,
      liquidationFeesUsd: 0n,
    });

    const feeRowKeys = getPnlBreakdownFeeAndImpactRows(row).map((breakdownRow) => breakdownRow.key);

    expect(feeRowKeys).not.toContain("positiveFundingFeesUsd");
    expect(feeRowKeys).not.toContain("liquidationFeesUsd");
    expect(getPnlBreakdownComponentTotal(row)).toEqual(row.pnlUsd);
  });
});
