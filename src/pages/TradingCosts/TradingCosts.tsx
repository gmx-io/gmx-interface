import { useMemo, useState } from "react";

import { numberToUsd } from "domain/tradingCosts/costs";
import type { TradingCostScenario, TradingCostSide } from "domain/tradingCosts/types";
import { useTradingCosts } from "domain/tradingCosts/useTradingCosts";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";

import type { HoldingPeriodPreset } from "./TradingCostsView";
import { TradingCostsView } from "./TradingCostsView";

import "./TradingCosts.scss";

const DEFAULT_SIZE_USD = "10000";
const DEFAULT_HYPERLIQUID_TAKER_FEE_PERCENT = "0.045";

export function TradingCostsPage() {
  const [search, setSearch] = useState("");
  const [sizeUsdInput, setSizeUsdInput] = useState(DEFAULT_SIZE_USD);
  const [side, setSide] = useState<TradingCostSide>("long");
  const [holdingPeriodPreset, setHoldingPeriodPreset] = useState<HoldingPeriodPreset>("8");
  const [customHoldingHoursInput, setCustomHoldingHoursInput] = useState("");
  const [takerFeeInput, setTakerFeeInput] = useState(DEFAULT_HYPERLIQUID_TAKER_FEE_PERCENT);

  const holdingPeriodHours =
    holdingPeriodPreset === "custom" ? Number(customHoldingHoursInput || "0") : Number(holdingPeriodPreset);
  const scenario = useMemo<TradingCostScenario>(
    () => ({
      sizeUsd: numberToUsd(Number(sizeUsdInput || "0")),
      side,
      holdingPeriodHours,
      comparisonVenue: "hyperliquid",
      venueAssumptions: {
        hyperliquid: { takerFeeRate: Number(takerFeeInput || "0") / 100 },
      },
    }),
    [holdingPeriodHours, side, sizeUsdInput, takerFeeInput]
  );

  const { rows, isLoading } = useTradingCosts({ scenario, search });

  return (
    <AppPageLayout title="Trading Costs" contentClassName="!max-w-[1760px]">
      <TradingCostsView
        rows={rows}
        isLoading={isLoading}
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
    </AppPageLayout>
  );
}
