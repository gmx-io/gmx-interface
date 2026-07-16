import { describe, expect, it } from "vitest";

import {
  calculateDeltaUsd,
  filterTradingCostRows,
  getCombinedStatus,
  numberToUsd,
  sortTradingCostRowsByVenueVolume,
  sumTradingCostComponents,
  usdToNumber,
} from "../costs";
import type { TradingCostRow } from "../types";

const readyBreakdown = {
  providerId: "gmx" as const,
  totalUsd: 0n,
  components: [],
  timestamp: 1,
  status: "ready" as const,
  warnings: [],
};

function row(overrides: Partial<TradingCostRow>): TradingCostRow {
  return {
    marketKey: "ETH:0x1",
    displayName: "ETH/USD [WETH-USDC]",
    indexSymbol: "ETH",
    venueVolume24hUsd: 0n,
    gmx: readyBreakdown,
    venue: { ...readyBreakdown, providerId: "hyperliquid" },
    deltaUsd: 0n,
    status: "ready",
    ...overrides,
  };
}

describe("trading cost helpers", () => {
  it("uses positive values as costs and negative values as rebates", () => {
    expect(
      sumTradingCostComponents([
        { key: "protocolFee", label: "Protocol fee", usd: 100n },
        { key: "openPriceImpact", label: "Open price impact", usd: -25n },
        { key: "networkFee", label: "Network fee", usd: 5n },
      ])
    ).toBe(80n);
  });

  it("calculates positive delta when GMX costs more than the venue", () => {
    expect(calculateDeltaUsd(150n, 90n)).toBe(60n);
    expect(calculateDeltaUsd(undefined, 90n)).toBeUndefined();
    expect(calculateDeltaUsd(150n, undefined)).toBeUndefined();
  });

  it("preserves USD values through number conversion within six decimal places", () => {
    const usd = numberToUsd(12.345678);
    expect(usdToNumber(usd)).toBeCloseTo(12.345678, 6);
  });

  it("combines statuses by severity", () => {
    expect(getCombinedStatus("ready", "ready")).toBe("ready");
    expect(getCombinedStatus("ready", "insufficientDepth")).toBe("insufficientDepth");
    expect(getCombinedStatus("providerError", "insufficientDepth")).toBe("providerError");
  });

  it("filters rows by market display name and symbol", () => {
    const rows = [
      row({ displayName: "ETH/USD [WETH-USDC]", indexSymbol: "ETH" }),
      row({ displayName: "BTC/USD [BTC-USDC]", indexSymbol: "BTC", marketKey: "BTC:0x2" }),
    ];

    expect(filterTradingCostRows(rows, "eth").map((r) => r.indexSymbol)).toEqual(["ETH"]);
    expect(filterTradingCostRows(rows, "btc-usd").map((r) => r.indexSymbol)).toEqual(["BTC"]);
    expect(filterTradingCostRows(rows, "").length).toBe(2);
  });

  it("sorts rows by selected venue 24h volume descending and puts unknown volume last", () => {
    const rows = [
      row({ indexSymbol: "ETH", venueVolume24hUsd: numberToUsd(100) }),
      row({ indexSymbol: "BTC", venueVolume24hUsd: numberToUsd(300), marketKey: "BTC:0x2" }),
      row({ indexSymbol: "SOL", venueVolume24hUsd: undefined, marketKey: "SOL:0x3" }),
    ];

    expect(sortTradingCostRowsByVenueVolume(rows).map((r) => r.indexSymbol)).toEqual(["BTC", "ETH", "SOL"]);
  });
});
