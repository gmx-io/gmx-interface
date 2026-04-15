# Incentives Audit Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dev-only page at `/incentives-audit` for auditing incentive program payouts per epoch, with sortable tables and per-account drill-down.

**Architecture:** Single route `/incentives-audit/:account?` gated with `isDevelopment()`. List view shows epoch selector, summary cards, and a server-side sortable/paginated table of `IncentiveAccountEpochAudit` data. Account detail view shows audit data plus live status and dashboard data from existing hooks. New data hook `useIncentiveAccountEpochAudit` follows the established SWR + Apollo pattern.

**Tech Stack:** React 18, React Router v5, SWR, Apollo Client (GraphQL), Tailwind CSS, @lingui for i18n, existing Table/Sorter/Pagination components.

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/domain/synthetics/incentives/useIncentiveAccountEpochAudit.ts` | Data hook: GraphQL query + SWR caching for audit data |
| Create | `src/pages/IncentivesDebug/IncentivesAuditPage.tsx` | Main page component, routes between list and detail views |
| Create | `src/pages/IncentivesDebug/IncentivesAuditList.tsx` | List view: epoch selector, summary cards, sortable table |
| Create | `src/pages/IncentivesDebug/IncentivesAuditDetail.tsx` | Account detail view: audit data, live status, dashboard |
| Modify | `src/App/MainRoutes.tsx:229-242` | Add route for `/incentives-audit/:account?` |

---

### Task 1: Data Hook — `useIncentiveAccountEpochAudit`

**Files:**
- Create: `src/domain/synthetics/incentives/useIncentiveAccountEpochAudit.ts`

- [ ] **Step 1: Create the data hook**

This hook fetches audit data from the Subsquid indexer. It follows the exact same SWR + Apollo pattern as `useIncentivesLeaderboard` (see `src/domain/synthetics/incentives/useIncentivesLeaderboard.ts`).

```typescript
import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers";

import type { BoostId, StakingTierId, VolumeTierId } from "./types";

export type AuditEntry = {
  id: string;
  account: string;
  epochTimestamp: number;
  points: number;
  rewards: number;
  fees: number;
  volume: number;
  avgMultiplier: number;
  maxMultiplier: number;
  volumeTier: VolumeTierId | null;
  stakingTier: StakingTierId | null;
  boostIds: BoostId[];
  effectivePointsRatio: number;
  effectiveRewardsRatio: number;
  pointRecordsCount: number;
  rewardRecordsCount: number;
  lastReceivedAt: number;
};

export type AuditSummary = {
  totalAccounts: number;
  avgPointsRatio: number;
  avgRewardsRatio: number;
  totalRewards: number;
};

const AUDIT_QUERY = gql`
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
`;

