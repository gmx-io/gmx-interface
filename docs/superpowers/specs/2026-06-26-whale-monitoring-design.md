# Whale Monitoring Tool — Design

Date: 2026-06-26
Status: Approved for planning

## Summary

An internal tool for moderators / the team to monitor "whales" — accounts that
drive a disproportionate share of trading volume in a market. The motivating
case: a single account holding **84.7% of all WTIOIL volume** ($176.95M of
$208.9M) while being absent from GOLD/SILVER/BRENTOIL/NATGAS. Concentration like
this is itself the signal worth watching.

The tool answers three moderator jobs-to-be-done (intent: analytics & community
intelligence):

1. **"Where is there abnormal concentration?"** — markets where one account
   dominates.
2. **"Who are these people?"** — a list of notable whales, with drill-down to a
   per-market breakdown (the original screenshot).
3. **"What changed?"** — basic time-window comparison (all-time / 30d / 7d).
   (Deeper time-series / movement alerts are Phase 2.)

## Goals / Non-goals

**Goals**
- Surface concentration per market and let a moderator drill into a market or an
  account via shareable URLs.
- Reproduce the screenshot's per-account × per-market volume / share breakdown.
- Ship an MVP with **no backend / indexer changes** (use existing Squid queries).
- Reuse existing components; do not deviate from the app's design system.

**Non-goals (MVP)**
- True "top accounts by per-market volume across ALL accounts" ranking (needs a
  custom Squid resolver — Phase 2).
