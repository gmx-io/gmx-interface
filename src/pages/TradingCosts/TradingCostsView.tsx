import { useMemo, useState } from "react";

import type { TradingCostRow, TradingCostSide } from "domain/tradingCosts/types";
import { formatDeltaUsd, formatUsd } from "lib/numbers";

import { DropdownSelector } from "components/DropdownSelector/DropdownSelector";
import NumberInput from "components/NumberInput/NumberInput";
import SearchInput from "components/SearchInput/SearchInput";
import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import Tabs from "components/Tabs/Tabs";

export type HoldingPeriodPreset = "1" | "8" | "24" | "custom";

const SIDE_OPTIONS: { value: TradingCostSide; label: string }[] = [
  { value: "long", label: "Long" },
  { value: "short", label: "Short" },
];

const HOLDING_PERIOD_OPTIONS: HoldingPeriodPreset[] = ["1", "8", "24", "custom"];
const HOLDING_PERIOD_LABELS: Record<HoldingPeriodPreset, string> = {
  "1": "1h",
  "8": "8h",
  "24": "24h",
  custom: "Custom",
};

function getGmxPriceImpactTotal(row: TradingCostRow) {
  const priceImpactComponents = row.gmx.components.filter(
    (component) => component.key === "openPriceImpact" || component.key === "closePriceImpact"
  );

  if (!priceImpactComponents.length) {
    return undefined;
  }

  return priceImpactComponents.reduce((total, component) => total + component.usd, 0n);
}

function getDeltaPercentage(row: TradingCostRow) {
  const deltaUsd = row.deltaUsd;
  const venueTotalUsd = row.venue.totalUsd;

  if (deltaUsd === undefined || venueTotalUsd === undefined || venueTotalUsd === 0n) {
    return undefined;
  }

  const denominator = venueTotalUsd < 0n ? -venueTotalUsd : venueTotalUsd;

  return (deltaUsd * 10000n) / denominator;
}

function formatTimestamp(timestamp: number | undefined) {
  if (timestamp === undefined) {
    return "-";
  }

  return new Date(timestamp).toLocaleString();
}