export function useIncentiveAccountEpochAudit(
  chainId: number,
  params: {
    epochTimestamp?: number;
    account?: string;
    orderBy?: string;
    orderDirection?: string;
    limit?: number;
    offset?: number;
    enabled?: boolean;
  }
) {
  const { epochTimestamp, account, orderBy, orderDirection, limit = 20, offset = 0, enabled = true } = params;

  const { data, error, isLoading } = useSWR<AuditEntry[] | undefined>(
    enabled
      ? ["useIncentiveAccountEpochAudit", chainId, epochTimestamp ?? "all", account ?? "all", orderBy, orderDirection, limit, offset]
      : null,
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        if (!client) return undefined;

        const variables: Record<string, unknown> = { limit, offset };
        if (epochTimestamp !== undefined) variables.epochTimestamp = epochTimestamp;
        if (account) variables.account = account.toLowerCase();
        if (orderBy) variables.orderBy = orderBy;
        if (orderDirection) variables.orderDirection = orderDirection;

        const res = await client.query({
          query: AUDIT_QUERY,
          variables,
          fetchPolicy: "no-cache",
        });

        const entries = res?.data?.incentiveAccountEpochAudit;
        if (!entries) return undefined;

        return entries.map(
          (e: {
            id: string;
            account: string;
            epochTimestamp: number;
            points: number;
            rewards: number;
            fees: number;
            volume: number;
            avgMultiplier: number;
            maxMultiplier: number;
            volumeTier: string | null;
            stakingTier: string | null;
            boostIds: string[];
            effectivePointsRatio: number;
            effectiveRewardsRatio: number;
            pointRecordsCount: number;
            rewardRecordsCount: number;
            lastReceivedAt: number;
          }) => ({
            id: e.id,
            account: e.account,
            epochTimestamp: e.epochTimestamp,
            points: e.points,
            rewards: e.rewards,
            fees: e.fees,
            volume: e.volume,
            avgMultiplier: e.avgMultiplier,
            maxMultiplier: e.maxMultiplier,
            volumeTier: (e.volumeTier as VolumeTierId) ?? null,
            stakingTier: (e.stakingTier as StakingTierId) ?? null,
            boostIds: e.boostIds as BoostId[],
            effectivePointsRatio: e.effectivePointsRatio,
            effectiveRewardsRatio: e.effectiveRewardsRatio,
            pointRecordsCount: e.pointRecordsCount,
            rewardRecordsCount: e.rewardRecordsCount,
            lastReceivedAt: e.lastReceivedAt,
          })
        );
      },
      refreshInterval: 30_000,
      revalidateOnFocus: false,
    }
  );

  const summary = useMemo<AuditSummary | undefined>(() => {
    if (!data?.length) return undefined;
    const totalAccounts = data.length;
    const avgPointsRatio = data.reduce((sum, e) => sum + e.effectivePointsRatio, 0) / totalAccounts;
    const avgRewardsRatio = data.reduce((sum, e) => sum + e.effectiveRewardsRatio, 0) / totalAccounts;
    const totalRewards = data.reduce((sum, e) => sum + e.rewards, 0);
    return { totalAccounts, avgPointsRatio, avgRewardsRatio, totalRewards };
  }, [data]);

  return useMemo(() => ({ data, summary, error, loading: isLoading }), [data, summary, error, isLoading]);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `yarn tscheck`
Expected: No errors related to `useIncentiveAccountEpochAudit.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/domain/synthetics/incentives/useIncentiveAccountEpochAudit.ts
git commit -m "feat: add useIncentiveAccountEpochAudit data hook for audit page"
```

---

### Task 2: Main Page Component — `IncentivesAuditPage`

**Files:**
- Create: `src/pages/IncentivesDebug/IncentivesAuditPage.tsx`

**Context:** This page uses React Router v5 `useParams` to determine whether to show the list or detail view. The route is `/incentives-audit/:account?`. Epoch is passed via query param `?epoch=<timestamp>`. Reference `src/pages/AccountEvents/AccountEvents.tsx` for the dev page pattern with `useParams`.

- [ ] **Step 1: Create the page component**

```typescript
import { t } from "@lingui/macro";
import { useMemo } from "react";
import { useHistory, useParams } from "react-router-dom";

import { useIncentivesConfig } from "domain/synthetics/incentives/useIncentivesConfig";
import { useChainId } from "lib/chains";
import { useQueryParam } from "lib/useQueryParam";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import PageTitle from "components/PageTitle/PageTitle";

import { IncentivesAuditDetail } from "./IncentivesAuditDetail";
import { IncentivesAuditList } from "./IncentivesAuditList";

export function IncentivesAuditPage() {
  const { account } = useParams<{ account?: string }>();
  const { chainId } = useChainId();
  const history = useHistory();
  const { data: config } = useIncentivesConfig(chainId);

  const [epochParam, setEpochParam] = useQueryParam("epoch");
  const selectedEpoch = epochParam ? Number(epochParam) : undefined;

  const epochs = useMemo(() => {
    if (!config) return [];
    const result: { timestamp: number; label: string }[] = [];
    let ts = config.programStartTimestamp;
    while (ts <= config.epochTimestamp) {
      const date = new Date(ts * 1000);
      result.push({
        timestamp: ts,
        label: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      });
      ts += config.epochDuration;
    }
    return result.reverse();
  }, [config]);

  const handleEpochChange = (epoch: number | undefined) => {
    setEpochParam(epoch !== undefined ? String(epoch) : undefined);
  };

  const handleAccountClick = (addr: string) => {
    const epochQuery = selectedEpoch !== undefined ? `?epoch=${selectedEpoch}` : "";
    history.push(`/incentives-audit/${addr}${epochQuery}`);
  };

  const handleBackToList = () => {
    const epochQuery = selectedEpoch !== undefined ? `?epoch=${selectedEpoch}` : "";
    history.push(`/incentives-audit${epochQuery}`);
  };

  return (
    <AppPageLayout title={t`Incentives Audit`}>
      <PageTitle title={t`Incentives Audit`} subtitle={t`Dev-only: inspect incentive program payouts per epoch`} isTop />

      {account ? (
        <IncentivesAuditDetail
          chainId={chainId}
          account={account}
          selectedEpoch={selectedEpoch}
          epochs={epochs}
          onEpochChange={handleEpochChange}
          onBack={handleBackToList}
        />
      ) : (
        <IncentivesAuditList
          chainId={chainId}
          selectedEpoch={selectedEpoch}
          epochs={epochs}
          onEpochChange={handleEpochChange}
          onAccountClick={handleAccountClick}
        />
      )}
    </AppPageLayout>
  );
}
```