- Cross-chain aggregation (uses the app's current chain only).
- Real-time feeds, alerts, or whale movement notifications.
- Any public-facing surface (internal, dev-gated).

## Users & access

- Audience: moderators / team, internally.
- Access control: gated by `isDevelopment()` from `src/config/env.ts`. No
  stronger programmatic restriction. Follow the existing dev-route pattern in
  `src/App/MainRoutes.tsx:225-238` (`/ui`, `/permits`, `/account-events`, …).

## Scope

- **Markets**: all markets, with a market filter modeled on the chart token
  selector / GM list. RWA markets are the most interesting concentration cases
  but are not special-cased in MVP beyond being filterable.
- **Chain**: the app's current `chainId` (from app state). No separate chain
  switcher in MVP; the Squid endpoint is already per-chain
  (`src/config/indexers.ts`).

## Information architecture & routes

`/monitor` is already taken (renders `SyntheticsStats`). Base route: **`/whales`**.

| Route | View | Notes |
|---|---|---|
| `/whales` | Overview with a top **Markets ⇄ Whales** segmented toggle | Markets mode = markets overview; Whales mode = whale leaderboard |
| `/whales/market/:market` | Market detail (top accounts in one market) | Drill-down from Markets mode |
| `/whales/account/:account` | Account page (per-market breakdown — the screenshot) | Drill-down from anywhere an address appears |

- All drill-down pages have a **back affordance** via `Breadcrumbs` /
  `BreadcrumbItem` with `back` (the chevron-left pattern already used in
  `LeaderboardPage.tsx:28-35`).
- All addresses render with `AddressView` and link to the account page; the
  account page additionally links out to the full existing dashboard via
  `buildAccountDashboardUrl` (`/accounts/:account`).
- Pages are wrapped in `AppPageLayout` (title + SEO + header/sidenav/footer),
  matching `LeaderboardPage` / `AccountDashboard`.

## Views

### View 1 — Markets overview (`/whales`, Markets mode)

Rows = markets (filterable). Default sort by **total volume** (immediate);
concentration is a sortable column once computed. Market totals load
immediately; the top-whale / share / concentration columns fill **progressively**
per market (discovery + bounded exact-volume sums), so dominated markets surface
as their data arrives.

| Column | Source |
|---|---|
| Market | market config |
| Total volume (window) | `positionsVolume` / `positionVolumeInfos` |
| Top whale | `AddressView` (links to account page) |
| Top whale volume | exact `positionChange` sum for the top candidate |
| Top whale share | top whale volume ÷ market total |
| Concentration (top-3 share) | Σ of the top-3 accounts' shares |

- Market filter: reuse the `ChartTokenSelector` pattern (search / category /
  favorites). It doubles as quick-nav: selecting a market can jump to its detail.
- Row click → `/whales/market/:market`.

### View 2 — Market detail (`/whales/market/:market`)

Rows = top accounts in this market, ranked by exact volume.

| Column | Source |
|---|---|
| # | rank |
| Address | `AddressView` → account page |
| Volume (in this market, window) | exact `positionChange` sum |
| Share | volume ÷ market total |
| Peak size | `Position.maxSize` |

- Header shows market name + total volume + top-3 concentration, plus a back
  breadcrumb to `/whales`.
- Row click → `/whales/account/:account`.

### View 3 — Whale leaderboard (`/whales`, Whales mode)

Rows = accounts ranked by total volume (all markets), reusing the existing
leaderboard data path.

| Column | Source |
|---|---|
| # | rank |
| Address | `AddressView` → account page |
| Total volume (window) | `periodAccountStats.volume` (existing leaderboard hook) |
| Active markets | distinct markets from `positions(account_eq)` (cheap, per visible row) |
| Top market | market with largest footprint from that same query |

- Total-volume ranking is cheap (reuses `src/domain/synthetics/leaderboard`).
- "Active markets" / "Top market" are derived from a single per-row
  `positions(where: {account_eq}, orderBy: maxSize_DESC)` query (server-ordered,
  small result), computed lazily for visible rows only.
- Detailed per-market concentration lives on the account page, not in every row.
- Row click → `/whales/account/:account`.

### View 4 — Account page (`/whales/account/:account`)

The screenshot, for one account. Rows = markets the account is active in.

| Column | Source |
|---|---|
| Market | market config |
| Total volume (market, window) | `positionsVolume` / `positionVolumeInfos` |
| Whale volume (this account) | exact `positionChange` sum (account_eq + market_eq) |
| Whale share | whale volume ÷ market total |
| + aggregate row | e.g. "All" / "All RWA" totals |

- **Pie chart** of this account's volume distribution across markets, reusing
  `InteractivePieChart` (`data: {name, value, color}[]`, donut with center label).
- Back breadcrumb (to previous view / `/whales`).
- Link to the full existing dashboard (`/accounts/:account`) for PnL, history,
  and charts — not rebuilt here.

## Data layer

All from the existing per-chain Squid endpoint (`src/config/indexers.ts`).
Verified via live introspection of the Arbitrum endpoint.

### What exists and is used

- **Market total volume**: `positionsVolume(where: {period})` →
  `PositionMarketVolumeInfo { market, volume }` (per-market, 30-decimal USD).
  Confirmed allowed period keys (live endpoint): `1h, 1d, 7d, 30d, 90d, 180d,
  1y, total, epoch`. So **all-time → `total`, 30d → `30d`, 7d → `7d`** map
  directly — no bucket summation needed. (`use24Volumes.ts` uses `1d`.)
- **Exact per-account-per-market volume** (the "Whale volume" column): sum
  `positionChange.sizeDeltaUsd` where `{account_eq, market_eq, timestamp_gte?}`,
  paginated. `PositionChangeWhereInput` supports `account_eq`, `market_eq`,
  `market_in`, and `timestamp_*`. Volume = Σ |sizeDeltaUsd| over increase +
  decrease events (confirm sign convention during implementation).
- **Discovery (top accounts in a market)**: `positions(where: {market_eq,
  isSnapshot_eq: false}, orderBy: maxSize_DESC, limit: 50)`. Server-ordered,
  cheap. Returns a candidate pool by peak position size.
- **Whale total volume (leaderboard)**: `periodAccountStats(where:
  {maxCapital_gte, from, to})` → has `volume`; sort client-side. Reuse the
  existing leaderboard hook in `src/domain/synthetics/leaderboard/index.ts`.

### Discovery strategy & its one honest limitation

The custom `periodAccountStats` resolver filters only by
`{maxCapital_gte, id_eq, from, to}` — **no market dimension**. There is no cheap
server-side "rank all accounts by volume within a market." So:

1. Pull a **wide candidate pool** (~top 50 by `maxSize`) for the market —
   one cheap server-ordered query.
2. Compute **exact volume** (`positionChange` sum) for that pool, concurrently.
3. Rank displayed rows by exact volume; show top-N.

This makes the displayed ranking exact *within the candidate pool*. The only
miss is a whale outside the top-50-by-`maxSize` but with very high churn on small
positions — rare, and negligible in thin RWA markets (the motivating case).
Discovery from live positions can also miss accounts that have fully closed.

**Phase 2 fix**: a custom Squid resolver returning top-N accounts by summed
`sizeDeltaUsd` per market/period. The frontend isolates the discovery source so
swapping it in is a localized change.

### Time windows

- Default **all-time**, plus **30d** / **7d** toggles (reuse the leaderboard
  period control / `Tabs`).
- 30d/7d: `positionChange` filtered by `timestamp_gte = now − N days`; market
  totals from the matching period bucket.

## Component reuse map

| Need | Component / helper | Path |
|---|---|---|
| Tables | `Table`, `TableTh`, `TableTd`, `TableTr`, `TableTrActionable`, `TableTheadTr`, `Sorter` | `src/components/Table/Table.tsx` |
| Back navigation | `Breadcrumbs`, `BreadcrumbItem` (`back`) | `src/components/Breadcrumbs/Breadcrumbs.tsx` |
| Market filter | `ChartTokenSelector` (or lighter `TokenSelector`) | `src/components/ChartTokenSelector/ChartTokenSelector.tsx` |
| Markets/Whales + period toggles | `Tabs` (generic); mirror `ModeTabs` look for the segmented pill if desired | `src/components/Tabs/Tabs.tsx`, `src/components/ChartTokenSelector/ModeTabs.tsx` |
| Pie chart | `InteractivePieChart` (recharts donut) | `src/components/InteractivePieChart/InteractivePieChart.tsx` |
| Page scaffold + SEO | `AppPageLayout` | `src/components/AppPageLayout/AppPageLayout.tsx` |
| Formatters | `formatUsd`, `formatPercentage`, `formatAmountHuman`, `formatAmount` | `lib/numbers` |
| Address + account link | `AddressView`, `buildAccountDashboardUrl` | `src/components/AddressView/AddressView.tsx`, `src/pages/AccountDashboard/buildAccountDashboardUrl.tsx` |
| Dev gate | `isDevelopment()` | `src/config/env.ts` |
| Leaderboard data | existing leaderboard query/hook | `src/domain/synthetics/leaderboard/index.ts` |

New code lives under `src/pages/Whales/` (page components) and
`src/domain/synthetics/whales/` (data hooks). No index/re-export files
(per repo conventions).

## States & performance

- **Loading**: skeleton rows in tables; the per-candidate exact-volume sums
  resolve progressively (show market totals first, fill whale columns as sums
  complete).
- **Empty**: market with no qualifying accounts → empty-state row.
- **Error**: per the app's existing query-error patterns.
- **Performance**:
  - Discovery is one cheap server-ordered query per market.
  - Exact-volume sums run concurrently, bounded, only for the visible candidate
    pool; paginate `positionChange` with a sane cap and reuse the app's existing
    data-fetching/caching layer.
  - The **markets overview is the heaviest screen** — it runs discovery + top-k
    exact sums for every listed market (bounded concurrency, progressive fill),
    and is the prime beneficiary of the Phase 2 resolver.
  - "Active markets / top market" on the whale leaderboard are computed lazily
    for visible rows only.

## Phase 2 / out of scope

- Custom Squid resolver for true top-N-by-volume per market/period (removes the
  candidate-pool limitation and reduces client work).
- Cross-chain aggregation + chain switcher.
- Time-series / whale movement view and alerting ("whale entered/exited market
  X").
- Wash-trade / manipulation heuristics.

## Open questions / risks

1. ~~Market-total period keys~~ **(Resolved)**: `positionsVolume` accepts
   `1h/1d/7d/30d/90d/180d/1y/total/epoch`; windows map directly to
   `total` / `30d` / `7d`.
2. **`sizeDeltaUsd` sign convention**: confirm volume = Σ |sizeDeltaUsd| across
   increase + decrease events matches the screenshot's definition.
3. **Closed positions in discovery**: live-position discovery can under-count
   accounts that fully closed within the window; acceptable for MVP, resolved by
   the Phase 2 resolver.
4. **Candidate-pool size (50)**: tune for fidelity vs. cost after seeing real
   data on deep markets.