export function TradingCostsView({
  rows,
  isLoading,
  search,
  setSearch,
  sizeUsdInput,
  setSizeUsdInput,
  side,
  setSide,
  holdingPeriodPreset,
  setHoldingPeriodPreset,
  customHoldingHoursInput,
  setCustomHoldingHoursInput,
  takerFeeInput,
  setTakerFeeInput,
}: {
  rows: TradingCostRow[];
  isLoading: boolean;
  search: string;
  setSearch: (value: string) => void;
  sizeUsdInput: string;
  setSizeUsdInput: (value: string) => void;
  side: TradingCostSide;
  setSide: (value: TradingCostSide) => void;
  holdingPeriodPreset: HoldingPeriodPreset;
  setHoldingPeriodPreset: (value: HoldingPeriodPreset) => void;
  customHoldingHoursInput: string;
  setCustomHoldingHoursInput: (value: string) => void;
  takerFeeInput: string;
  setTakerFeeInput: (value: string) => void;
}) {
  const [selectedMarketKey, setSelectedMarketKey] = useState<string | undefined>();
  const selectedRow = useMemo(
    () => rows.find((row) => row.marketKey === selectedMarketKey) ?? rows[0],
    [rows, selectedMarketKey]
  );
  const holdingPeriodLabel =
    holdingPeriodPreset === "custom" ? `${customHoldingHoursInput || "0"}h` : `${holdingPeriodPreset}h`;

  return (
    <div className="TradingCosts">
      <div className="TradingCosts-header">
        <div>
          <h1>Trading Costs</h1>
          <p>Round-trip current cost comparison across matched perps markets.</p>
        </div>
        <div className="TradingCosts-provider">Compare venue: Hyperliquid</div>
      </div>

      <div className="TradingCosts-controls">
        <SearchInput value={search} setValue={setSearch} placeholder="Search market" className="TradingCosts-search" />
        <label>
          <span>Size, USD</span>
          <NumberInput
            value={sizeUsdInput}
            onValueChange={(event) => setSizeUsdInput(event.target.value)}
            className="TradingCosts-input"
          />
        </label>
        <Tabs
          type="inline"
          selectedValue={side}
          onChange={(value) => setSide(value as TradingCostSide)}
          options={SIDE_OPTIONS}
          className="TradingCosts-sideTabs"
        />
        <div className="TradingCosts-holdingPeriodDropdown">
          <DropdownSelector
            slim
            value={holdingPeriodPreset}
            onChange={setHoldingPeriodPreset}
            options={HOLDING_PERIOD_OPTIONS}
            item={({ option }) => <span className="text-typography-primary">{HOLDING_PERIOD_LABELS[option]}</span>}
            button={<span className="text-typography-primary">{HOLDING_PERIOD_LABELS[holdingPeriodPreset]}</span>}
          />
        </div>
        {holdingPeriodPreset === "custom" && (
          <label>
            <span>Custom hours</span>
            <NumberInput
              value={customHoldingHoursInput}
              onValueChange={(event) => setCustomHoldingHoursInput(event.target.value)}
              className="TradingCosts-input"
            />
          </label>
        )}
        <label>
          <span>Venue assumptions</span>
          <NumberInput
            value={takerFeeInput}
            onValueChange={(event) => setTakerFeeInput(event.target.value)}
            className="TradingCosts-input"
          />
        </label>
      </div>

      <div className="TradingCosts-layout">
        <div className="TradingCosts-tableWrap">
          <Table>
            <thead>
              <TableTheadTr>
                <TableTh>Market</TableTh>
                <TableTh>Venue volume</TableTh>
                <TableTh>GMX total</TableTh>
                <TableTh>Venue total</TableTh>
                <TableTh>Delta</TableTh>
                <TableTh>GMX price impact</TableTh>
                <TableTh>Status</TableTh>
              </TableTheadTr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <TableTr key={row.marketKey} hoverable onClick={() => setSelectedMarketKey(row.marketKey)}>
                  <TableTd>{row.displayName}</TableTd>
                  <TableTd>{formatUsd(row.venueVolume24hUsd) ?? "-"}</TableTd>
                  <TableTd>{formatUsd(row.gmx.totalUsd) ?? "-"}</TableTd>
                  <TableTd>{formatUsd(row.venue.totalUsd) ?? "-"}</TableTd>
                  <TableTd>
                    {formatDeltaUsd(row.deltaUsd, getDeltaPercentage(row), { showPlusForZero: true }) ?? "-"}
                  </TableTd>
                  <TableTd>{formatUsd(getGmxPriceImpactTotal(row), { displayPlus: true }) ?? "-"}</TableTd>
                  <TableTd>{row.status}</TableTd>
                </TableTr>
              ))}
            </tbody>
          </Table>
          {!rows.length && <div className="TradingCosts-empty">{isLoading ? "Loading..." : "No matched markets"}</div>}
        </div>

        <aside className="TradingCosts-details">
          <h2>Selected market</h2>
          {selectedRow ? (
            <>
              <div className="TradingCosts-detailTitle">{selectedRow.indexSymbol}</div>
              <div className="TradingCosts-detailSection">
                <h3>Scenario</h3>
                <DetailRow label="Size" value={`$${sizeUsdInput || "0"}`} />
                <DetailRow label="Side" value={side} />
                <DetailRow label="Holding period" value={holdingPeriodLabel} />
                <DetailRow label="Venue fee assumption" value={`${takerFeeInput || "0"}%`} />
              </div>
              <div className="TradingCosts-detailSection">
                <h3>Data timestamps</h3>
                <DetailRow label="GMX" value={formatTimestamp(selectedRow.gmx.timestamp)} />
                <DetailRow label="Venue" value={formatTimestamp(selectedRow.venue.timestamp)} />
              </div>
              <div className="TradingCosts-detailSection">
                <h3>Status details</h3>
                <DetailRow label="Row" value={selectedRow.status} />
                <DetailRow label="GMX" value={selectedRow.gmx.status} />
                <DetailRow label="Venue" value={selectedRow.venue.status} />
              </div>
              <Breakdown title="GMX" row={selectedRow} provider="gmx" />
              <Breakdown title="Venue" row={selectedRow} provider="venue" />
            </>
          ) : (
            <p>No market selected</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="TradingCosts-detailRow">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Breakdown({ title, row, provider }: { title: string; row: TradingCostRow; provider: "gmx" | "venue" }) {
  const breakdown = row[provider];

  return (
    <div className="TradingCosts-breakdown">
      <h3>{title}</h3>
      {breakdown.components.map((component, index) => (
        <div key={`${component.key}-${index}`} className="TradingCosts-breakdownRow">
          <span>{component.label}</span>
          <span>{formatUsd(component.usd) ?? "-"}</span>
        </div>
      ))}
      <div className="TradingCosts-breakdownTotal">
        <span>Total</span>
        <span>{formatUsd(breakdown.totalUsd) ?? "-"}</span>
      </div>
      {!!breakdown.warnings.length && (
        <ul>
          {breakdown.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
