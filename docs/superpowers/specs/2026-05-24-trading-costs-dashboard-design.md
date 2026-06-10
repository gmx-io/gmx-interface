# Trading Costs Dashboard Design

## Summary

Build a dedicated internal app page at `#/costs` for comparing current GMX perps trading costs against other perps venues. V1 implements GMX vs Hyperliquid, but the UI and data model must be venue-agnostic so Lighter, Ostium, Aster, GMTrade, and other venues can be added later.

The page is a market screener: one global trade scenario is applied across all matched markets, rows are sorted by selected venue 24h volume, and a selected-market panel shows the cost breakdown and data-source audit details.

## Goals

- Compare current round-trip expected cost by market, trade size, side, and holding period.
- Include GMX costs that matter for a round trip: protocol position fees, open price impact, close price impact, net-rate cost, and network fees.
- Include Hyperliquid costs using current venue data: taker/protocol fee, live L2 order book depth impact, and projected funding over the holding period.
- Default to all GMX markets that have a matching market on the selected comparison venue.
- Sort the screener by selected venue 24h volume. For V1, this is Hyperliquid volume.
- Provide search/filter by market symbol or name.
- Keep all visible UI labels generic: `Compare venue`, `Venue assumptions`, `Venue total`, `Venue volume`.
- Make current snapshot outputs timestamped and provider-labeled so future historical comparison can reuse the same normalized model.

## Non-Goals For V1

- Historical charts or persisted historical snapshots.
- More comparison venues beyond Hyperliquid.
- Maker order simulation.
- Wallet/account-specific discounts unless already available without adding account assumptions.
- Collateral swap routing costs for GMX round-trip position simulation.
- Automated routing recommendations or trade execution.

## UX Design

The page uses `AppPageLayout` and is styled as an internal analytics surface: dense, scannable, and auditable.

Top controls:

- Search market.
- Trade size in USD.
- Side selector: `Long` or `Short`.
- Holding period selector: `1h`, `8h`, `24h`, and `Custom`.
- Compare venue selector. V1 has only `Hyperliquid`.
- Venue assumptions control. V1 exposes Hyperliquid's editable taker fee here, defaulting to the base taker fee of `0.045%` (`0.00045` decimal).

Main table:

- Market.
- Venue 24h volume.
- GMX total cost.
- Venue total cost.
- Delta, where positive means GMX costs more than the selected venue.
- GMX price impact total.
- Status.

Rows are sorted by selected venue 24h volume descending by default. Search filters the table but does not change the selected scenario inputs.

Selecting a row opens or updates a right-side details panel with:

- Scenario summary.
- GMX cost breakdown.
- Selected venue cost breakdown.
- Data timestamps per provider.
- Status and warning details, including omitted assumptions.

The route is available at `#/costs`. Add the page to the side navigation as `Costs`.

## Architecture

Create a venue-agnostic domain area:

- `src/domain/tradingCosts/`

This domain owns shared types, pure cost math, market matching, filtering, sorting, and provider adapter boundaries. Page components consume normalized cost rows and must not depend on Hyperliquid-specific response shapes.

Core modules:

- `types.ts`: scenario inputs, provider ids, cost components, row statuses, normalized rows.
- `costs.ts`: pure helpers for summing components, calculating deltas, converting signs, filtering, and sorting.
- `marketMatching.ts`: maps GMX index symbols to selected venue markets and records unmatched markets.
- `gmxCostAdapter.ts`: computes GMX round-trip costs from current GMX market data and existing synthetics fee utilities.
- `comparisonVenueAdapter.ts`: common interface for external perps venue adapters.
- `hyperliquid/`: Hyperliquid fetchers, response normalization, L2 book depth simulation, and adapter implementation.

The app route wraps the page in `SyntheticsStateContextProvider` with a new `tradingCosts` page type. This page type uses the existing provider behavior that fetches tokens, markets, market info, gas limits, and gas price without enabling trade-page-only account workflows.

## Normalized Types

The normalized model represents every row independently of venue:

