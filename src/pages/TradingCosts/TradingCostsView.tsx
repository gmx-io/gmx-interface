import { useMemo, useState } from "react";

import type { TradingCostRow, TradingCostSide } from "domain/tradingCosts/types";
import { formatUsd } from "lib/numbers";

import NumberInput from "components/NumberInput/NumberInput";
import SearchInput from "components/SearchInput/SearchInput";
import Select from "components/Select/Select";
import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import Tabs from "components/Tabs/Tabs";

export type HoldingPeriodPreset = "1" | "8" | "24" | "custom";

const SIDE_OPTIONS: { value: TradingCostSide; label: string }[] = [
  { value: "long", label: "Long" },
  { value: "short", label: "Short" },
];

const HOLDING_PERIOD_OPTIONS: { value: HoldingPeriodPreset; label: string }[] = [
  { value: "1", label: "1h" },
  { value: "8", label: "8h" },
  { value: "24", label: "24h" },
  { value: "custom", label: "Custom" },
];

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
        <Select
          value={holdingPeriodPreset}
          onChange={(event) => setHoldingPeriodPreset(event.target.value as HoldingPeriodPreset)}
          options={HOLDING_PERIOD_OPTIONS}
        />
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
                  <TableTd>{formatUsd(row.deltaUsd, { displayPlus: true }) ?? "-"}</TableTd>
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