- [ ] **Step 2: Check if `useQueryParam` exists**

This project likely has a query param utility. Search for it:

```bash
grep -r "useQueryParam" src/lib/ --include="*.ts" --include="*.tsx" -l
```

If it doesn't exist, implement inline in this file using `useLocation` and `useHistory`:

```typescript
function useQueryParam(key: string): [string | undefined, (value: string | undefined) => void] {
  const { search } = useLocation();
  const history = useHistory();

  const value = useMemo(() => {
    return new URLSearchParams(search).get(key) ?? undefined;
  }, [search, key]);

  const setValue = useCallback(
    (newValue: string | undefined) => {
      const params = new URLSearchParams(search);
      if (newValue === undefined) {
        params.delete(key);
      } else {
        params.set(key, newValue);
      }
      const qs = params.toString();
      history.replace({ search: qs ? `?${qs}` : "" });
    },
    [search, key, history]
  );

  return [value, setValue];
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `yarn tscheck`
Expected: No new errors (will have missing import errors for `IncentivesAuditList` and `IncentivesAuditDetail` — those are created in the next tasks).

- [ ] **Step 4: Commit**

```bash
git add src/pages/IncentivesDebug/IncentivesAuditPage.tsx
git commit -m "feat: add IncentivesAuditPage shell with epoch selector and routing"
```

---

### Task 3: List View — `IncentivesAuditList`

**Files:**
- Create: `src/pages/IncentivesDebug/IncentivesAuditList.tsx`

**Context:** This component renders epoch selector dropdown, summary cards, and the sortable/paginated audit table. It uses:
- `useIncentiveAccountEpochAudit` from Task 1 for data
- `useSorterHandlers` from `components/Sorter/Sorter.tsx` for column sorting (see that file for API)
- `Table`, `TableTh`, `TableTd`, `TableTr`, `TableTheadTr` from `components/Table/Table.tsx`
- `Sorter` from `components/Sorter/Sorter.tsx`
- `BottomTablePagination` from `components/Pagination/BottomTablePagination.tsx`
- `formatMultiplier`, `getVolumeTierBadge`, `getStakingTierBadge`, `getBoostLabel` from `domain/synthetics/incentives/constants.ts`

The sorter uses server-side sorting: `orderBy` and `direction` from `useSorterHandlers` are passed directly to the GraphQL query variables. The `direction` from `useSorterHandlers` uses values `"asc"`, `"desc"`, `"unspecified"`. Map `"unspecified"` to default sort `effectiveRewardsRatio desc`.

- [ ] **Step 1: Create the list component**

```typescript
import { Trans } from "@lingui/macro";
import { useMemo, useState } from "react";

import {
  formatMultiplier,
  getBoostLabel,
  getStakingTierBadge,
  getVolumeTierBadge,
} from "domain/synthetics/incentives/constants";
import { useIncentiveAccountEpochAudit } from "domain/synthetics/incentives/useIncentiveAccountEpochAudit";

import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import { Sorter, useSorterHandlers } from "components/Sorter/Sorter";
import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";