```ts
type TradingCostProviderId = "gmx" | "hyperliquid";

type TradingCostScenario = {
  sizeUsd: bigint;
  side: "long" | "short";
  holdingPeriodHours: number;
  comparisonVenue: "hyperliquid";
  venueAssumptions: {
    hyperliquid?: {
      takerFeeRate: number;
    };
  };
};

type TradingCostComponent = {
  key:
    | "protocolFee"
    | "openPriceImpact"
    | "closePriceImpact"
    | "netRate"
    | "networkFee"
    | "venueExecutionImpact"
    | "funding";
  label: string;
  usd: bigint;
};

type TradingCostStatus =
  | "ready"
  | "loading"
  | "unmatched"
  | "insufficientDepth"
  | "providerError"
  | "stale";

type TradingCostBreakdown = {
  providerId: TradingCostProviderId;
  totalUsd: bigint | undefined;
  components: TradingCostComponent[];
  timestamp: number | undefined;
  status: TradingCostStatus;
  warnings: string[];
};

type TradingCostRow = {
  marketKey: string;
  displayName: string;
  indexSymbol: string;
  venueVolume24hUsd: bigint | undefined;
  gmx: TradingCostBreakdown;
  venue: TradingCostBreakdown;
  deltaUsd: bigint | undefined;
  status: TradingCostStatus;
};
```

Positive component values are costs to the trader. Negative component values are rebates or benefits.

## GMX Cost Model

For each matched GMX market, estimate an immediate open and immediate close for the same USD size and side.

Include:

- Open protocol position fee.
- Open position price impact.
- Close protocol position fee.
- Close position price impact.
- Net-rate cost over the selected holding period.
- Network fee estimate for open plus close orders.

Use existing GMX utilities where possible:

- Position fee and fee item helpers from synthetics fee utilities.
- Position price impact helpers from existing fee utilities.
- Funding and borrowing factor helpers for net-rate projection.
- Execution fee helpers with current gas limits and gas price.

The GMX model exposes warnings for V1 omissions:

- Collateral swap routing is not included.
- Account-specific referral discounts are not included unless already available in context without additional assumptions.
- Results are current estimates, not guaranteed execution quotes.

## Hyperliquid Adapter

Hyperliquid is the first comparison venue implementation.

Data sources:

- `metaAndAssetCtxs` from the Hyperliquid Info endpoint for market metadata, current context, 24h volume, mark/oracle context, and funding context.
- `l2Book` from the Hyperliquid Info endpoint for live book depth simulation.
- Fee schedule reference from Hyperliquid docs for the default base taker fee.

The adapter normalizes Hyperliquid markets by coin symbol and matches them to GMX index symbols. Delisted Hyperliquid markets are excluded from default matched rows.

Round-trip execution impact:

- Long open consumes asks.
- Long close consumes bids.
- Short open consumes bids.
- Short close consumes asks.
- For each leg, walk returned L2 levels until the requested USD size is filled.
- If returned levels cannot fill the requested size, set the venue breakdown to `insufficientDepth`.

Costs:

- Taker fee applies to both open and close notional using the selected venue assumptions.
- Execution impact is calculated from the difference between average fill price and reference mid/mark price.
- Funding is projected from current funding over the selected holding period.
- Network fee is `0` for Hyperliquid V1.

## Error Handling

The page remains usable with partial data.

Statuses:

- `ready`: all required data for the row is available.
- `loading`: provider request is in progress.
- `unmatched`: GMX market has no selected venue match or selected venue market has no GMX match.
- `insufficientDepth`: selected venue book levels cannot fill the requested size.
- `providerError`: a provider request failed.
- `stale`: provider data exists but is older than the accepted freshness window.

Provider errors appear in row status and the details panel. A failed row or failed venue call must not blank the whole page.

## Testing

Use TDD for implementation.

Unit tests cover:

- Cost component sign convention.
- Total and delta calculation.
- GMX round-trip fee summing with open and close price impact.
- Net-rate projection over `1h`, `8h`, `24h`, and custom periods.
- Hyperliquid L2 book fill simulation for asks and bids.
- `insufficientDepth` when book levels cannot fill the requested USD size.
- Market matching by normalized symbol.
- Search filtering and venue-volume sorting.

Component tests cover:

- Default controls.
- Custom holding period behavior.
- Generic venue assumptions UI.
- Row status rendering.
- Selected-market detail panel rendering.

## Future Historical Support

V1 keeps the current snapshot model compatible with historical inputs:

- Every provider breakdown includes a timestamp and provider id.
- Scenario inputs are serializable.
- Cost math is pure and can accept current or historical provider snapshots.
- Provider adapters are separate from cost aggregation.

Future historical work can add:

- Snapshot persistence.
- Historical GMX market info and gas snapshots.
- Historical comparison venue books, funding, and fee schedule snapshots.
- Time-series charts for GMX total, venue total, deltas, and component breakdowns.

## References

- Hyperliquid Info endpoint docs: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals
- Hyperliquid fee docs: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/fees
