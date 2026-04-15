# Incentives Audit Page — Design Spec

## Purpose

A development-only page for verifying that the incentives program is not overpaying anyone. Primary audit fields: `effectivePointsRatio` and `effectiveRewardsRatio`. Allows sorting/filtering accounts per epoch to identify suspicious outliers, then drilling into individual accounts for detailed inspection.

## Route

`/incentives-audit/:account?` — gated with `isDevelopment()` in `MainRoutes.tsx`.

- No `:account` param → **List View**
- With `:account` param → **Account Detail View**
- Epoch selection stored as query param: `?epoch=<timestamp>` (omitted = all epochs)

## Data Source

GraphQL query `IncentiveAccountEpochAudit` from the Subsquid indexer:

```graphql
query IncentiveAccountEpochAudit(
  $epochTimestamp: Int
  $account: String
  $orderBy: String
  $orderDirection: String
  $limit: Int
  $offset: Int
) {
  incentiveAccountEpochAudit(
    epochTimestamp: $epochTimestamp
    account: $account
    orderBy: $orderBy
    orderDirection: $orderDirection
    limit: $limit
    offset: $offset
  ) {
    id
    account
    epochTimestamp
    points
    rewards
    fees
    volume
    avgMultiplier
    maxMultiplier
    volumeTier
    stakingTier
    boostIds
    effectivePointsRatio
    effectiveRewardsRatio
    pointRecordsCount
    rewardRecordsCount
    lastReceivedAt
  }
}
```

## List View

### Epoch Selector

- Dropdown at top of page.
- Options: "All epochs" (default) + each past epoch labeled by date.
- Epochs computed from `IncentivesConfig`: iterate from `programStartTimestamp` to `epochTimestamp` by `epochDuration`.
- Selecting an epoch updates the `?epoch=` query param and refetches data.

### Summary Cards

Four cards displayed in a row above the table:

| Card | Value |
|------|-------|
| Total Accounts | Count of rows returned (from pagination or data length) |
| Avg Points Ratio | Average `effectivePointsRatio` across loaded accounts |
| Avg Rewards Ratio | Average `effectiveRewardsRatio` across loaded accounts |
| Total Rewards | Sum of `rewards` for the selected epoch |

Note: These are computed from the loaded page of data. A dedicated server-side aggregation endpoint would be more accurate for "all accounts" stats but is out of scope for v1.

### Sortable Table

Columns (all sortable via server-side `orderBy`/`orderDirection`):

| Column | Field | Display |
|--------|-------|---------|
| Account | `account` | Truncated address, clickable link to detail view |
| Points | `points` | Formatted number |
| Rewards | `rewards` | Formatted number |
| Fees | `fees` | Formatted number |
| Volume | `volume` | Formatted number |
| Avg Multiplier | `avgMultiplier` | Formatted with decimals |
| Max Multiplier | `maxMultiplier` | Formatted with decimals |
| Volume Tier | `volumeTier` | Badge label from constants |
| Staking Tier | `stakingTier` | Badge label from constants |
| Boosts | `boostIds` | Decoded to readable names from constants |
| Eff. Points Ratio | `effectivePointsRatio` | Key audit field |
| Eff. Rewards Ratio | `effectiveRewardsRatio` | Key audit field |

- Pagination: `BottomTablePagination`, 20 rows per page.
- Sorting and pagination are server-side via query variables.
- Default sort: `effectiveRewardsRatio` descending.
- Uses existing `Sorter` component with `useSorterHandlers`.

## Account Detail View

Navigated to via `/incentives-audit/:account` (optionally with `?epoch=`).

### Header

- Full account address with copy-to-clipboard.
- Back link to list view (preserves epoch selection).

### Audit Data Section

All `IncentiveAccountEpochAudit` fields for this account in the selected epoch, displayed as a key-value card layout:
- All numeric fields formatted.
- `boostIds` decoded to readable names using `BOOST_LABELS` from constants.
- `volumeTier` / `stakingTier` shown with badge labels.
- `lastReceivedAt` formatted as date/time.

### Live Status Section

Fetched from `useAccountIncentiveStatus(chainId, account)`:
- Current multiplier
- Current volume tier + projected volume tier
- Current staking tier + projected staking tier
- Points balance
- Traded volume this epoch

### Dashboard Section

Fetched from `useAccountIncentiveDashboard(chainId, account)`:
- Points balance, rewards balance.
- Recent epoch stats table: per-epoch multiplier, tiers, volume, boosts.

### Epoch History

If "All epochs" is selected, show all audit rows for this account across epochs in a small table. If a specific epoch is selected, show that epoch's data with prev/next navigation.

## File Structure

```
src/
  domain/synthetics/incentives/
    useIncentiveAccountEpochAudit.ts   # New hook for the audit query
  pages/IncentivesDebug/
    IncentivesAuditPage.tsx            # Main page component with routing
    IncentivesAuditList.tsx            # List view (cards + table)
    IncentivesAuditDetail.tsx          # Account detail view
    IncentivesAuditSummaryCards.tsx    # Summary cards component
```

## Technical Decisions

- **Data fetching**: SWR + Apollo (`getSubsquidGraphClient`), same pattern as all other incentive hooks.
- **Sorting**: Server-side via `orderBy`/`orderDirection` query params. Uses `Sorter` + `useSorterHandlers`.
- **Pagination**: Server-side via `limit`/`offset`. Uses `BottomTablePagination`.
- **Styling**: Tailwind classes, consistent with existing pages.
- **Page layout**: `AppPageLayout` wrapper.
- **Dev gating**: `isDevelopment()` check in `MainRoutes.tsx`, same as other dev pages.
- **Chain**: Uses `useChainId()` — incentives are currently Arbitrum-only but the code is chain-agnostic.

## Out of Scope

- Automatic suspicious-account flagging or threshold alerts.
- Server-side aggregation endpoint for summary stats.
- Individual point/reward record drill-down (would need a new query).
