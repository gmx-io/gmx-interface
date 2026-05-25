# Trading Costs Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `#/costs` internal analytics page for current round-trip GMX trading costs compared with Hyperliquid through a venue-agnostic model.

**Architecture:** Add a new `src/domain/tradingCosts/` domain that owns shared types, pure cost math, market matching, provider adapters, and row composition. Add a dedicated `src/pages/TradingCosts/` page that consumes normalized rows and keeps visible UI labels generic so future venues can reuse the same surface.

**Tech Stack:** React 18, TypeScript, SWR, Vitest, Playwright component tests, existing GMX synthetics fee utilities, Hyperliquid Info API.

---

## File Structure

- Create `src/domain/tradingCosts/types.ts`: scenario, provider, component, breakdown, row, venue market, and Hyperliquid assumption types.
- Create `src/domain/tradingCosts/costs.ts`: shared pure helpers for USD conversion, component totals, delta, row status, search filtering, and default volume sorting.
- Create `src/domain/tradingCosts/marketMatching.ts`: venue-agnostic symbol normalization and GMX-to-venue market matching.
- Create `src/domain/tradingCosts/hyperliquid/types.ts`: typed Hyperliquid response and normalized market/book types.
- Create `src/domain/tradingCosts/hyperliquid/book.ts`: L2 book fill and cost/funding math.
- Create `src/domain/tradingCosts/hyperliquid/api.ts`: Hyperliquid `POST /info` fetchers.
- Create `src/domain/tradingCosts/hyperliquid/useHyperliquidData.ts`: SWR hooks for market context and L2 books.
- Create `src/domain/tradingCosts/gmx/gmxCost.ts`: GMX round-trip cost adapter using existing fee/gas utilities.
- Create `src/domain/tradingCosts/buildTradingCostRows.ts`: row composition from GMX markets, Hyperliquid data, and scenario inputs.
- Create `src/domain/tradingCosts/useTradingCosts.ts`: React hook that reads synthetics context and Hyperliquid hooks, then builds rows.
- Create `src/pages/TradingCosts/TradingCosts.tsx`: context-connected page container.
- Create `src/pages/TradingCosts/TradingCostsView.tsx`: pure presentational view for controls, table, and selected-row details.
- Create `src/pages/TradingCosts/TradingCosts.scss`: compact internal analytics layout styles.
- Create tests under `src/domain/tradingCosts/**/__tests__/` and `src/pages/TradingCosts/__tests__/`.
- Modify `src/context/SyntheticsStateContext/SyntheticsStateContextProvider.tsx`: add `tradingCosts` page type.
- Modify `src/App/MainRoutes.tsx`: add the `#/costs` route.
- Modify `src/components/SideNav/SideNav.tsx`: add `Costs` navigation item.

## Task 1: Shared Types And Cost Helpers

**Files:**
- Create: `src/domain/tradingCosts/types.ts`
- Create: `src/domain/tradingCosts/costs.ts`
- Test: `src/domain/tradingCosts/__tests__/costs.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/domain/tradingCosts/__tests__/costs.spec.ts`

Expected: FAIL because `src/domain/tradingCosts/costs.ts` does not exist.

- [ ] **Step 3: Add shared types**

Create `src/domain/tradingCosts/types.ts`:

```ts
import type { MarketInfo } from "domain/synthetics/markets";

export type TradingCostProviderId = "gmx" | "hyperliquid";
export type TradingCostSide = "long" | "short";
export type ComparisonVenueId = "hyperliquid";

export type HyperliquidVenueAssumptions = {
  takerFeeRate: number;
};

export type TradingCostScenario = {
  sizeUsd: bigint;
  side: TradingCostSide;
  holdingPeriodHours: number;
  comparisonVenue: ComparisonVenueId;
  venueAssumptions: {
    hyperliquid: HyperliquidVenueAssumptions;
  };
};

export type TradingCostComponentKey =
  | "protocolFee"
  | "openPriceImpact"
  | "closePriceImpact"
  | "netRate"
  | "networkFee"
  | "venueExecutionImpact"
  | "funding";

export type TradingCostComponent = {
  key: TradingCostComponentKey;
  label: string;
  usd: bigint;
};

export type TradingCostStatus =
  | "ready"
  | "loading"
  | "unmatched"
  | "insufficientDepth"
  | "providerError"
  | "stale";

export type TradingCostBreakdown = {
  providerId: TradingCostProviderId;
  totalUsd: bigint | undefined;
  components: TradingCostComponent[];
  timestamp: number | undefined;
  status: TradingCostStatus;
  warnings: string[];
};

export type TradingCostRow = {
  marketKey: string;
  displayName: string;
  indexSymbol: string;
  venueVolume24hUsd: bigint | undefined;
  gmx: TradingCostBreakdown;
  venue: TradingCostBreakdown;
  deltaUsd: bigint | undefined;
  status: TradingCostStatus;
};

export type ComparisonVenueMarket = {
  providerId: Exclude<TradingCostProviderId, "gmx">;
  symbol: string;
  displayName: string;
  volume24hUsd: bigint | undefined;
  isDisabled?: boolean;
};

export type MatchedTradingMarket = {
  gmxMarket: MarketInfo;
  venueMarket: ComparisonVenueMarket;
};
```

- [ ] **Step 4: Add cost helpers**

Create `src/domain/tradingCosts/costs.ts`:

```ts
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

  return BigInt(Math.round(value * Number(NUMBER_CONVERSION_PRECISION))) * 10n ** (USD_DECIMALS - NUMBER_CONVERSION_DECIMALS);
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `yarn vitest run src/domain/tradingCosts/__tests__/costs.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/tradingCosts/types.ts src/domain/tradingCosts/costs.ts src/domain/tradingCosts/__tests__/costs.spec.ts
git commit -m "feat: add trading cost core helpers"
```

## Task 2: Market Matching

**Files:**
- Create: `src/domain/tradingCosts/marketMatching.ts`
- Test: `src/domain/tradingCosts/__tests__/marketMatching.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";

import { matchGmxMarketsToVenueMarkets, normalizeMarketSymbol } from "../marketMatching";
import type { ComparisonVenueMarket } from "../types";

const hyperliquidEth: ComparisonVenueMarket = {
  providerId: "hyperliquid",
  symbol: "ETH",
  displayName: "ETH",
  volume24hUsd: 100n,
};

