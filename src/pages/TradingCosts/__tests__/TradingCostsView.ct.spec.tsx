import { expect, test } from "@playwright/experimental-ct-react";

import { numberToUsd } from "domain/tradingCosts/costs";
import type { TradingCostRow } from "domain/tradingCosts/types";

import { TradingCostsView } from "../TradingCostsView";

const baseBreakdown = {
  providerId: "gmx" as const,
  totalUsd: numberToUsd(20),
  components: [
    { key: "protocolFee" as const, label: "Protocol fee", usd: numberToUsd(10) },
    { key: "openPriceImpact" as const, label: "Open price impact", usd: numberToUsd(3) },
  ],
  timestamp: 1,
  status: "ready" as const,
  warnings: [],
};

const rows: TradingCostRow[] = [
  {
    marketKey: "hyperliquid:ETH:0x1",
    displayName: "ETH/USD [WETH-USDC]",
    indexSymbol: "ETH",
    venueVolume24hUsd: numberToUsd(1_000_000),
    gmx: baseBreakdown,
    venue: { ...baseBreakdown, providerId: "hyperliquid", totalUsd: numberToUsd(15) },
    deltaUsd: numberToUsd(5),
    status: "ready",
  },
];

test("renders generic venue labels and selected market details", async ({ mount }) => {
  const component = await mount(
    <TradingCostsView
      rows={rows}
      isLoading={false}
      search=""
      setSearch={() => undefined}
      sizeUsdInput="10000"
      setSizeUsdInput={() => undefined}
      side="long"
      setSide={() => undefined}
      holdingPeriodPreset="8"
      setHoldingPeriodPreset={() => undefined}
      customHoldingHoursInput=""
      setCustomHoldingHoursInput={() => undefined}
      takerFeeInput="0.045"
      setTakerFeeInput={() => undefined}
    />
  );

  await expect(component.getByText("Trading Costs")).toBeVisible();
  await expect(component.getByText("Venue total")).toBeVisible();
  await expect(component.getByText("GMX price impact")).toBeVisible();
  await expect(component.getByText("Venue assumptions")).toBeVisible();
  await expect(component.getByText("ETH/USD [WETH-USDC]")).toBeVisible();
  await expect(component.getByText("Selected market")).toBeVisible();
  await expect(component.getByText("Scenario")).toBeVisible();
  await expect(component.getByText("Data timestamps")).toBeVisible();
  await expect(component.getByText("Status details")).toBeVisible();
});