type SortField =
  | "points"
  | "rewards"
  | "fees"
  | "volume"
  | "avgMultiplier"
  | "maxMultiplier"
  | "effectivePointsRatio"
  | "effectiveRewardsRatio";

const PAGE_SIZE = 20;

export function IncentivesAuditList({
  chainId,
  selectedEpoch,
  epochs,
  onEpochChange,
  onAccountClick,
}: {
  chainId: number;
  selectedEpoch: number | undefined;
  epochs: { timestamp: number; label: string }[];
  onEpochChange: (epoch: number | undefined) => void;
  onAccountClick: (account: string) => void;
}) {
  const [page, setPage] = useState(0);
  const { orderBy, direction, getSorterProps } = useSorterHandlers<SortField>("incentives-audit", {
    orderBy: "effectiveRewardsRatio",
    direction: "desc",
  });

  const effectiveOrderBy = direction === "unspecified" ? "effectiveRewardsRatio" : orderBy;
  const effectiveDirection = direction === "unspecified" ? "desc" : direction;

  const { data, summary, loading } = useIncentiveAccountEpochAudit(chainId, {
    epochTimestamp: selectedEpoch,
    orderBy: effectiveOrderBy,
    orderDirection: effectiveDirection,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const pageCount = useMemo(() => {
    if (!summary) return 1;
    return Math.max(1, Math.ceil(summary.totalAccounts / PAGE_SIZE));
  }, [summary]);

  const handleEpochSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onEpochChange(val === "all" ? undefined : Number(val));
    setPage(0);
  };

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="mt-12 flex flex-col gap-16">
      {/* Epoch Selector */}
      <div className="flex items-center gap-8">
        <label className="text-body-medium text-slate-100">
          <Trans>Epoch:</Trans>
        </label>
        <select
          className="rounded-4 border border-gray-700 bg-slate-800 px-12 py-8 text-body-medium text-slate-100"
          value={selectedEpoch ?? "all"}
          onChange={handleEpochSelect}
        >
          <option value="all">All epochs</option>
          {epochs.map((ep) => (
            <option key={ep.timestamp} value={ep.timestamp}>
              Epoch {ep.label}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-8">
          <SummaryCard label="Total Accounts" value={String(summary.totalAccounts)} />
          <SummaryCard label="Avg Points Ratio" value={summary.avgPointsRatio.toFixed(4)} />
          <SummaryCard label="Avg Rewards Ratio" value={summary.avgRewardsRatio.toFixed(4)} />
          <SummaryCard label="Total Rewards" value={summary.totalRewards.toFixed(2)} />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <thead>
            <TableTheadTr>
              <TableTh padding="compact"><Trans>Account</Trans></TableTh>
              <TableTh padding="compact">
                <Sorter {...getSorterProps("points")}><Trans>Points</Trans></Sorter>
              </TableTh>
              <TableTh padding="compact">
                <Sorter {...getSorterProps("rewards")}><Trans>Rewards</Trans></Sorter>
              </TableTh>
              <TableTh padding="compact">
                <Sorter {...getSorterProps("fees")}><Trans>Fees</Trans></Sorter>
              </TableTh>
              <TableTh padding="compact">
                <Sorter {...getSorterProps("volume")}><Trans>Volume</Trans></Sorter>
              </TableTh>
              <TableTh padding="compact">
                <Sorter {...getSorterProps("avgMultiplier")}><Trans>Avg Mult.</Trans></Sorter>
              </TableTh>
              <TableTh padding="compact">
                <Sorter {...getSorterProps("maxMultiplier")}><Trans>Max Mult.</Trans></Sorter>
              </TableTh>
              <TableTh padding="compact"><Trans>Vol. Tier</Trans></TableTh>
              <TableTh padding="compact"><Trans>Stk. Tier</Trans></TableTh>
              <TableTh padding="compact"><Trans>Boosts</Trans></TableTh>
              <TableTh padding="compact">
                <Sorter {...getSorterProps("effectivePointsRatio")}><Trans>Eff. Pts Ratio</Trans></Sorter>
              </TableTh>
              <TableTh padding="compact">
                <Sorter {...getSorterProps("effectiveRewardsRatio")}><Trans>Eff. Rwd Ratio</Trans></Sorter>
              </TableTh>
            </TableTheadTr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={12} className="py-20 text-center text-slate-400">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && !data?.length && (
              <tr>
                <td colSpan={12} className="py-20 text-center text-slate-400">
                  No data
                </td>
              </tr>
            )}
            {data?.map((entry) => (
              <TableTr
                key={entry.id}
                hoverable
                onClick={() => onAccountClick(entry.account)}
              >
                <TableTd padding="compact" className="font-mono text-blue-300 cursor-pointer">
                  {truncateAddress(entry.account)}
                </TableTd>
                <TableTd padding="compact">{entry.points.toFixed(2)}</TableTd>
                <TableTd padding="compact">{entry.rewards.toFixed(2)}</TableTd>
                <TableTd padding="compact">{entry.fees.toFixed(2)}</TableTd>
                <TableTd padding="compact">{entry.volume.toFixed(2)}</TableTd>
                <TableTd padding="compact">{formatMultiplier(entry.avgMultiplier)}</TableTd>
                <TableTd padding="compact">{formatMultiplier(entry.maxMultiplier)}</TableTd>
                <TableTd padding="compact">{entry.volumeTier ? getVolumeTierBadge(entry.volumeTier) : "—"}</TableTd>
                <TableTd padding="compact">{entry.stakingTier ? getStakingTierBadge(entry.stakingTier) : "—"}</TableTd>
                <TableTd padding="compact">
                  {entry.boostIds.length > 0
                    ? entry.boostIds.map((b) => getBoostLabel(b)).join(", ")
                    : "—"}
                </TableTd>
                <TableTd padding="compact">{entry.effectivePointsRatio.toFixed(4)}</TableTd>
                <TableTd padding="compact">{entry.effectiveRewardsRatio.toFixed(4)}</TableTd>
              </TableTr>
            ))}
          </tbody>
        </Table>
      </div>

      <BottomTablePagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-4 border border-gray-700 bg-slate-800 p-16">
      <div className="text-caption text-slate-400">{label}</div>
      <div className="mt-4 text-body-large text-slate-100">{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `yarn tscheck`
Expected: No errors in this file.

- [ ] **Step 3: Commit**

```bash
git add src/pages/IncentivesDebug/IncentivesAuditList.tsx
git commit -m "feat: add IncentivesAuditList with epoch selector, summary cards, and sortable table"
```

---

### Task 4: Account Detail View — `IncentivesAuditDetail`

**Files:**
- Create: `src/pages/IncentivesDebug/IncentivesAuditDetail.tsx`

**Context:** This component shows drill-down for a single account. It fetches:
1. `useIncentiveAccountEpochAudit` with the `account` param (from Task 1)
2. `useAccountIncentiveStatus` from `src/domain/synthetics/incentives/useAccountIncentiveStatus.ts` — returns `AccountIncentiveStatus` with `pointsBalance` (bigint), `multiplier`, `volumeTier`, `stakingTier`, `projectedVolumeTier`, `projectedStakingTier`, `epochTimestamp`, `tradedVolume` (bigint)
3. `useAccountIncentiveDashboard` from `src/domain/synthetics/incentives/useAccountIncentiveDashboard.ts` — returns `AccountIncentiveDashboard` with `pointsBalance` (bigint), `rewardsBalance` (bigint), `recentStats` array of `EpochStats`

Note: `pointsBalance`, `rewardsBalance`, `tradedVolume` are `bigint` — format with `formatAmount` or convert to number for display. Use `30` decimals for points/rewards (standard token precision), but check how existing code formats these. The constants file has `MULTIPLIER_DECIMALS = 100` for multiplier formatting.

- [ ] **Step 1: Create the detail component**

```typescript
import { Trans } from "@lingui/macro";
import { format } from "date-fns";

import {
  formatMultiplier,
  getBoostLabel,
  getStakingTierBadge,
  getVolumeTierBadge,
} from "domain/synthetics/incentives/constants";
import { useAccountIncentiveDashboard } from "domain/synthetics/incentives/useAccountIncentiveDashboard";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/useAccountIncentiveStatus";
import { useIncentiveAccountEpochAudit } from "domain/synthetics/incentives/useIncentiveAccountEpochAudit";

import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";

export function IncentivesAuditDetail({
  chainId,
  account,
  selectedEpoch,
  epochs,
  onEpochChange,
  onBack,
}: {
  chainId: number;
  account: string;
  selectedEpoch: number | undefined;
  epochs: { timestamp: number; label: string }[];
  onEpochChange: (epoch: number | undefined) => void;
  onBack: () => void;
}) {
  const { data: auditEntries, loading: auditLoading } = useIncentiveAccountEpochAudit(chainId, {
    account,
    epochTimestamp: selectedEpoch,
    limit: 100,
  });

  const { data: status } = useAccountIncentiveStatus(chainId, { account });
  const { data: dashboard } = useAccountIncentiveDashboard(chainId, { account });

  const handleEpochSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onEpochChange(val === "all" ? undefined : Number(val));
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(account);
  };

  return (
    <div className="mt-12 flex flex-col gap-16">
      {/* Header */}
      <div className="flex items-center gap-12">
        <button onClick={onBack} className="text-blue-300 hover:text-blue-200">
          &larr; <Trans>Back to list</Trans>
        </button>
      </div>

      <div className="flex items-center gap-8">
        <h2 className="font-mono text-body-large text-slate-100">{account}</h2>
        <button onClick={copyAddress} className="text-slate-400 hover:text-slate-200 text-body-small">
          <Trans>Copy</Trans>
        </button>
      </div>

      {/* Epoch Selector */}
      <div className="flex items-center gap-8">
        <label className="text-body-medium text-slate-100">
          <Trans>Epoch:</Trans>
        </label>
        <select
          className="rounded-4 border border-gray-700 bg-slate-800 px-12 py-8 text-body-medium text-slate-100"
          value={selectedEpoch ?? "all"}
          onChange={handleEpochSelect}
        >
          <option value="all">All epochs</option>
          {epochs.map((ep) => (
            <option key={ep.timestamp} value={ep.timestamp}>
              Epoch {ep.label}
            </option>
          ))}
        </select>
      </div>

      {/* Audit Data */}
      <Section title="Audit Data">
        {auditLoading && <div className="text-slate-400">Loading...</div>}
        {!auditLoading && !auditEntries?.length && <div className="text-slate-400">No audit data for this account/epoch</div>}
        {auditEntries && auditEntries.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <TableTheadTr>
                  <TableTh padding="compact"><Trans>Epoch</Trans></TableTh>
                  <TableTh padding="compact"><Trans>Points</Trans></TableTh>
                  <TableTh padding="compact"><Trans>Rewards</Trans></TableTh>
                  <TableTh padding="compact"><Trans>Fees</Trans></TableTh>
                  <TableTh padding="compact"><Trans>Volume</Trans></TableTh>
                  <TableTh padding="compact"><Trans>Avg Mult.</Trans></TableTh>
                  <TableTh padding="compact"><Trans>Max Mult.</Trans></TableTh>
                  <TableTh padding="compact"><Trans>Vol. Tier</Trans></TableTh>
                  <TableTh padding="compact"><Trans>Stk. Tier</Trans></TableTh>
                  <TableTh padding="compact"><Trans>Boosts</Trans></TableTh>
                  <TableTh padding="compact"><Trans>Eff. Pts Ratio</Trans></TableTh>
                  <TableTh padding="compact"><Trans>Eff. Rwd Ratio</Trans></TableTh>
                  <TableTh padding="compact"><Trans>Pt. Records</Trans></TableTh>
                  <TableTh padding="compact"><Trans>Rwd. Records</Trans></TableTh>
                  <TableTh padding="compact"><Trans>Last Received</Trans></TableTh>
                </TableTheadTr>
              </thead>
              <tbody>
                {auditEntries.map((entry) => (
                  <TableTr key={entry.id}>
                    <TableTd padding="compact">
                      {format(new Date(entry.epochTimestamp * 1000), "MMM d, yyyy")}
                    </TableTd>
                    <TableTd padding="compact">{entry.points.toFixed(2)}</TableTd>
                    <TableTd padding="compact">{entry.rewards.toFixed(2)}</TableTd>
                    <TableTd padding="compact">{entry.fees.toFixed(2)}</TableTd>
                    <TableTd padding="compact">{entry.volume.toFixed(2)}</TableTd>
                    <TableTd padding="compact">{formatMultiplier(entry.avgMultiplier)}</TableTd>
                    <TableTd padding="compact">{formatMultiplier(entry.maxMultiplier)}</TableTd>
                    <TableTd padding="compact">{entry.volumeTier ? getVolumeTierBadge(entry.volumeTier) : "—"}</TableTd>
                    <TableTd padding="compact">{entry.stakingTier ? getStakingTierBadge(entry.stakingTier) : "—"}</TableTd>
                    <TableTd padding="compact">
                      {entry.boostIds.length > 0 ? entry.boostIds.map((b) => getBoostLabel(b)).join(", ") : "—"}
                    </TableTd>
                    <TableTd padding="compact">{entry.effectivePointsRatio.toFixed(4)}</TableTd>
                    <TableTd padding="compact">{entry.effectiveRewardsRatio.toFixed(4)}</TableTd>
                    <TableTd padding="compact">{entry.pointRecordsCount}</TableTd>
                    <TableTd padding="compact">{entry.rewardRecordsCount}</TableTd>
                    <TableTd padding="compact">
                      {entry.lastReceivedAt
                        ? format(new Date(entry.lastReceivedAt * 1000), "MMM d, HH:mm")
                        : "—"}
                    </TableTd>
                  </TableTr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Section>

      {/* Live Status */}
      {status && (
        <Section title="Live Status">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <KV label="Multiplier" value={formatMultiplier(status.multiplier)} />
            <KV label="Volume Tier" value={status.volumeTier ? getVolumeTierBadge(status.volumeTier) : "None"} />
            <KV label="Staking Tier" value={status.stakingTier ? getStakingTierBadge(status.stakingTier) : "None"} />
            <KV label="Projected Vol. Tier" value={status.projectedVolumeTier ? getVolumeTierBadge(status.projectedVolumeTier) : "None"} />
            <KV label="Projected Stk. Tier" value={status.projectedStakingTier ? getStakingTierBadge(status.projectedStakingTier) : "None"} />
            <KV label="Points Balance" value={status.pointsBalance.toString()} />
            <KV label="Traded Volume" value={status.tradedVolume.toString()} />
            <KV label="Epoch" value={format(new Date(status.epochTimestamp * 1000), "MMM d, yyyy")} />
          </div>
        </Section>
      )}

      {/* Dashboard Data */}
      {dashboard && (
        <Section title="Dashboard">
          <div className="mb-12 grid grid-cols-2 gap-8 sm:grid-cols-3">
            <KV label="Points Balance" value={dashboard.pointsBalance.toString()} />
            <KV label="Rewards Balance" value={dashboard.rewardsBalance.toString()} />
          </div>

          {dashboard.recentStats.length > 0 && (
            <>
              <h4 className="mb-8 text-body-medium text-slate-300">
                <Trans>Recent Epoch Stats</Trans>
              </h4>
              <div className="overflow-x-auto">
                <Table>
                  <thead>
                    <TableTheadTr>
                      <TableTh padding="compact"><Trans>Epoch</Trans></TableTh>
                      <TableTh padding="compact"><Trans>Multiplier</Trans></TableTh>
                      <TableTh padding="compact"><Trans>Vol. Tier</Trans></TableTh>
                      <TableTh padding="compact"><Trans>Stk. Tier</Trans></TableTh>
                      <TableTh padding="compact"><Trans>Volume</Trans></TableTh>
                      <TableTh padding="compact"><Trans>Boosts</Trans></TableTh>
                    </TableTheadTr>
                  </thead>
                  <tbody>
                    {dashboard.recentStats.map((stat) => (
                      <TableTr key={stat.epochTimestamp}>
                        <TableTd padding="compact">
                          {format(new Date(stat.epochTimestamp * 1000), "MMM d, yyyy")}
                        </TableTd>
                        <TableTd padding="compact">{formatMultiplier(stat.multiplier)}</TableTd>
                        <TableTd padding="compact">{stat.volumeTier ? getVolumeTierBadge(stat.volumeTier) : "—"}</TableTd>
                        <TableTd padding="compact">{stat.stakingTier ? getStakingTierBadge(stat.stakingTier) : "—"}</TableTd>
                        <TableTd padding="compact">{stat.tradedVolume.toString()}</TableTd>
                        <TableTd padding="compact">
                          {stat.boostIds.length > 0 ? stat.boostIds.map((b) => getBoostLabel(b)).join(", ") : "—"}
                        </TableTd>
                      </TableTr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </>
          )}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-4 border border-gray-700 bg-slate-800 p-16">
      <h3 className="mb-12 text-body-large text-slate-100">{title}</h3>
      {children}
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-caption text-slate-400">{label}</div>
      <div className="mt-2 text-body-medium text-slate-100">{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `yarn tscheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/IncentivesDebug/IncentivesAuditDetail.tsx
git commit -m "feat: add IncentivesAuditDetail with audit data, live status, and dashboard sections"
```

---

### Task 5: Wire Up Route in `MainRoutes.tsx`

**Files:**
- Modify: `src/App/MainRoutes.tsx:37-83` (lazy import section) and `src/App/MainRoutes.tsx:229-242` (dev routes)

- [ ] **Step 1: Add lazy import**

At `src/App/MainRoutes.tsx`, after line 83 (the `DecodeErrorPage` lazy wrapper), add:

```typescript
const LazyIncentivesAudit = lazy(() =>
  import("pages/IncentivesDebug/IncentivesAuditPage").then((module) => ({ default: module.IncentivesAuditPage }))
);
const IncentivesAuditPage = () => (
  <Suspense fallback={<Trans>Loading...</Trans>}>
    <LazyIncentivesAudit />
  </Suspense>
);
```

- [ ] **Step 2: Add route**

Inside the `isDevelopment() && [...]` block at line 229-242, add a new route entry before the closing `]}`:

```typescript
<Route path="/incentives-audit/:account?" key="incentives-audit">
  <IncentivesAuditPage />
</Route>,
```

Note: Use `path=` not `exact path=` because the `:account?` param makes it flexible. The full block should look like:

```typescript
{isDevelopment() && [
  <Route exact path="/ui" key="ui">
    <UiPage />
  </Route>,
  <Route exact path="/permits" key="permits">
    <TestPermitsPage />
  </Route>,
  <Route exact path="/account-events/:account?" key="account-events">
    <AccountEventsPage />
  </Route>,
  <Route exact path="/decode-error" key="decode-error">
    <DecodeErrorPage />
  </Route>,
  <Route path="/incentives-audit/:account?" key="incentives-audit">
    <IncentivesAuditPage />
  </Route>,
]}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `yarn tscheck`
Expected: No errors.

- [ ] **Step 4: Test in browser**

Run: `yarn start` and navigate to `http://localhost:3010/#/incentives-audit`
Expected: Page renders with title "Incentives Audit", epoch selector dropdown, and table (may be empty if no data on the connected chain). Switch to Arbitrum if needed.

- [ ] **Step 5: Commit**

```bash
git add src/App/MainRoutes.tsx
git commit -m "feat: wire up /incentives-audit dev-only route in MainRoutes"
```

---

### Task 6: Integration Testing & Polish

**Files:**
- May modify any of the above files based on findings

- [ ] **Step 1: Test list view**

Navigate to `http://localhost:3010/#/incentives-audit` on Arbitrum. Verify:
- Epoch dropdown populates with epoch dates
- Selecting an epoch filters the table data
- Sorting by clicking column headers works (check network tab to confirm server-side sort params)
- Pagination works
- Summary cards show computed values

- [ ] **Step 2: Test account detail view**

Click an account row in the table. Verify:
- URL changes to `/incentives-audit/<address>`
- Audit data section shows the account's epoch data
- Live Status section shows current multiplier, tiers, etc.
- Dashboard section shows points/rewards balances and recent epoch stats
- Back button returns to the list with epoch preserved

- [ ] **Step 3: Fix any issues found**

Address any TypeScript errors, rendering issues, or data formatting problems discovered during testing.

- [ ] **Step 4: Final commit**

```bash
git add -u
git commit -m "fix: polish incentives audit page after integration testing"
```
