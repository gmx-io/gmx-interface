import type { TradingCostComponent, TradingCostRow, TradingCostStatus } from "./types";

export const USD_DECIMALS = 30n;
export const USD_PRECISION = 10n ** USD_DECIMALS;
const NUMBER_CONVERSION_DECIMALS = 6n;
const NUMBER_CONVERSION_PRECISION = 10n ** NUMBER_CONVERSION_DECIMALS;

const STATUS_SEVERITY: Record<TradingCostStatus, number> = {
  ready: 0,
  loading: 1,
  stale: 2,
  unmatched: 3,
  insufficientDepth: 4,
  providerError: 5,
};

export function numberToUsd(value: number): bigint {
  if (!Number.isFinite(value)) {
    return 0n;
  }

  return (
    BigInt(Math.round(value * Number(NUMBER_CONVERSION_PRECISION))) * 10n ** (USD_DECIMALS - NUMBER_CONVERSION_DECIMALS)
  );
}

export function usdToNumber(value: bigint | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  return Number(value) / Number(USD_PRECISION);
}

export function sumTradingCostComponents(components: TradingCostComponent[]): bigint {
  return components.reduce((sum, component) => sum + component.usd, 0n);
}

export function calculateDeltaUsd(gmxTotalUsd: bigint | undefined, venueTotalUsd: bigint | undefined) {
  if (gmxTotalUsd === undefined || venueTotalUsd === undefined) {
    return undefined;
  }

  return gmxTotalUsd - venueTotalUsd;
}

export function getCombinedStatus(...statuses: TradingCostStatus[]): TradingCostStatus {
  return statuses.reduce<TradingCostStatus>((highest, status) => {
    return STATUS_SEVERITY[status] > STATUS_SEVERITY[highest] ? status : highest;
  }, "ready");
}

export function filterTradingCostRows(rows: TradingCostRow[], query: string): TradingCostRow[] {
  const normalizedQuery = query.trim().toLowerCase().replace(/\//g, "-");

  if (!normalizedQuery) {
    return rows;
  }

  return rows.filter((row) => {
    const haystack = `${row.displayName} ${row.indexSymbol}`.toLowerCase().replace(/\//g, "-");
    return haystack.includes(normalizedQuery);
  });
}

export function sortTradingCostRowsByVenueVolume(rows: TradingCostRow[]): TradingCostRow[] {
  return [...rows].sort((a, b) => {
    if (a.venueVolume24hUsd === undefined && b.venueVolume24hUsd === undefined) return 0;
    if (a.venueVolume24hUsd === undefined) return 1;
    if (b.venueVolume24hUsd === undefined) return -1;
    if (a.venueVolume24hUsd === b.venueVolume24hUsd) return a.indexSymbol.localeCompare(b.indexSymbol);
    return a.venueVolume24hUsd > b.venueVolume24hUsd ? -1 : 1;
  });
}