describe("market matching", () => {
  it("normalizes wrapped symbols to venue symbols", () => {
    expect(normalizeMarketSymbol("WETH")).toBe("ETH");
    expect(normalizeMarketSymbol("WBTC")).toBe("BTC");
    expect(normalizeMarketSymbol("kPEPE")).toBe("KPEPE");
  });

  it("matches every enabled non-spot GMX market with a venue symbol", () => {
    const ethMarket = createMockMarketInfo();
    const secondEthMarket = { ...ethMarket, marketTokenAddress: "0x222", name: "ETH/USD [ETH-USDT]" };

    const result = matchGmxMarketsToVenueMarkets([ethMarket, secondEthMarket], [hyperliquidEth]);

    expect(result.matched.map((item) => item.gmxMarket.marketTokenAddress)).toEqual([
      ethMarket.marketTokenAddress,
      "0x222",
    ]);
    expect(result.unmatched).toEqual([]);
  });

  it("excludes disabled, spot-only, and disabled venue markets from matched rows", () => {
    const enabledMarket = createMockMarketInfo();
    const disabledMarket = { ...createMockMarketInfo(), marketTokenAddress: "0xdisabled", isDisabled: true };
    const spotMarket = { ...createMockMarketInfo(), marketTokenAddress: "0xspot", isSpotOnly: true };

    const disabledVenue: ComparisonVenueMarket = { ...hyperliquidEth, isDisabled: true };

    expect(matchGmxMarketsToVenueMarkets([enabledMarket, disabledMarket, spotMarket], [disabledVenue]).matched).toEqual(
      []
    );
    expect(matchGmxMarketsToVenueMarkets([enabledMarket, disabledMarket, spotMarket], [hyperliquidEth]).matched).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/domain/tradingCosts/__tests__/marketMatching.spec.ts`

Expected: FAIL because `marketMatching.ts` does not exist.

- [ ] **Step 3: Add market matching implementation**

Create `src/domain/tradingCosts/marketMatching.ts`:

```ts
import type { MarketInfo } from "domain/synthetics/markets";

import type { ComparisonVenueMarket, MatchedTradingMarket } from "./types";

const SYMBOL_ALIASES: Record<string, string> = {
  WETH: "ETH",
  WBTC: "BTC",
};

export function normalizeMarketSymbol(symbol: string | undefined): string {
  const normalized = (symbol ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return SYMBOL_ALIASES[normalized] ?? normalized;
}

export function matchGmxMarketsToVenueMarkets(
  gmxMarkets: MarketInfo[],
  venueMarkets: ComparisonVenueMarket[]
): { matched: MatchedTradingMarket[]; unmatched: MarketInfo[] } {
  const venueBySymbol = new Map(
    venueMarkets.filter((market) => !market.isDisabled).map((market) => [normalizeMarketSymbol(market.symbol), market])
  );

  const matched: MatchedTradingMarket[] = [];
  const unmatched: MarketInfo[] = [];

  for (const gmxMarket of gmxMarkets) {
    if (gmxMarket.isDisabled || gmxMarket.isSpotOnly) {
      continue;
    }

    const symbol = normalizeMarketSymbol(gmxMarket.indexToken?.symbol);
    const venueMarket = venueBySymbol.get(symbol);

    if (!venueMarket) {
      unmatched.push(gmxMarket);
      continue;
    }

    matched.push({ gmxMarket, venueMarket });
  }

  return { matched, unmatched };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run src/domain/tradingCosts/__tests__/marketMatching.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/tradingCosts/marketMatching.ts src/domain/tradingCosts/__tests__/marketMatching.spec.ts
git commit -m "feat: match trading cost markets"
```

## Task 3: Hyperliquid Book And Funding Math

**Files:**
- Create: `src/domain/tradingCosts/hyperliquid/types.ts`
- Create: `src/domain/tradingCosts/hyperliquid/book.ts`
- Test: `src/domain/tradingCosts/hyperliquid/__tests__/book.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { numberToUsd, usdToNumber } from "../../costs";
import {
  getHyperliquidExecutionImpactUsd,
  getHyperliquidFundingCostUsd,
  simulateL2BookFill,
} from "../book";
import type { HyperliquidBookLevel } from "../types";

const asks: HyperliquidBookLevel[] = [
  { px: "100", sz: "1", n: 1 },
  { px: "110", sz: "2", n: 1 },
];

const bids: HyperliquidBookLevel[] = [
  { px: "99", sz: "1", n: 1 },
  { px: "98", sz: "2", n: 1 },
];

describe("Hyperliquid L2 book math", () => {
  it("fills a USD notional across multiple levels", () => {
    const fill = simulateL2BookFill({ levels: asks, sizeUsd: numberToUsd(210) });

    expect(fill.status).toBe("filled");
    expect(fill.averagePrice).toBeCloseTo(105, 6);
    expect(usdToNumber(fill.filledUsd)).toBeCloseTo(210, 6);
  });

  it("marks insufficient depth when returned levels cannot fill requested notional", () => {
    const fill = simulateL2BookFill({ levels: asks.slice(0, 1), sizeUsd: numberToUsd(250) });

    expect(fill.status).toBe("insufficientDepth");
    expect(usdToNumber(fill.filledUsd)).toBeCloseTo(100, 6);
  });

  it("calculates ask-side and bid-side execution impact as trader cost", () => {
    expect(usdToNumber(getHyperliquidExecutionImpactUsd({ sizeUsd: numberToUsd(1000), referencePrice: 100, averagePrice: 101, side: "ask" }))).toBeCloseTo(10, 6);
    expect(usdToNumber(getHyperliquidExecutionImpactUsd({ sizeUsd: numberToUsd(1000), referencePrice: 100, averagePrice: 99, side: "bid" }))).toBeCloseTo(10, 6);
    expect(usdToNumber(getHyperliquidExecutionImpactUsd({ sizeUsd: numberToUsd(1000), referencePrice: 100, averagePrice: 99.5, side: "ask" }))).toBeCloseTo(-5, 6);
  });

  it("projects funding cost with positive rates paid by longs and received by shorts", () => {
    expect(usdToNumber(getHyperliquidFundingCostUsd({ sizeUsd: numberToUsd(10_000), side: "long", hourlyFundingRate: 0.0001, holdingPeriodHours: 8 }))).toBeCloseTo(8, 6);
    expect(usdToNumber(getHyperliquidFundingCostUsd({ sizeUsd: numberToUsd(10_000), side: "short", hourlyFundingRate: 0.0001, holdingPeriodHours: 8 }))).toBeCloseTo(-8, 6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/domain/tradingCosts/hyperliquid/__tests__/book.spec.ts`

Expected: FAIL because `book.ts` does not exist.

- [ ] **Step 3: Add Hyperliquid types**

Create `src/domain/tradingCosts/hyperliquid/types.ts`:

```ts
import type { TradingCostSide } from "../types";

export type HyperliquidAssetMeta = {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  marginTableId: number;
  isDelisted?: boolean;
};

export type HyperliquidAssetCtx = {
  dayNtlVlm?: string;
  funding?: string;
  markPx?: string;
  midPx?: string;
  oraclePx?: string;
  premium?: string;
};

export type HyperliquidMetaAndAssetCtxsResponse = [
  { universe: HyperliquidAssetMeta[] },
  HyperliquidAssetCtx[],
];

export type HyperliquidBookLevel = {
  px: string;
  sz: string;
  n: number;
};

export type HyperliquidL2BookResponse = {
  coin: string;
  time: number;
  levels: [HyperliquidBookLevel[], HyperliquidBookLevel[]];
};

export type HyperliquidNormalizedMarket = {
  symbol: string;
  displayName: string;
  isDisabled: boolean;
  volume24hUsd: bigint | undefined;
  markPrice: number | undefined;
  midPrice: number | undefined;
  hourlyFundingRate: number | undefined;
  timestamp: number;
};

export type BookSide = "ask" | "bid";

export type HyperliquidLeg = {
  bookSide: BookSide;
  tradingSide: TradingCostSide;
};
```

- [ ] **Step 4: Add Hyperliquid book math implementation**

Create `src/domain/tradingCosts/hyperliquid/book.ts`:

```ts
import { numberToUsd, usdToNumber } from "../costs";
import type { TradingCostSide } from "../types";
import type { BookSide, HyperliquidBookLevel } from "./types";

export type BookFillResult = {
  status: "filled" | "insufficientDepth";
  averagePrice: number | undefined;
  filledUsd: bigint;
};

export function simulateL2BookFill({
  levels,
  sizeUsd,
}: {
  levels: HyperliquidBookLevel[];
  sizeUsd: bigint;
}): BookFillResult {
  const targetUsd = usdToNumber(sizeUsd) ?? 0;
  let remainingUsd = targetUsd;
  let filledUsd = 0;
  let filledBase = 0;

  for (const level of levels) {
    if (remainingUsd <= 0) break;

    const price = Number(level.px);
    const size = Number(level.sz);
    const levelUsd = price * size;
    const takeUsd = Math.min(levelUsd, remainingUsd);
    const takeBase = takeUsd / price;

    filledUsd += takeUsd;
    filledBase += takeBase;
    remainingUsd -= takeUsd;
  }

  return {
    status: remainingUsd > 0.000001 ? "insufficientDepth" : "filled",
    averagePrice: filledBase > 0 ? filledUsd / filledBase : undefined,
    filledUsd: numberToUsd(filledUsd),
  };
}

export function getHyperliquidExecutionImpactUsd({
  sizeUsd,
  referencePrice,
  averagePrice,
  side,
}: {
  sizeUsd: bigint;
  referencePrice: number;
  averagePrice: number;
  side: BookSide;
}) {
  if (referencePrice <= 0) {
    return 0n;
  }

  const size = usdToNumber(sizeUsd) ?? 0;
  const direction = side === "ask" ? 1 : -1;
  return numberToUsd(size * ((averagePrice - referencePrice) / referencePrice) * direction);
}

export function getBookSideForLeg({
  tradingSide,
  isOpen,
}: {
  tradingSide: TradingCostSide;
  isOpen: boolean;
}): BookSide {
  if (tradingSide === "long") {
    return isOpen ? "ask" : "bid";
  }

  return isOpen ? "bid" : "ask";
}

export function getHyperliquidFundingCostUsd({
  sizeUsd,
  side,
  hourlyFundingRate,
  holdingPeriodHours,
}: {
  sizeUsd: bigint;
  side: TradingCostSide;
  hourlyFundingRate: number;
  holdingPeriodHours: number;
}) {
  const signedRate = side === "long" ? hourlyFundingRate : -hourlyFundingRate;
  return numberToUsd((usdToNumber(sizeUsd) ?? 0) * signedRate * holdingPeriodHours);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `yarn vitest run src/domain/tradingCosts/hyperliquid/__tests__/book.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/tradingCosts/hyperliquid src/domain/tradingCosts/hyperliquid/__tests__/book.spec.ts
git commit -m "feat: add hyperliquid book cost math"
```

## Task 4: Hyperliquid Fetching And Normalization

**Files:**
- Create: `src/domain/tradingCosts/hyperliquid/api.ts`
- Create: `src/domain/tradingCosts/hyperliquid/useHyperliquidData.ts`
- Test: `src/domain/tradingCosts/hyperliquid/__tests__/api.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { usdToNumber } from "../../costs";
import { normalizeHyperliquidMarkets } from "../api";
import type { HyperliquidMetaAndAssetCtxsResponse } from "../types";

describe("Hyperliquid API normalization", () => {
  it("combines meta and asset contexts and excludes delisted markets", () => {
    const response: HyperliquidMetaAndAssetCtxsResponse = [
      {
        universe: [
          { name: "ETH", szDecimals: 4, maxLeverage: 25, marginTableId: 1 },
          { name: "MATIC", szDecimals: 1, maxLeverage: 20, marginTableId: 2, isDelisted: true },
        ],
      },
      [
        { dayNtlVlm: "12345.67", markPx: "2100", midPx: "2100.5", funding: "0.0000125" },
        { dayNtlVlm: "999", markPx: "1", funding: "0" },
      ],
    ];

    const markets = normalizeHyperliquidMarkets(response, 123);

    expect(markets).toHaveLength(1);
    expect(markets[0]).toMatchObject({
      symbol: "ETH",
      displayName: "ETH",
      isDisabled: false,
      markPrice: 2100,
      midPrice: 2100.5,
      hourlyFundingRate: 0.0000125,
      timestamp: 123,
    });
    expect(usdToNumber(markets[0].volume24hUsd)).toBeCloseTo(12345.67, 6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/domain/tradingCosts/hyperliquid/__tests__/api.spec.ts`

Expected: FAIL because `api.ts` does not exist.

- [ ] **Step 3: Add API and normalization implementation**

Create `src/domain/tradingCosts/hyperliquid/api.ts`:

```ts
import { numberToUsd } from "../costs";
import type {
  HyperliquidL2BookResponse,
  HyperliquidMetaAndAssetCtxsResponse,
  HyperliquidNormalizedMarket,
} from "./types";

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";

async function postHyperliquidInfo<T>(body: Record<string, string>): Promise<T> {
  const response = await fetch(HYPERLIQUID_INFO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Hyperliquid info request failed: ${response.status}`);
  }

  return response.json();
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizeHyperliquidMarkets(
  response: HyperliquidMetaAndAssetCtxsResponse,
  timestamp: number
): HyperliquidNormalizedMarket[] {
  const [meta, contexts] = response;

  return meta.universe.flatMap((asset, index) => {
    const ctx = contexts[index];

    if (!ctx || asset.isDelisted) {
      return [];
    }

    const volume = parseOptionalNumber(ctx.dayNtlVlm);

    return {
      symbol: asset.name,
      displayName: asset.name,
      isDisabled: false,
      volume24hUsd: volume === undefined ? undefined : numberToUsd(volume),
      markPrice: parseOptionalNumber(ctx.markPx),
      midPrice: parseOptionalNumber(ctx.midPx),
      hourlyFundingRate: parseOptionalNumber(ctx.funding),
      timestamp,
    };
  });
}

export async function fetchHyperliquidMetaAndAssetCtxs(): Promise<HyperliquidNormalizedMarket[]> {
  const timestamp = Date.now();
  const response = await postHyperliquidInfo<HyperliquidMetaAndAssetCtxsResponse>({ type: "metaAndAssetCtxs" });
  return normalizeHyperliquidMarkets(response, timestamp);
}

export async function fetchHyperliquidL2Book(coin: string): Promise<HyperliquidL2BookResponse> {
  return postHyperliquidInfo<HyperliquidL2BookResponse>({ type: "l2Book", coin });
}

export async function fetchHyperliquidL2Books(coins: string[]): Promise<Record<string, HyperliquidL2BookResponse | Error>> {
  const entries = await Promise.all(
    coins.map(async (coin) => {
      try {
        return [coin, await fetchHyperliquidL2Book(coin)] as const;
      } catch (error) {
        return [coin, error instanceof Error ? error : new Error(String(error))] as const;
      }
    })
  );

  return Object.fromEntries(entries);
}
```

- [ ] **Step 4: Add SWR hook implementation**

Create `src/domain/tradingCosts/hyperliquid/useHyperliquidData.ts`:

```ts
import { useMemo } from "react";
import useSWR from "swr";

import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";

import { fetchHyperliquidL2Books, fetchHyperliquidMetaAndAssetCtxs } from "./api";
import type { HyperliquidL2BookResponse, HyperliquidNormalizedMarket } from "./types";

export type HyperliquidMarketsResult = {
  markets: HyperliquidNormalizedMarket[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
};

export type HyperliquidBooksResult = {
  booksByCoin: Record<string, HyperliquidL2BookResponse | Error> | undefined;
  isLoading: boolean;
  error: Error | undefined;
};

export function useHyperliquidMarkets(): HyperliquidMarketsResult {
  const marketsRequest = useSWR(["tradingCosts", "hyperliquid", "metaAndAssetCtxs"], fetchHyperliquidMetaAndAssetCtxs, {
    refreshInterval: FREQUENT_UPDATE_INTERVAL,
  });

  return {
    markets: marketsRequest.data,
    isLoading: marketsRequest.isLoading,
    error: marketsRequest.error as Error | undefined,
  };
}

export function useHyperliquidL2Books(coins: string[] | undefined): HyperliquidBooksResult {
  const sortedCoins = useMemo(() => {
    return coins?.filter(Boolean).sort() ?? [];
  }, [coins]);

  const booksRequest = useSWR(
    sortedCoins.length ? ["tradingCosts", "hyperliquid", "l2Books", sortedCoins.join(",")] : null,
    () => fetchHyperliquidL2Books(sortedCoins),
    { refreshInterval: FREQUENT_UPDATE_INTERVAL }
  );

  return {
    booksByCoin: booksRequest.data,
    isLoading: booksRequest.isLoading,
    error: booksRequest.error as Error | undefined,
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `yarn vitest run src/domain/tradingCosts/hyperliquid/__tests__/api.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/tradingCosts/hyperliquid/api.ts src/domain/tradingCosts/hyperliquid/useHyperliquidData.ts src/domain/tradingCosts/hyperliquid/__tests__/api.spec.ts
git commit -m "feat: fetch hyperliquid trading cost data"
```

## Task 5: GMX Round-Trip Cost Adapter

**Files:**
- Create: `src/domain/tradingCosts/gmx/gmxCost.ts`
- Test: `src/domain/tradingCosts/gmx/__tests__/gmxCost.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { expandDecimals } from "lib/numbers";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";

import { getGmxTradingCostBreakdown } from "../gmxCost";

const feeFactor = expandDecimals(5, 25);

describe("GMX trading cost adapter", () => {
  it("includes protocol fees on both open and close legs", () => {
    const marketInfo = {
      ...createMockMarketInfo(),
      positionFeeFactorForBalanceWasImproved: feeFactor,
      positionFeeFactorForBalanceWasNotImproved: feeFactor,
      positionImpactFactorPositive: 0n,
      positionImpactFactorNegative: 0n,
      fundingFactorPerSecond: 0n,
      borrowingFactorPerSecondForLongs: 0n,
      borrowingFactorPerSecondForShorts: 0n,
    };

    const sizeUsd = expandDecimals(10_000, 30);
    const breakdown = getGmxTradingCostBreakdown({
      marketInfo,
      sizeUsd,
      side: "long",
      holdingPeriodHours: 8,
      gasLimits: undefined,
      gasPrice: undefined,
      tokensData: undefined,
      timestamp: 1000,
    });

    expect(breakdown.status).toBe("ready");
    expect(breakdown.components.find((item) => item.key === "protocolFee")?.usd).toBe(expandDecimals(10, 30));
    expect(breakdown.components.find((item) => item.key === "openPriceImpact")?.usd).toBe(0n);
    expect(breakdown.components.find((item) => item.key === "closePriceImpact")?.usd).toBe(0n);
    expect(breakdown.warnings).toContain("Collateral swap routing is not included.");
  });

  it("converts positive price impact into a negative cost", () => {
    const marketInfo = {
      ...createMockMarketInfo(),
      longInterestUsd: expandDecimals(100_000, 30),
      shortInterestUsd: expandDecimals(1_000_000, 30),
      positionFeeFactorForBalanceWasImproved: 0n,
      positionFeeFactorForBalanceWasNotImproved: 0n,
      borrowingFactorPerSecondForLongs: 0n,
      borrowingFactorPerSecondForShorts: 0n,
      fundingFactorPerSecond: 0n,
    };

    const breakdown = getGmxTradingCostBreakdown({
      marketInfo,
      sizeUsd: expandDecimals(10_000, 30),
      side: "long",
      holdingPeriodHours: 1,
      gasLimits: undefined,
      gasPrice: undefined,
      tokensData: undefined,
      timestamp: 1000,
    });

    expect(breakdown.components.find((item) => item.key === "openPriceImpact")!.usd).toBeLessThanOrEqual(0n);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/domain/tradingCosts/gmx/__tests__/gmxCost.spec.ts`

Expected: FAIL because `gmxCost.ts` does not exist.

- [ ] **Step 3: Add GMX cost adapter**

Create `src/domain/tradingCosts/gmx/gmxCost.ts`:

```ts
import { DecreasePositionSwapType } from "domain/synthetics/orders";
import {
  getBorrowingFeeRateUsd,
  getCappedPositionImpactUsd,
  getFundingFeeRateUsd,
  getPositionFee,
  type GasLimitsConfig,
} from "domain/synthetics/fees";
import { bigMath } from "sdk/utils/bigmath";
import {
  estimateExecuteDecreaseOrderGasLimit,
  estimateExecuteIncreaseOrderGasLimit,
  getExecutionFee,
} from "sdk/utils/fees/executionFee";
import type { MarketInfo } from "sdk/utils/markets/types";
import type { TokensData } from "sdk/utils/tokens/types";

import { sumTradingCostComponents } from "../costs";
import type { TradingCostBreakdown, TradingCostComponent, TradingCostSide } from "../types";

const SECONDS_PER_HOUR = 60n * 60n;

function estimateGmxNetworkFeeUsd({
  chainId,
  gasLimits,
  gasPrice,
  tokensData,
}: {
  chainId: number;
  gasLimits: GasLimitsConfig | undefined;
  gasPrice: bigint | undefined;
  tokensData: TokensData | undefined;
}) {
  if (!gasLimits || gasPrice === undefined || !tokensData) {
    return 0n;
  }

  const increaseGasLimit = estimateExecuteIncreaseOrderGasLimit(gasLimits, { swapsCount: 0, callbackGasLimit: 0n });
  const decreaseGasLimit = estimateExecuteDecreaseOrderGasLimit(gasLimits, {
    swapsCount: 0,
    callbackGasLimit: 0n,
    decreaseSwapType: DecreasePositionSwapType.NoSwap,
  });

  const increaseFee = getExecutionFee(chainId, gasLimits, tokensData, increaseGasLimit, gasPrice, 2n)?.feeUsd ?? 0n;
  const decreaseFee = getExecutionFee(chainId, gasLimits, tokensData, decreaseGasLimit, gasPrice, 2n)?.feeUsd ?? 0n;

  return increaseFee + decreaseFee;
}

export function getGmxTradingCostBreakdown({
  marketInfo,
  sizeUsd,
  side,
  holdingPeriodHours,
  chainId = 42161,
  gasLimits,
  gasPrice,
  tokensData,
  timestamp,
}: {
  marketInfo: MarketInfo;
  sizeUsd: bigint;
  side: TradingCostSide;
  holdingPeriodHours: number;
  chainId?: number;
  gasLimits: GasLimitsConfig | undefined;
  gasPrice: bigint | undefined;
  tokensData: TokensData | undefined;
  timestamp: number;
}): TradingCostBreakdown {
  const isLong = side === "long";
  const openImpact = getCappedPositionImpactUsd(marketInfo, sizeUsd, isLong, true, {
    fallbackToZero: true,
    shouldCapNegativeImpact: true,
  });
  const closeImpact = getCappedPositionImpactUsd(marketInfo, sizeUsd, isLong, false, {
    fallbackToZero: true,
    shouldCapNegativeImpact: true,
  });

  const openPositionFee = getPositionFee(marketInfo, sizeUsd, openImpact.balanceWasImproved, undefined).positionFeeUsd;
  const closePositionFee = getPositionFee(marketInfo, sizeUsd, closeImpact.balanceWasImproved, undefined).positionFeeUsd;
  const periodSeconds = BigInt(Math.round(holdingPeriodHours * 3600));
  const borrowingFeeUsd = getBorrowingFeeRateUsd(marketInfo, isLong, sizeUsd, periodSeconds);
  const fundingRateUsd = getFundingFeeRateUsd(marketInfo, isLong, sizeUsd, periodSeconds);
  const networkFeeUsd = estimateGmxNetworkFeeUsd({ chainId, gasLimits, gasPrice, tokensData });

  const components: TradingCostComponent[] = [
    { key: "protocolFee", label: "Protocol fee", usd: openPositionFee + closePositionFee },
    { key: "openPriceImpact", label: "Open price impact", usd: -openImpact.priceImpactDeltaUsd },
    { key: "closePriceImpact", label: "Close price impact", usd: -closeImpact.priceImpactDeltaUsd },
    { key: "netRate", label: "Net-rate cost", usd: borrowingFeeUsd - fundingRateUsd },
    { key: "networkFee", label: "Network fee", usd: networkFeeUsd },
  ];

  return {
    providerId: "gmx",
    totalUsd: sumTradingCostComponents(components),
    components,
    timestamp,
    status: "ready",
    warnings: [
      "Collateral swap routing is not included.",
      "Account-specific referral discounts are not included.",
      "Results are current estimates, not guaranteed execution quotes.",
    ],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run src/domain/tradingCosts/gmx/__tests__/gmxCost.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/tradingCosts/gmx src/domain/tradingCosts/gmx/__tests__/gmxCost.spec.ts
git commit -m "feat: estimate gmx trading costs"
```

## Task 6: Row Composition

**Files:**
- Create: `src/domain/tradingCosts/buildTradingCostRows.ts`
- Create: `src/domain/tradingCosts/useTradingCosts.ts`
- Test: `src/domain/tradingCosts/__tests__/buildTradingCostRows.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { expandDecimals } from "lib/numbers";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";

import { numberToUsd, usdToNumber } from "../costs";
import { buildTradingCostRows } from "../buildTradingCostRows";
import type { TradingCostBreakdown, TradingCostScenario } from "../types";

const scenario: TradingCostScenario = {
  sizeUsd: expandDecimals(10_000, 30),
  side: "long",
  holdingPeriodHours: 8,
  comparisonVenue: "hyperliquid",
  venueAssumptions: { hyperliquid: { takerFeeRate: 0.00045 } },
};

function breakdown(providerId: "gmx" | "hyperliquid", totalUsd: bigint | undefined): TradingCostBreakdown {
  return { providerId, totalUsd, components: [], timestamp: 1, status: totalUsd === undefined ? "providerError" : "ready", warnings: [] };
}

describe("buildTradingCostRows", () => {
  it("builds matched rows, calculates delta, and sorts by venue volume", () => {
    const eth = createMockMarketInfo();
    const btc = { ...createMockMarketInfo(), marketTokenAddress: "0xbtc", name: "BTC/USD [BTC-USDC]", indexToken: { ...createMockMarketInfo().indexToken, symbol: "BTC" } };

    const rows = buildTradingCostRows({
      scenario,
      gmxMarkets: [eth, btc],
      venueMarkets: [
        { providerId: "hyperliquid", symbol: "ETH", displayName: "ETH", volume24hUsd: numberToUsd(100) },
        { providerId: "hyperliquid", symbol: "BTC", displayName: "BTC", volume24hUsd: numberToUsd(200) },
      ],
      buildGmxBreakdown: (market) => breakdown("gmx", market.marketTokenAddress === "0xbtc" ? numberToUsd(12) : numberToUsd(20)),
      buildVenueBreakdown: (match) => breakdown("hyperliquid", match.venueMarket.symbol === "BTC" ? numberToUsd(10) : numberToUsd(15)),
    });

    expect(rows.map((row) => row.indexSymbol)).toEqual(["BTC", "ETH"]);
    expect(usdToNumber(rows[0].deltaUsd)).toBeCloseTo(2, 6);
    expect(usdToNumber(rows[1].deltaUsd)).toBeCloseTo(5, 6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/domain/tradingCosts/__tests__/buildTradingCostRows.spec.ts`

Expected: FAIL because `buildTradingCostRows.ts` does not exist.

- [ ] **Step 3: Add row composition**

Create `src/domain/tradingCosts/buildTradingCostRows.ts`:

```ts
import type { MarketInfo } from "domain/synthetics/markets";

import { calculateDeltaUsd, getCombinedStatus, sortTradingCostRowsByVenueVolume } from "./costs";
import { matchGmxMarketsToVenueMarkets } from "./marketMatching";
import type {
  ComparisonVenueMarket,
  MatchedTradingMarket,
  TradingCostBreakdown,
  TradingCostRow,
  TradingCostScenario,
} from "./types";

export function buildTradingCostRows({
  scenario,
  gmxMarkets,
  venueMarkets,
  buildGmxBreakdown,
  buildVenueBreakdown,
}: {
  scenario: TradingCostScenario;
  gmxMarkets: MarketInfo[];
  venueMarkets: ComparisonVenueMarket[];
  buildGmxBreakdown: (market: MarketInfo, scenario: TradingCostScenario) => TradingCostBreakdown;
  buildVenueBreakdown: (match: MatchedTradingMarket, scenario: TradingCostScenario) => TradingCostBreakdown;
}): TradingCostRow[] {
  const { matched } = matchGmxMarketsToVenueMarkets(gmxMarkets, venueMarkets);
  const rows = matched.map((match) => {
    const gmx = buildGmxBreakdown(match.gmxMarket, scenario);
    const venue = buildVenueBreakdown(match, scenario);
    const deltaUsd = calculateDeltaUsd(gmx.totalUsd, venue.totalUsd);

    return {
      marketKey: `${match.venueMarket.providerId}:${match.venueMarket.symbol}:${match.gmxMarket.marketTokenAddress}`,
      displayName: match.gmxMarket.name,
      indexSymbol: match.gmxMarket.indexToken.symbol,
      venueVolume24hUsd: match.venueMarket.volume24hUsd,
      gmx,
      venue,
      deltaUsd,
      status: getCombinedStatus(gmx.status, venue.status),
    };
  });

  return sortTradingCostRowsByVenueVolume(rows);
}
```

- [ ] **Step 4: Add Hyperliquid breakdown helper used by the hook**

Create `src/domain/tradingCosts/hyperliquid/buildHyperliquidBreakdown.ts`:

```ts
import { sumTradingCostComponents } from "../costs";
import type {
  ComparisonVenueMarket,
  MatchedTradingMarket,
  TradingCostBreakdown,
  TradingCostComponent,
  TradingCostScenario,
} from "../types";
import { getBookSideForLeg, getHyperliquidExecutionImpactUsd, getHyperliquidFundingCostUsd, simulateL2BookFill } from "./book";
import type { HyperliquidL2BookResponse, HyperliquidNormalizedMarket } from "./types";

export function getHyperliquidVenueMarkets(markets: HyperliquidNormalizedMarket[]): ComparisonVenueMarket[] {
  return markets.map((market) => ({
    providerId: "hyperliquid",
    symbol: market.symbol,
    displayName: market.displayName,
    volume24hUsd: market.volume24hUsd,
    isDisabled: market.isDisabled,
  }));
}

export function buildHyperliquidBreakdown({
  scenario,
  match,
  market,
  book,
}: {
  scenario: TradingCostScenario;
  match: MatchedTradingMarket;
  market: HyperliquidNormalizedMarket | undefined;
  book: HyperliquidL2BookResponse | Error | undefined;
}): TradingCostBreakdown {
  if (!market) {
    return { providerId: "hyperliquid", totalUsd: undefined, components: [], timestamp: undefined, status: "loading", warnings: [] };
  }

  if (book instanceof Error) {
    return { providerId: "hyperliquid", totalUsd: undefined, components: [], timestamp: market.timestamp, status: "providerError", warnings: [book.message] };
  }

  if (!book) {
    return { providerId: "hyperliquid", totalUsd: undefined, components: [], timestamp: market.timestamp, status: "loading", warnings: [] };
  }

  const referencePrice = market.midPrice ?? market.markPrice;
  const hourlyFundingRate = market.hourlyFundingRate;

  if (!referencePrice || hourlyFundingRate === undefined) {
    return { providerId: "hyperliquid", totalUsd: undefined, components: [], timestamp: market.timestamp, status: "providerError", warnings: ["Hyperliquid market context is missing price or funding data."] };
  }

  const openBookSide = getBookSideForLeg({ tradingSide: scenario.side, isOpen: true });
  const closeBookSide = getBookSideForLeg({ tradingSide: scenario.side, isOpen: false });
  const openLevels = openBookSide === "bid" ? book.levels[0] : book.levels[1];
  const closeLevels = closeBookSide === "bid" ? book.levels[0] : book.levels[1];
  const openFill = simulateL2BookFill({ levels: openLevels, sizeUsd: scenario.sizeUsd });
  const closeFill = simulateL2BookFill({ levels: closeLevels, sizeUsd: scenario.sizeUsd });

  if (openFill.status === "insufficientDepth" || closeFill.status === "insufficientDepth" || openFill.averagePrice === undefined || closeFill.averagePrice === undefined) {
    return { providerId: "hyperliquid", totalUsd: undefined, components: [], timestamp: book.time, status: "insufficientDepth", warnings: ["Hyperliquid L2 levels cannot fill the requested round-trip size."] };
  }

  const feeRate = scenario.venueAssumptions.hyperliquid.takerFeeRate;
  const protocolFeeUsd = (scenario.sizeUsd * BigInt(Math.round(feeRate * 1_000_000)) * 2n) / 1_000_000n;
  const openImpactUsd = getHyperliquidExecutionImpactUsd({ sizeUsd: scenario.sizeUsd, referencePrice, averagePrice: openFill.averagePrice, side: openBookSide });
  const closeImpactUsd = getHyperliquidExecutionImpactUsd({ sizeUsd: scenario.sizeUsd, referencePrice, averagePrice: closeFill.averagePrice, side: closeBookSide });
  const fundingUsd = getHyperliquidFundingCostUsd({
    sizeUsd: scenario.sizeUsd,
    side: scenario.side,
    hourlyFundingRate,
    holdingPeriodHours: scenario.holdingPeriodHours,
  });

  const components: TradingCostComponent[] = [
    { key: "protocolFee", label: "Venue fee", usd: protocolFeeUsd },
    { key: "venueExecutionImpact", label: "Open execution impact", usd: openImpactUsd },
    { key: "venueExecutionImpact", label: "Close execution impact", usd: closeImpactUsd },
    { key: "funding", label: "Funding", usd: fundingUsd },
    { key: "networkFee", label: "Network fee", usd: 0n },
  ];

  return {
    providerId: "hyperliquid",
    totalUsd: sumTradingCostComponents(components),
    components,
    timestamp: book.time,
    status: "ready",
    warnings: [],
  };
}
```

- [ ] **Step 5: Add trading costs hook**

Create `src/domain/tradingCosts/useTradingCosts.ts`:

```ts
import { useMemo } from "react";

import {
  selectChainId,
  selectGasLimits,
  selectGasPrice,
  selectMarketsInfoData,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getGmxTradingCostBreakdown } from "domain/tradingCosts/gmx/gmxCost";

import { buildTradingCostRows } from "./buildTradingCostRows";
import { filterTradingCostRows } from "./costs";
import { buildHyperliquidBreakdown, getHyperliquidVenueMarkets } from "./hyperliquid/buildHyperliquidBreakdown";
import { useHyperliquidL2Books, useHyperliquidMarkets } from "./hyperliquid/useHyperliquidData";
import type { TradingCostScenario } from "./types";

export function useTradingCosts({ scenario, search }: { scenario: TradingCostScenario; search: string }) {
  const chainId = useSelector(selectChainId);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const gasLimits = useSelector(selectGasLimits);
  const gasPrice = useSelector(selectGasPrice);
  const tokensData = useSelector(selectTokensData);

  const gmxMarkets = useMemo(() => Object.values(marketsInfoData ?? {}), [marketsInfoData]);
  const hyperliquidMarkets = useHyperliquidMarkets();
  const venueMarkets = useMemo(
    () => getHyperliquidVenueMarkets(hyperliquidMarkets.markets ?? []),
    [hyperliquidMarkets.markets]
  );
  const coins = useMemo(() => venueMarkets.map((market) => market.symbol), [venueMarkets]);
  const hyperliquidBooks = useHyperliquidL2Books(coins);

  const rows = useMemo(() => {
    const builtRows = buildTradingCostRows({
      scenario,
      gmxMarkets,
      venueMarkets,
      buildGmxBreakdown: (marketInfo) =>
        getGmxTradingCostBreakdown({
          marketInfo,
          sizeUsd: scenario.sizeUsd,
          side: scenario.side,
          holdingPeriodHours: scenario.holdingPeriodHours,
          chainId,
          gasLimits,
          gasPrice,
          tokensData,
          timestamp: Date.now(),
        }),
      buildVenueBreakdown: (match) =>
        buildHyperliquidBreakdown({
          match,
          scenario,
          market: hyperliquidMarkets.markets?.find((item) => item.symbol === match.venueMarket.symbol),
          book: hyperliquidBooks.booksByCoin?.[match.venueMarket.symbol],
        }),
    });

    return filterTradingCostRows(builtRows, search);
  }, [
    chainId,
    gasLimits,
    gasPrice,
    gmxMarkets,
    hyperliquidBooks.booksByCoin,
    hyperliquidMarkets.markets,
    scenario,
    search,
    tokensData,
    venueMarkets,
  ]);

  return {
    rows,
    isLoading: hyperliquidMarkets.isLoading || hyperliquidBooks.isLoading || !marketsInfoData,
    error: hyperliquidMarkets.error ?? hyperliquidBooks.error,
  };
}
```

- [ ] **Step 6: Run row composition test**

Run: `yarn vitest run src/domain/tradingCosts/__tests__/buildTradingCostRows.spec.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/domain/tradingCosts/buildTradingCostRows.ts src/domain/tradingCosts/useTradingCosts.ts src/domain/tradingCosts/hyperliquid/buildHyperliquidBreakdown.ts src/domain/tradingCosts/__tests__/buildTradingCostRows.spec.ts
git commit -m "feat: compose trading cost rows"
```

## Task 7: Trading Costs View And Page

**Files:**
- Create: `src/pages/TradingCosts/TradingCosts.tsx`
- Create: `src/pages/TradingCosts/TradingCostsView.tsx`
- Create: `src/pages/TradingCosts/TradingCosts.scss`
- Test: `src/pages/TradingCosts/__tests__/TradingCostsView.ct.stories.tsx`
- Test: `src/pages/TradingCosts/__tests__/TradingCostsView.ct.spec.tsx`

- [ ] **Step 1: Write the component test**

```tsx
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
  await expect(component.getByText("Venue assumptions")).toBeVisible();
  await expect(component.getByText("ETH/USD [WETH-USDC]")).toBeVisible();
  await expect(component.getByText("Selected market")).toBeVisible();
});
```

- [ ] **Step 2: Run component test to verify it fails**

Run: `yarn test:ct src/pages/TradingCosts/__tests__/TradingCostsView.ct.spec.tsx --project=chromium`

Expected: FAIL because `TradingCostsView.tsx` does not exist.

- [ ] **Step 3: Add presentational view**

Create `src/pages/TradingCosts/TradingCostsView.tsx`:

```tsx
import { Trans } from "@lingui/macro";
import { useMemo, useState } from "react";

import type { TradingCostRow, TradingCostSide } from "domain/tradingCosts/types";
import { formatUsd } from "lib/numbers";

import NumberInput from "components/NumberInput/NumberInput";
import SearchInput from "components/SearchInput/SearchInput";
import Select from "components/Select/Select";
import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import Tabs from "components/Tabs/Tabs";

export type HoldingPeriodPreset = "1" | "8" | "24" | "custom";

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
  const selectedRow = useMemo(() => rows.find((row) => row.marketKey === selectedMarketKey) ?? rows[0], [rows, selectedMarketKey]);

  return (
    <div className="TradingCosts">
      <div className="TradingCosts-header">
        <div>
          <h1><Trans>Trading Costs</Trans></h1>
          <p><Trans>Round-trip current cost comparison across matched perps markets.</Trans></p>
        </div>
        <div className="TradingCosts-provider">Compare venue: Hyperliquid</div>
      </div>

      <div className="TradingCosts-controls">
        <SearchInput value={search} setValue={setSearch} placeholder="Search market" />
        <label>
          <span>Size, USD</span>
          <NumberInput value={sizeUsdInput} onValueChange={(event) => setSizeUsdInput(event.target.value)} className="TradingCosts-input" />
        </label>
        <Tabs
          type="inline"
          selectedValue={side}
          onChange={(value) => setSide(value as TradingCostSide)}
          options={[
            { value: "long", label: "Long" },
            { value: "short", label: "Short" },
          ]}
        />
        <Select
          value={holdingPeriodPreset}
          onChange={(event) => setHoldingPeriodPreset(event.target.value as HoldingPeriodPreset)}
          options={[
            { value: "1", label: "1h" },
            { value: "8", label: "8h" },
            { value: "24", label: "24h" },
            { value: "custom", label: "Custom" },
          ]}
        />
        {holdingPeriodPreset === "custom" && (
          <label>
            <span>Custom hours</span>
            <NumberInput value={customHoldingHoursInput} onValueChange={(event) => setCustomHoldingHoursInput(event.target.value)} className="TradingCosts-input" />
          </label>
        )}
        <label>
          <span>Venue assumptions</span>
          <NumberInput value={takerFeeInput} onValueChange={(event) => setTakerFeeInput(event.target.value)} className="TradingCosts-input" />
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
                  <TableTd>{formatUsd(row.venueVolume24hUsd)}</TableTd>
                  <TableTd>{formatUsd(row.gmx.totalUsd)}</TableTd>
                  <TableTd>{formatUsd(row.venue.totalUsd)}</TableTd>
                  <TableTd>{formatUsd(row.deltaUsd)}</TableTd>
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
              <div className="TradingCosts-detailTitle">{selectedRow.displayName}</div>
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
          <span>{formatUsd(component.usd)}</span>
        </div>
      ))}
      <div className="TradingCosts-breakdownTotal">
        <span>Total</span>
        <span>{formatUsd(breakdown.totalUsd)}</span>
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
```

- [ ] **Step 4: Add page container**

Create `src/pages/TradingCosts/TradingCosts.tsx`:

```tsx
import { useMemo, useState } from "react";

import { numberToUsd } from "domain/tradingCosts/costs";
import { useTradingCosts } from "domain/tradingCosts/useTradingCosts";
import type { TradingCostScenario, TradingCostSide } from "domain/tradingCosts/types";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";

import { HoldingPeriodPreset, TradingCostsView } from "./TradingCostsView";
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

  const holdingPeriodHours = holdingPeriodPreset === "custom" ? Number(customHoldingHoursInput || "0") : Number(holdingPeriodPreset);
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
```

- [ ] **Step 5: Add styles**

Create `src/pages/TradingCosts/TradingCosts.scss`:

```scss
.TradingCosts {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.TradingCosts-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  h1 {
    margin: 0;
    font-size: 24px;
    line-height: 32px;
  }

  p {
    margin: 4px 0 0;
    color: var(--color-typography-secondary);
  }
}

.TradingCosts-provider,
.TradingCosts-details,
.TradingCosts-tableWrap,
.TradingCosts-controls {
  border: 1px solid var(--color-slate-600);
  border-radius: 8px;
  background: var(--color-slate-900);
}

.TradingCosts-provider {
  padding: 8px 12px;
  white-space: nowrap;
}

.TradingCosts-controls {
  display: grid;
  grid-template-columns: minmax(220px, 1.4fr) repeat(5, minmax(120px, 1fr));
  gap: 10px;
  padding: 12px;

  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
    color: var(--color-typography-secondary);
  }
}

.TradingCosts-input {
  height: 32px;
  border: 1px solid var(--color-slate-600);
  border-radius: 8px;
  background: var(--color-slate-800);
  padding: 0 10px;
}

.TradingCosts-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 16px;
  align-items: start;
}

.TradingCosts-tableWrap {
  overflow-x: auto;
}

.TradingCosts-details {
  padding: 16px;
}

.TradingCosts-detailTitle {
  margin-bottom: 12px;
  font-weight: 600;
}

.TradingCosts-breakdown {
  border-top: 1px solid var(--color-slate-600);
  padding-top: 12px;
  margin-top: 12px;
}

.TradingCosts-breakdownRow,
.TradingCosts-breakdownTotal {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 0;
}

.TradingCosts-breakdownTotal {
  font-weight: 600;
}

.TradingCosts-empty {
  padding: 20px;
  color: var(--color-typography-secondary);
}

@media (max-width: 1100px) {
  .TradingCosts-controls,
  .TradingCosts-layout {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 6: Add component test story export**

Create `src/pages/TradingCosts/__tests__/TradingCostsView.ct.stories.tsx`:

```tsx
import { useState } from "react";

import { numberToUsd } from "domain/tradingCosts/costs";
import type { TradingCostRow, TradingCostSide } from "domain/tradingCosts/types";

import { HoldingPeriodPreset, TradingCostsView } from "../TradingCostsView";
import "../TradingCosts.scss";

const baseBreakdown = {
  providerId: "gmx" as const,
  totalUsd: numberToUsd(20),
  components: [{ key: "protocolFee" as const, label: "Protocol fee", usd: numberToUsd(10) }],
  timestamp: 1,
  status: "ready" as const,
  warnings: [],
};

export function TradingCostsViewStory() {
  const [search, setSearch] = useState("");
  const [sizeUsdInput, setSizeUsdInput] = useState("10000");
  const [side, setSide] = useState<TradingCostSide>("long");
  const [holdingPeriodPreset, setHoldingPeriodPreset] = useState<HoldingPeriodPreset>("8");
  const [customHoldingHoursInput, setCustomHoldingHoursInput] = useState("");
  const [takerFeeInput, setTakerFeeInput] = useState("0.045");

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
```

- [ ] **Step 7: Run component test**

Run: `yarn test:ct src/pages/TradingCosts/__tests__/TradingCostsView.ct.spec.tsx --project=chromium`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/pages/TradingCosts
git commit -m "feat: add trading costs page view"
```

## Task 8: Route, Page Type, And Side Nav

**Files:**
- Modify: `src/context/SyntheticsStateContext/SyntheticsStateContextProvider.tsx`
- Modify: `src/App/MainRoutes.tsx`
- Modify: `src/components/SideNav/SideNav.tsx`

- [ ] **Step 1: Run TypeScript before edits to establish baseline**

Run: `yarn tsc -p tsconfig.json --noEmit --incremental`

Expected: PASS before route wiring.

- [ ] **Step 2: Add page type**

Modify `src/context/SyntheticsStateContext/SyntheticsStateContextProvider.tsx` in `SyntheticsPageType`:

```ts
export type SyntheticsPageType =
  | "accounts"
  | "trade"
  | "pools"
  | "leaderboard"
  | "competitions"
  | "stats"
  | "tradingCosts"
  | "earn"
  | "buy"
  | "home"
  | "gmxAccount"
  | "referrals"
  | "rpcDebug";
```

- [ ] **Step 3: Add route**

Modify `src/App/MainRoutes.tsx` imports:

```ts
import { TradingCostsPage } from "pages/TradingCosts/TradingCosts";
```

Add route after `/monitor`:

```tsx
<Route exact path="/costs">
  <SyntheticsStateContextProvider skipLocalReferralCode pageType="tradingCosts">
    <TradingCostsPage />
  </SyntheticsStateContextProvider>
</Route>
```

- [ ] **Step 4: Add side navigation item**

Modify `src/components/SideNav/SideNav.tsx` in `mainNavItems` after Stats:

```tsx
{ icon: <DashboardIcon className="size-20" />, label: t`Costs`, key: "costs", to: "/costs" },
```

- [ ] **Step 5: Run TypeScript**

Run: `yarn tsc -p tsconfig.json --noEmit --incremental`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/context/SyntheticsStateContext/SyntheticsStateContextProvider.tsx src/App/MainRoutes.tsx src/components/SideNav/SideNav.tsx
git commit -m "feat: route trading costs dashboard"
```

## Task 9: Final Verification And UX Check

**Files:**
- No new files.

- [ ] **Step 1: Run focused unit tests**

Run:

```bash
yarn vitest run \
  src/domain/tradingCosts/__tests__/costs.spec.ts \
  src/domain/tradingCosts/__tests__/marketMatching.spec.ts \
  src/domain/tradingCosts/hyperliquid/__tests__/book.spec.ts \
  src/domain/tradingCosts/hyperliquid/__tests__/api.spec.ts \
  src/domain/tradingCosts/gmx/__tests__/gmxCost.spec.ts \
  src/domain/tradingCosts/__tests__/buildTradingCostRows.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run component test**

Run: `yarn test:ct src/pages/TradingCosts/__tests__/TradingCostsView.ct.spec.tsx --project=chromium`

Expected: PASS.

- [ ] **Step 3: Run TypeScript**

Run: `yarn tsc -p tsconfig.json --noEmit --incremental`

Expected: PASS.

- [ ] **Step 4: Run app server**

Run: `yarn start-app`

Expected: Vite starts and prints a local URL, usually `http://localhost:3011/`.

- [ ] **Step 5: Open and inspect the page**

Open `http://localhost:3011/#/costs`.

Expected:

- Page title says `Trading Costs`.
- Controls show generic `Compare venue` and `Venue assumptions` language.
- Table rows are sorted by venue volume descending after Hyperliquid data loads.
- Selecting a row updates the detail panel.
- Custom holding period reveals the custom hours input.

- [ ] **Step 6: Stop dev server**

Stop the `yarn start-app` process with `Ctrl-C`.

- [ ] **Step 7: Commit verification fixes when they exist**

When verification requires small fixes, commit them:

```bash
git add src/domain/tradingCosts src/pages/TradingCosts src/App/MainRoutes.tsx src/components/SideNav/SideNav.tsx src/context/SyntheticsStateContext/SyntheticsStateContextProvider.tsx
git commit -m "fix: polish trading costs dashboard"
```

When no fixes were required, skip this commit.

## Self-Review Notes

- Spec coverage: Tasks cover the venue-agnostic model, GMX cost components, Hyperliquid data and L2 impact, all matched markets sorted by venue volume, generic UI labels, route/nav, status handling, and current snapshot timestamps.
- Plan hygiene: The implementation steps contain no unresolved markers, missing paths, or vague test instructions.
- Type consistency: `TradingCostScenario`, `TradingCostRow`, `TradingCostBreakdown`, and `TradingCostStatus` names are consistent across tasks.
