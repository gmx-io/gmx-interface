import { useState } from "react";

import { numberToUsd } from "domain/tradingCosts/costs";
import type { TradingCostRow, TradingCostSide } from "domain/tradingCosts/types";

import type { HoldingPeriodPreset } from "../TradingCostsView";
import { TradingCostsView } from "../TradingCostsView";

import "../TradingCosts.scss";

const baseBreakdown = {
  providerId: "gmx" as const,
  totalUsd: numberToUsd(20),
  components: [
    { key: "protocolFee" as const, label: "Protocol fee", usd: numberToUsd(10) },
    { key: "openPriceImpact" as const, label: "Open price impact", usd: numberToUsd(3) },
    { key: "closePriceImpact" as const, label: "Close price impact", usd: numberToUsd(2) },
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
  {
    marketKey: "hyperliquid:BTC:0x2",
    displayName: "BTC/USD [WBTC-USDC]",
    indexSymbol: "BTC",
    venueVolume24hUsd: numberToUsd(2_500_000),
    gmx: { ...baseBreakdown, totalUsd: numberToUsd(32) },
    venue: { ...baseBreakdown, providerId: "hyperliquid", totalUsd: numberToUsd(28) },
    deltaUsd: numberToUsd(4),
    status: "ready",
  },
];

export function TradingCostsViewStory() {
  const [search, setSearch] = useState("");
  const [sizeUsdInput, setSizeUsdInput] = useState("10000");
  const [side, setSide] = useState<TradingCostSide>("long");
  const [holdingPeriodPreset, setHoldingPeriodPreset] = useState<HoldingPeriodPreset>("8");
  const [customHoldingHoursInput, setCustomHoldingHoursInput] = useState("");
  const [takerFeeInput, setTakerFeeInput] = useState("0.045");

  return (
    <TradingCostsView
      rows={rows}
      isLoading={false}
      search={search}
      setSearch={setSearch}
      sizeUsdInput={sizeUsdInput}
      setSizeUsdInput={setSizeUsdInput}
      side={side}
      setSide={setSide}
      holdingPeriodPreset={holdingPeriodPreset}
      setHoldingPeriodPreset={setHoldingPeriodPreset}
      customHoldingHoursInput={customHoldingHoursInput}
      setCustomHoldingHoursInput={setCustomHoldingHoursInput}
      takerFeeInput={takerFeeInput}
      setTakerFeeInput={setTakerFeeInput}
    />
  );
}
