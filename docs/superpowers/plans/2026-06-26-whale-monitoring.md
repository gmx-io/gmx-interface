# Whale Monitoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An internal, dev-gated tool to monitor whales by market — market concentration overview, whale leaderboard, per-market drill-down, and a per-account × per-market volume/share breakdown — reusing existing components.

**Architecture:** Three React pages under `/whales/*` (dev-gated, wrapped in `SyntheticsStateContextProvider`), backed by a small `src/domain/synthetics/whales/` data layer. Market totals come from the Subsquid `positionsVolume(period)` resolver; per-account-per-market volume is the client-side sum of `positionChange.sizeDeltaUsd`; whales in a market are discovered cheaply via `positions … orderBy: maxSize_DESC` and re-ranked by exact volume. Pure logic (period mapping, parsing, summation, share/concentration, ranking) is unit-tested; hooks and UI are thin wrappers over documented existing components.

**Tech Stack:** TypeScript, React, `@apollo/client` (Subsquid), `useSWR`, Vitest, existing GMX UI kit (`Table`, `Tabs`, `Breadcrumbs`, `InteractivePieChart`, `AppPageLayout`, `AddressView`).

## Global Constraints

- New code under `src/pages/Whales/` (pages) and `src/domain/synthetics/whales/` (data). **No index files, no re-exports** (repo convention).
- Gate every route behind `isDevelopment()` from `src/config/env.ts`.
- Do not lowercase ETH addresses (preserve casing; used as-is for links/keys).
- Reuse existing components/helpers; do not introduce new styling that deviates from the app.
- Volume/USD values are `bigint` in 30-decimal fixed point. Format with `formatUsd` / `formatAmountHuman` / `formatPercentage` from `lib/numbers`.
- Time windows are exactly `"total" | "30d" | "7d"`; these strings are also the `positionsVolume` period keys.
- Subsquid client: `getSubsquidGraphClient(chainId)` from `src/lib/indexers/clients.ts`; query with `client.query({ query, variables, fetchPolicy: "no-cache" })`.
- Run a single test: `yarn test:ci <path>` (one-shot) or `yarn test <path>` (watch).
- Commit after each task. Do not push.

---

## File Structure

**Data layer — `src/domain/synthetics/whales/`**
- `period.ts` — `WhaleWindow` type, `WHALE_WINDOWS`, `windowToFromTimestamp()`.
- `period.spec.ts` — tests.
- `marketVolumes.ts` — `parseMarketVolumes()`, `useMarketVolumes()`.
- `marketVolumes.spec.ts` — tests for `parseMarketVolumes`.
- `whaleVolume.ts` — `sumPositionChangeVolume()`, `fetchAccountMarketVolume()`.
- `whaleVolume.spec.ts` — tests for `sumPositionChangeVolume`.
- `shares.ts` — `computeShareBps()`, `computeTop3ConcentrationBps()`, `rankByVolumeDesc()`.
- `shares.spec.ts` — tests.
- `marketWhales.ts` — `dedupeTopCandidates()`, `fetchMarketTopCandidates()`, `useMarketWhales()`.
- `marketWhales.spec.ts` — tests for `dedupeTopCandidates`.
- `accountMarkets.ts` — `useAccountMarketBreakdown()` (per-account, all markets).

**Pages — `src/pages/Whales/`**
- `WhalesPage.tsx` — `/whales`; Markets⇄Whales toggle + window selector.
- `WhalesMarketPage.tsx` — `/whales/market/:market`.
- `WhalesAccountPage.tsx` — `/whales/account/:account`.
- `components/WhalesModeToggle.tsx` — Markets/Whales segmented toggle.
- `components/WhaleWindowTabs.tsx` — total/30d/7d tabs.
- `components/MarketsOverviewTable.tsx`
- `components/WhaleLeaderboardTable.tsx`
- `components/MarketWhalesTable.tsx`
- `components/AccountMarketsTable.tsx`
- `components/AccountMarketsPie.tsx`
- `whaleRoutes.ts` — path constants + URL builders.

**Modified**
- `src/App/MainRoutes.tsx` — add 3 dev-gated routes.

---

## Task 1: Period / window module

**Files:**
- Create: `src/domain/synthetics/whales/period.ts`
- Test: `src/domain/synthetics/whales/period.spec.ts`

**Interfaces:**
- Produces: `type WhaleWindow = "total" | "30d" | "7d"`; `WHALE_WINDOWS: WhaleWindow[]`; `windowToFromTimestamp(window: WhaleWindow, nowSec: number): number | undefined` (undefined for `"total"`).

- [ ] **Step 1: Write the failing test**

```ts
// src/domain/synthetics/whales/period.spec.ts
import { describe, expect, it } from "vitest";

import { WHALE_WINDOWS, windowToFromTimestamp } from "./period";

describe("windowToFromTimestamp", () => {
  const now = 1_700_000_000;

  it("returns undefined for total (no time bound)", () => {
    expect(windowToFromTimestamp("total", now)).toBeUndefined();
  });

  it("returns now - 7 days for 7d", () => {
    expect(windowToFromTimestamp("7d", now)).toBe(now - 7 * 86400);
  });

  it("returns now - 30 days for 30d", () => {
    expect(windowToFromTimestamp("30d", now)).toBe(now - 30 * 86400);
  });

  it("exposes the three windows in order", () => {
    expect(WHALE_WINDOWS).toEqual(["total", "30d", "7d"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:ci src/domain/synthetics/whales/period.spec.ts`
Expected: FAIL — cannot find module `./period`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/domain/synthetics/whales/period.ts
export type WhaleWindow = "total" | "30d" | "7d";

export const WHALE_WINDOWS: WhaleWindow[] = ["total", "30d", "7d"];

const WINDOW_DAYS: Record<Exclude<WhaleWindow, "total">, number> = {
  "30d": 30,
  "7d": 7,
};

export function windowToFromTimestamp(window: WhaleWindow, nowSec: number): number | undefined {
  if (window === "total") return undefined;
  return nowSec - WINDOW_DAYS[window] * 86400;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:ci src/domain/synthetics/whales/period.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/synthetics/whales/period.ts src/domain/synthetics/whales/period.spec.ts
git commit -m "feat(whales): window/period helpers"
```

---

## Task 2: Routes + page shells

**Files:**
- Create: `src/pages/Whales/whaleRoutes.ts`
- Create: `src/pages/Whales/WhalesPage.tsx`
- Create: `src/pages/Whales/WhalesMarketPage.tsx`
- Create: `src/pages/Whales/WhalesAccountPage.tsx`
- Modify: `src/App/MainRoutes.tsx` (add dev-gated routes before the catch-all `<Route path="*">`)

**Interfaces:**
- Produces: `WHALES_PATH = "/whales"`; `buildWhaleMarketUrl(market: string): string`; `buildWhaleAccountUrl(account: string): string`. Page components `WhalesPage`, `WhalesMarketPage`, `WhalesAccountPage` (default exports).

- [ ] **Step 1: Create route constants + URL builders**

```ts
// src/pages/Whales/whaleRoutes.ts
export const WHALES_PATH = "/whales";

export function buildWhaleMarketUrl(market: string): string {
  return `/whales/market/${market}`;
}

export function buildWhaleAccountUrl(account: string): string {
  return `/whales/account/${account}`;
}
```

- [ ] **Step 2: Create the three page shells**

Each shell renders `AppPageLayout` + a back breadcrumb (drill-downs) so navigation works before data lands. Use the exact `AppPageLayout` / `Breadcrumbs` APIs.

```tsx
// src/pages/Whales/WhalesPage.tsx
import { t } from "@lingui/macro";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";

export default function WhalesPage() {
  return (
    <AppPageLayout title={t`Whale Monitor`}>
      <div className="default-container page-layout flex flex-col gap-8">
        <div className="text-h2">Whale Monitor</div>
        {/* Toggle + tables added in later tasks */}
      </div>
    </AppPageLayout>
  );
}
```

```tsx
// src/pages/Whales/WhalesMarketPage.tsx
import { t } from "@lingui/macro";
import { Trans } from "@lingui/macro";
import { useParams } from "react-router-dom";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { Breadcrumbs, BreadcrumbItem } from "components/Breadcrumbs/Breadcrumbs";

import { WHALES_PATH } from "./whaleRoutes";

export default function WhalesMarketPage() {
  const { market } = useParams<{ market: string }>();
  return (
    <AppPageLayout title={t`Market Whales`}>
      <div className="default-container page-layout flex flex-col gap-8">
        <Breadcrumbs>
          <BreadcrumbItem to={WHALES_PATH} back>
            <Trans>Whale Monitor</Trans>
          </BreadcrumbItem>
          <BreadcrumbItem active>{market}</BreadcrumbItem>
        </Breadcrumbs>
        {/* Market whales table added in a later task */}
      </div>
    </AppPageLayout>
  );
}
```

```tsx
// src/pages/Whales/WhalesAccountPage.tsx
import { t } from "@lingui/macro";
import { Trans } from "@lingui/macro";
import { useParams } from "react-router-dom";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { Breadcrumbs, BreadcrumbItem } from "components/Breadcrumbs/Breadcrumbs";

import { WHALES_PATH } from "./whaleRoutes";

export default function WhalesAccountPage() {
  const { account } = useParams<{ account: string }>();
  return (
    <AppPageLayout title={t`Account Whale Breakdown`}>
      <div className="default-container page-layout flex flex-col gap-8">
        <Breadcrumbs>
          <BreadcrumbItem to={WHALES_PATH} back>
            <Trans>Whale Monitor</Trans>
          </BreadcrumbItem>
          <BreadcrumbItem active>{account}</BreadcrumbItem>
        </Breadcrumbs>
        {/* Per-market table + pie added in a later task */}
      </div>
    </AppPageLayout>
  );
}
```

- [ ] **Step 3: Register dev-gated routes**

In `src/App/MainRoutes.tsx`, add imports at the top with the other page imports:

```tsx
import WhalesPage from "pages/Whales/WhalesPage";
import WhalesMarketPage from "pages/Whales/WhalesMarketPage";
import WhalesAccountPage from "pages/Whales/WhalesAccountPage";
```

Add this block immediately before the final `<Route path="*">` catch-all (mirrors the existing `isDevelopment()` array at lines ~225-238):

```tsx
{isDevelopment() && [
  <Route exact path="/whales" key="whales">
    <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="stats">
      <WhalesPage />
    </SyntheticsStateContextProvider>
  </Route>,
  <Route exact path="/whales/market/:market" key="whales-market">
    <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="stats">
      <WhalesMarketPage />
    </SyntheticsStateContextProvider>
  </Route>,
  <Route exact path="/whales/account/:account" key="whales-account">
    <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="stats">
      <WhalesAccountPage />
    </SyntheticsStateContextProvider>
  </Route>,
]}
```

`pageType="stats"` is reused deliberately: it loads global markets info (needed for market names) without triggering trade/pools-specific fetches, and avoids editing the shared `SyntheticsPageType` union.

- [ ] **Step 4: Verify routes render**

Run the app (`yarn start` or the project's dev command). In a dev build, visit `/whales`, `/whales/market/0xabc`, `/whales/account/0xabc`. Expected: each page renders its title and (for drill-downs) a working back breadcrumb to `/whales`. Visit in a production build → 404 catch-all (gated out).

- [ ] **Step 5: Commit**

```bash
git add src/pages/Whales/whaleRoutes.ts src/pages/Whales/WhalesPage.tsx src/pages/Whales/WhalesMarketPage.tsx src/pages/Whales/WhalesAccountPage.tsx src/App/MainRoutes.tsx
git commit -m "feat(whales): dev-gated routes and page shells"
```

---

## Task 3: Market totals (parse + hook)

**Files:**
- Create: `src/domain/synthetics/whales/marketVolumes.ts`
- Test: `src/domain/synthetics/whales/marketVolumes.spec.ts`

**Interfaces:**
- Consumes: `WhaleWindow` (Task 1); `getSubsquidGraphClient` from `src/lib/indexers/clients.ts`.
- Produces: `parseMarketVolumes(rows: { market: string; volume: string }[]): Record<string, bigint>`; `useMarketVolumes(chainId: number, window: WhaleWindow): { data: Record<string, bigint> | undefined; isLoading: boolean }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/domain/synthetics/whales/marketVolumes.spec.ts
import { describe, expect, it } from "vitest";

import { parseMarketVolumes } from "./marketVolumes";

describe("parseMarketVolumes", () => {
  it("maps market address to bigint volume, preserving address casing", () => {
    const result = parseMarketVolumes([
      { market: "0xAbC", volume: "1000" },
      { market: "0xDeF", volume: "2500" },
    ]);
    expect(result).toEqual({ "0xAbC": 1000n, "0xDeF": 2500n });
  });

  it("returns an empty object for no rows", () => {
    expect(parseMarketVolumes([])).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:ci src/domain/synthetics/whales/marketVolumes.spec.ts`
Expected: FAIL — cannot find `parseMarketVolumes`.

- [ ] **Step 3: Write implementation (pure fn + hook)**

```ts
// src/domain/synthetics/whales/marketVolumes.ts
import { gql } from "@apollo/client";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers/clients";

import type { WhaleWindow } from "./period";

const MARKET_VOLUMES_QUERY = gql`
  query MarketVolumes($period: String!) {
    positionsVolume(where: { period: $period }) {
      market
      volume
    }
  }
`;

export function parseMarketVolumes(rows: { market: string; volume: string }[]): Record<string, bigint> {
  const out: Record<string, bigint> = {};
  for (const row of rows) {
    out[row.market] = BigInt(row.volume);
  }
  return out;
}

export function useMarketVolumes(
  chainId: number,
  window: WhaleWindow
): { data: Record<string, bigint> | undefined; isLoading: boolean } {
  const { data, isLoading } = useSWR<Record<string, bigint>>(["whaleMarketVolumes", chainId, window], {
    refreshInterval: 60_000,
    fetcher: async () => {
      const client = getSubsquidGraphClient(chainId);
      if (!client) return {};
      const res = await client.query<{ positionsVolume: { market: string; volume: string }[] }>({
        query: MARKET_VOLUMES_QUERY,
        variables: { period: window },
        fetchPolicy: "no-cache",
      });
      return parseMarketVolumes(res.data?.positionsVolume ?? []);
    },
  });

  return { data, isLoading };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:ci src/domain/synthetics/whales/marketVolumes.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/synthetics/whales/marketVolumes.ts src/domain/synthetics/whales/marketVolumes.spec.ts
git commit -m "feat(whales): market totals via positionsVolume"
```

---

## Task 4: Exact per-account-per-market volume

**Files:**
- Create: `src/domain/synthetics/whales/whaleVolume.ts`
- Test: `src/domain/synthetics/whales/whaleVolume.spec.ts`

**Interfaces:**
- Consumes: `getSubsquidGraphClient`; an Apollo client instance.
- Produces:
  - `sumPositionChangeVolume(rows: { sizeDeltaUsd: string }[]): bigint` — Σ of absolute `sizeDeltaUsd`.
  - `fetchAccountMarketVolume(client, params: { account: string; market: string; fromTimestamp?: number }): Promise<bigint>` — paginates `positionChanges` and sums.

- [ ] **Step 1: Write the failing test**

```ts
// src/domain/synthetics/whales/whaleVolume.spec.ts
import { describe, expect, it } from "vitest";

import { sumPositionChangeVolume } from "./whaleVolume";

describe("sumPositionChangeVolume", () => {
  it("sums absolute sizeDeltaUsd across increases and decreases", () => {
    const rows = [{ sizeDeltaUsd: "1000" }, { sizeDeltaUsd: "-400" }, { sizeDeltaUsd: "250" }];
    expect(sumPositionChangeVolume(rows)).toBe(1650n);
  });

  it("returns 0n for no rows", () => {
    expect(sumPositionChangeVolume([])).toBe(0n);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:ci src/domain/synthetics/whales/whaleVolume.spec.ts`
Expected: FAIL — cannot find `sumPositionChangeVolume`.

- [ ] **Step 3: Write implementation**

```ts
// src/domain/synthetics/whales/whaleVolume.ts
import { ApolloClient, gql } from "@apollo/client";

const PAGE_SIZE = 1000;

const POSITION_CHANGES_QUERY = gql`
  query AccountMarketChanges($where: PositionChangeWhereInput!, $limit: Int!, $offset: Int!) {
    positionChanges(where: $where, orderBy: timestamp_ASC, limit: $limit, offset: $offset) {
      sizeDeltaUsd
    }
  }
`;

export function sumPositionChangeVolume(rows: { sizeDeltaUsd: string }[]): bigint {
  let total = 0n;
  for (const row of rows) {
    const v = BigInt(row.sizeDeltaUsd);
    total += v < 0n ? -v : v;
  }
  return total;
}

export async function fetchAccountMarketVolume(
  client: ApolloClient<unknown>,
  params: { account: string; market: string; fromTimestamp?: number }
): Promise<bigint> {
  const where: Record<string, unknown> = {
    account_eq: params.account,
    market_eq: params.market,
  };
  if (params.fromTimestamp !== undefined) {
    where.timestamp_gte = params.fromTimestamp;
  }

  let total = 0n;
  let offset = 0;
  // Paginate until a short page signals the end.
  for (;;) {
    const res = await client.query<{ positionChanges: { sizeDeltaUsd: string }[] }>({
      query: POSITION_CHANGES_QUERY,
      variables: { where, limit: PAGE_SIZE, offset },
      fetchPolicy: "no-cache",
    });
    const rows = res.data?.positionChanges ?? [];
    total += sumPositionChangeVolume(rows);
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return total;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:ci src/domain/synthetics/whales/whaleVolume.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Sanity-check against live data (manual, optional)**

Confirm the definition matches the screenshot: for a known whale+market, `fetchAccountMarketVolume` should be within rounding of that account's WTIOIL "Whale volume". If it is materially off, revisit the absolute-value assumption (Step 3) — some indexers store decreases as already-positive magnitudes; in that case drop the `Math.abs`. The unit test pins whichever convention is chosen.

- [ ] **Step 6: Commit**

```bash
git add src/domain/synthetics/whales/whaleVolume.ts src/domain/synthetics/whales/whaleVolume.spec.ts
git commit -m "feat(whales): exact per-account-per-market volume"
```

---

## Task 5: Share + concentration + ranking

**Files:**
- Create: `src/domain/synthetics/whales/shares.ts`
- Test: `src/domain/synthetics/whales/shares.spec.ts`

**Interfaces:**
- Produces:
  - `computeShareBps(part: bigint, total: bigint): bigint` — `(part * 10000) / total`, `0n` when `total <= 0n`.
  - `rankByVolumeDesc<T extends { volume: bigint }>(rows: T[]): T[]` — new array sorted by `volume` desc.
  - `computeTop3ConcentrationBps(rows: { volume: bigint }[], total: bigint): bigint` — share of the 3 largest by volume.

- [ ] **Step 1: Write the failing test**

```ts
// src/domain/synthetics/whales/shares.spec.ts
import { describe, expect, it } from "vitest";

import { computeShareBps, computeTop3ConcentrationBps, rankByVolumeDesc } from "./shares";

describe("computeShareBps", () => {
  it("returns basis points (10000 = 100%)", () => {
    expect(computeShareBps(847n, 1000n)).toBe(8470n);
  });
  it("returns 0n when total is zero", () => {
    expect(computeShareBps(5n, 0n)).toBe(0n);
  });
});

describe("rankByVolumeDesc", () => {
  it("sorts by volume descending without mutating input", () => {
    const input = [{ volume: 1n }, { volume: 9n }, { volume: 4n }];
    const out = rankByVolumeDesc(input);
    expect(out.map((r) => r.volume)).toEqual([9n, 4n, 1n]);
    expect(input.map((r) => r.volume)).toEqual([1n, 9n, 4n]);
  });
});

describe("computeTop3ConcentrationBps", () => {
  it("sums the three largest volumes over the total", () => {
    const rows = [{ volume: 50n }, { volume: 30n }, { volume: 10n }, { volume: 10n }];
    // top3 = 90 of 100 = 9000 bps
    expect(computeTop3ConcentrationBps(rows, 100n)).toBe(9000n);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:ci src/domain/synthetics/whales/shares.spec.ts`
Expected: FAIL — cannot find module `./shares`.

- [ ] **Step 3: Write implementation**

```ts
// src/domain/synthetics/whales/shares.ts
export function computeShareBps(part: bigint, total: bigint): bigint {
  if (total <= 0n) return 0n;
  return (part * 10000n) / total;
}

export function rankByVolumeDesc<T extends { volume: bigint }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (a.volume < b.volume ? 1 : a.volume > b.volume ? -1 : 0));
}

export function computeTop3ConcentrationBps(rows: { volume: bigint }[], total: bigint): bigint {
  const top3 = rankByVolumeDesc(rows).slice(0, 3);
  const sum = top3.reduce((acc, r) => acc + r.volume, 0n);
  return computeShareBps(sum, total);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:ci src/domain/synthetics/whales/shares.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/synthetics/whales/shares.ts src/domain/synthetics/whales/shares.spec.ts
git commit -m "feat(whales): share and concentration helpers"
```

---

## Task 6: Market whale discovery + orchestration hook

**Files:**
- Create: `src/domain/synthetics/whales/marketWhales.ts`
- Test: `src/domain/synthetics/whales/marketWhales.spec.ts`

**Interfaces:**
- Consumes: `getSubsquidGraphClient`; `fetchAccountMarketVolume` (Task 4); `computeShareBps`, `rankByVolumeDesc` (Task 5); `windowToFromTimestamp` (Task 1); `useMarketVolumes` (Task 3).
- Produces:
  - `type WhaleRow = { account: string; volume: bigint; shareBps: bigint; peakSize: bigint }`.
  - `dedupeTopCandidates(rows: { account: string; maxSize: string }[], limit: number): { account: string; peakSize: bigint }[]` — keep max peakSize per account, top `limit`.
  - `fetchMarketTopCandidates(client, params: { market: string; fetchRows: number; limit: number }): Promise<{ account: string; peakSize: bigint }[]>`.
  - `useMarketWhales(chainId, market, window, displayCount): { rows: WhaleRow[]; totalVolume: bigint | undefined; isLoading: boolean }`.

- [ ] **Step 1: Write the failing test (pure dedupe)**

```ts
// src/domain/synthetics/whales/marketWhales.spec.ts
import { describe, expect, it } from "vitest";

import { dedupeTopCandidates } from "./marketWhales";

describe("dedupeTopCandidates", () => {
  it("keeps the largest peakSize per account and caps to limit", () => {
    const rows = [
      { account: "0xA", maxSize: "100" },
      { account: "0xA", maxSize: "300" }, // long + short for same account
      { account: "0xB", maxSize: "200" },
      { account: "0xC", maxSize: "50" },
    ];
    expect(dedupeTopCandidates(rows, 2)).toEqual([
      { account: "0xA", peakSize: 300n },
      { account: "0xB", peakSize: 200n },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:ci src/domain/synthetics/whales/marketWhales.spec.ts`
Expected: FAIL — cannot find `dedupeTopCandidates`.

- [ ] **Step 3: Write implementation**

```ts
// src/domain/synthetics/whales/marketWhales.ts
import { ApolloClient, gql } from "@apollo/client";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers/clients";

import { useMarketVolumes } from "./marketVolumes";
import { windowToFromTimestamp, type WhaleWindow } from "./period";
import { computeShareBps, rankByVolumeDesc } from "./shares";
import { fetchAccountMarketVolume } from "./whaleVolume";

export type WhaleRow = { account: string; volume: bigint; shareBps: bigint; peakSize: bigint };

const TOP_POSITIONS_QUERY = gql`
  query MarketTopPositions($market: String!, $limit: Int!) {
    positions(where: { market_eq: $market, isSnapshot_eq: false }, orderBy: maxSize_DESC, limit: $limit) {
      account
      maxSize
    }
  }
`;

export function dedupeTopCandidates(
  rows: { account: string; maxSize: string }[],
  limit: number
): { account: string; peakSize: bigint }[] {
  const byAccount = new Map<string, bigint>();
  for (const row of rows) {
    const size = BigInt(row.maxSize);
    const prev = byAccount.get(row.account);
    if (prev === undefined || size > prev) byAccount.set(row.account, size);
  }
  return [...byAccount.entries()]
    .map(([account, peakSize]) => ({ account, peakSize }))
    .sort((a, b) => (a.peakSize < b.peakSize ? 1 : a.peakSize > b.peakSize ? -1 : 0))
    .slice(0, limit);
}

export async function fetchMarketTopCandidates(
  client: ApolloClient<unknown>,
  params: { market: string; fetchRows: number; limit: number }
): Promise<{ account: string; peakSize: bigint }[]> {
  const res = await client.query<{ positions: { account: string; maxSize: string }[] }>({
    query: TOP_POSITIONS_QUERY,
    variables: { market: params.market, limit: params.fetchRows },
    fetchPolicy: "no-cache",
  });
  return dedupeTopCandidates(res.data?.positions ?? [], params.limit);
}

export function useMarketWhales(
  chainId: number,
  market: string | undefined,
  window: WhaleWindow,
  displayCount: number
): { rows: WhaleRow[]; totalVolume: bigint | undefined; isLoading: boolean } {
  const { data: marketVolumes } = useMarketVolumes(chainId, window);
  const totalVolume = market ? marketVolumes?.[market] : undefined;

  const { data, isLoading } = useSWR<WhaleRow[]>(
    market ? ["whaleMarketWhales", chainId, market, window, displayCount] : null,
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        if (!client || !market) return [];
        // Wide candidate pool by peak size, then re-rank the displayed rows by exact volume.
        const candidates = await fetchMarketTopCandidates(client, {
          market,
          fetchRows: 100,
          limit: 50,
        });
        const fromTimestamp = windowToFromTimestamp(window, Math.floor(Date.now() / 1000));
        const withVolume = await Promise.all(
          candidates.map(async (c) => ({
            account: c.account,
            peakSize: c.peakSize,
            volume: await fetchAccountMarketVolume(client, { account: c.account, market, fromTimestamp }),
          }))
        );
        const total = market ? marketVolumes?.[market] ?? 0n : 0n;
        return rankByVolumeDesc(withVolume)
          .slice(0, displayCount)
          .map((r) => ({ ...r, shareBps: computeShareBps(r.volume, total) }));
      },
    }
  );

  return { rows: data ?? [], totalVolume, isLoading };
}
```

Note: `Promise.all` over ~50 candidates is acceptable; if it proves heavy, bound concurrency later. The displayed ranking is exact within the candidate pool (see spec's discovery limitation).

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:ci src/domain/synthetics/whales/marketWhales.spec.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/domain/synthetics/whales/marketWhales.ts src/domain/synthetics/whales/marketWhales.spec.ts
git commit -m "feat(whales): market whale discovery + ranking hook"
```

---

## Task 7: WhalesPage — toggle, window tabs, markets overview

**Files:**
- Create: `src/pages/Whales/components/WhalesModeToggle.tsx`
- Create: `src/pages/Whales/components/WhaleWindowTabs.tsx`
- Create: `src/pages/Whales/components/MarketsOverviewTable.tsx`
- Create: `src/pages/Whales/components/MarketOverviewWhaleCells.tsx`
- Modify: `src/pages/Whales/WhalesPage.tsx`

**Interfaces:**
- Consumes: `useMarketVolumes` (Task 3); `useMarketWhales` (Task 6); `useMarketsInfoData` from `context/SyntheticsStateContext/hooks/globalsHooks`; `useChainId` from `lib/chains`; `WHALE_WINDOWS`/`WhaleWindow` (Task 1); `buildWhaleMarketUrl`/`buildWhaleAccountUrl` (Task 2); `Tabs`, `Table` primitives, `AddressView`, formatters.
- Produces: `WhalesModeToggle` (`mode: "markets" | "whales"`, `onChange`); `WhaleWindowTabs` (`value: WhaleWindow`, `onChange`); `MarketsOverviewTable` (`window: WhaleWindow`).

- [ ] **Step 1: Window tabs (reuse `Tabs`)**

```tsx
// src/pages/Whales/components/WhaleWindowTabs.tsx
import { useMemo } from "react";

import Tabs from "components/Tabs/Tabs";

import { WHALE_WINDOWS, type WhaleWindow } from "domain/synthetics/whales/period";

const LABELS: Record<WhaleWindow, string> = { total: "All time", "30d": "30D", "7d": "7D" };

export function WhaleWindowTabs({ value, onChange }: { value: WhaleWindow; onChange: (v: WhaleWindow) => void }) {
  const options = useMemo(() => WHALE_WINDOWS.map((w) => ({ label: LABELS[w], value: w })), []);
  return <Tabs options={options} selectedValue={value} onChange={onChange} type="inline" />;
}
```

- [ ] **Step 2: Markets/Whales toggle (reuse `Tabs`, block type for the segmented look)**

```tsx
// src/pages/Whales/components/WhalesModeToggle.tsx
import { useMemo } from "react";

import Tabs from "components/Tabs/Tabs";

export type WhalesMode = "markets" | "whales";

export function WhalesModeToggle({ mode, onChange }: { mode: WhalesMode; onChange: (m: WhalesMode) => void }) {
  const options = useMemo(
    () => [
      { label: "Markets", value: "markets" as const },
      { label: "Whales", value: "whales" as const },
    ],
    []
  );
  return <Tabs options={options} selectedValue={mode} onChange={onChange} type="block" />;
}
```

- [ ] **Step 3: Markets overview table**

Loads market totals immediately and sorts by total volume. Whale columns fill progressively via `useMarketWhales` per row (see spec; the heaviest screen). Render with `Table` primitives; row click navigates to the market page.

```tsx
// src/pages/Whales/components/MarketsOverviewTable.tsx
import { useHistory } from "react-router-dom";

import { Table, TableTd, TableTh, TableTheadTr, TableTrActionable } from "components/Table/Table";

import { useChainId } from "lib/chains";
import { formatUsd } from "lib/numbers";

import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useMarketVolumes } from "domain/synthetics/whales/marketVolumes";
import type { WhaleWindow } from "domain/synthetics/whales/period";

import { buildWhaleMarketUrl } from "../whaleRoutes";

export function MarketsOverviewTable({ window }: { window: WhaleWindow }) {
  const { chainId } = useChainId();
  const history = useHistory();
  const marketsInfoData = useMarketsInfoData();
  const { data: volumes, isLoading } = useMarketVolumes(chainId, window);

  const rows = Object.entries(volumes ?? {})
    .map(([market, volume]) => ({
      market,
      volume,
      name: marketsInfoData?.[market]?.name ?? market,
    }))
    .sort((a, b) => (a.volume < b.volume ? 1 : a.volume > b.volume ? -1 : 0));

  return (
    <Table>
      <thead>
        <TableTheadTr>
          <TableTh>Market</TableTh>
          <TableTh>Total volume</TableTh>
        </TableTheadTr>
      </thead>
      <tbody>
        {isLoading && rows.length === 0 ? (
          <tr>
            <TableTd colSpan={2}>Loading…</TableTd>
          </tr>
        ) : (
          rows.map((r) => (
            <TableTrActionable key={r.market} onClick={() => history.push(buildWhaleMarketUrl(r.market))}>
              <TableTd>{r.name}</TableTd>
              <TableTd>{formatUsd(r.volume)}</TableTd>
            </TableTrActionable>
          ))
        )}
      </tbody>
    </Table>
  );
}
```

- [ ] **Step 3b: Add the whale columns (progressive per-row fill)**

A per-row subcomponent loads each market's top whale / share / top-3 concentration independently — this is the heaviest screen, progressive by design (spec).

```tsx
// src/pages/Whales/components/MarketOverviewWhaleCells.tsx
import AddressView from "components/AddressView/AddressView";
import { TableTd } from "components/Table/Table";

import { useChainId } from "lib/chains";
import { formatPercentage } from "lib/numbers";

import { useMarketWhales } from "domain/synthetics/whales/marketWhales";
import type { WhaleWindow } from "domain/synthetics/whales/period";
import { computeShareBps } from "domain/synthetics/whales/shares";

export function MarketOverviewWhaleCells({ market, window }: { market: string; window: WhaleWindow }) {
  const { chainId } = useChainId();
  const { rows, totalVolume } = useMarketWhales(chainId, market, window, 3);
  const top = rows[0];
  const top3Volume = rows.reduce((acc, r) => acc + r.volume, 0n);
  return (
    <>
      <TableTd>{top ? <AddressView address={top.account} size={20} noLink /> : "—"}</TableTd>
      <TableTd>{top ? formatPercentage(top.shareBps, { bps: true, displayDecimals: 1 }) : "—"}</TableTd>
      <TableTd>{formatPercentage(computeShareBps(top3Volume, totalVolume ?? 0n), { bps: true, displayDecimals: 1 })}</TableTd>
    </>
  );
}
```

Then extend `MarketsOverviewTable`: import `MarketOverviewWhaleCells`, add three headers after `Total volume`, and render the subcomponent inside each row after the Total volume cell:

```tsx
// in the <thead> row, after <TableTh>Total volume</TableTh>:
<TableTh>Top whale</TableTh>
<TableTh>Top whale share</TableTh>
<TableTh>Top-3 concentration</TableTh>

// in each <TableTrActionable>, after the Total volume <TableTd>:
<MarketOverviewWhaleCells market={r.market} window={window} />
```

Each row's hook resolves independently, so the table renders immediately on market totals and the whale columns fill in progressively. Dominated markets become visible as their data arrives.

- [ ] **Step 4: Compose the page with state**

```tsx
// src/pages/Whales/WhalesPage.tsx (replace the shell body)
import { t } from "@lingui/macro";
import { useState } from "react";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";

import { MarketsOverviewTable } from "./components/MarketsOverviewTable";
import { WhaleLeaderboardTable } from "./components/WhaleLeaderboardTable";
import { WhaleWindowTabs } from "./components/WhaleWindowTabs";
import { WhalesModeToggle, type WhalesMode } from "./components/WhalesModeToggle";
import type { WhaleWindow } from "domain/synthetics/whales/period";

export default function WhalesPage() {
  const [mode, setMode] = useState<WhalesMode>("markets");
  const [window, setWindow] = useState<WhaleWindow>("total");

  return (
    <AppPageLayout title={t`Whale Monitor`}>
      <div className="default-container page-layout flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <WhalesModeToggle mode={mode} onChange={setMode} />
          <WhaleWindowTabs value={window} onChange={setWindow} />
        </div>
        {mode === "markets" ? <MarketsOverviewTable window={window} /> : <WhaleLeaderboardTable window={window} />}
      </div>
    </AppPageLayout>
  );
}
```

(`WhaleLeaderboardTable` is created in Task 8; import will resolve once that task is done. If implementing strictly in order, stub it to `null` here and replace in Task 8.)

- [ ] **Step 5: Verify**

Dev build → `/whales`: the Markets/Whales toggle and window tabs render in the app's style; Markets mode shows markets sorted by total volume for the selected window; clicking a market navigates to its page.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Whales/components/WhalesModeToggle.tsx src/pages/Whales/components/WhaleWindowTabs.tsx src/pages/Whales/components/MarketsOverviewTable.tsx src/pages/Whales/components/MarketOverviewWhaleCells.tsx src/pages/Whales/WhalesPage.tsx
git commit -m "feat(whales): markets overview + mode/window toggles"
```

---

## Task 8: Whale leaderboard (reuse leaderboard data)

**Files:**
- Create: `src/pages/Whales/components/WhaleLeaderboardTable.tsx`

**Interfaces:**
- Consumes: `useLeaderboardData` from `domain/synthetics/leaderboard`; `rankByVolumeDesc` (Task 5); `useChainId`; `AddressView`; `Table` primitives; `formatUsd`; `windowToFromTimestamp` (Task 1) to derive the `from` arg.
- Produces: `WhaleLeaderboardTable` (`window: WhaleWindow`).

- [ ] **Step 1: Implement, ranking accounts by total volume**

```tsx
// src/pages/Whales/components/WhaleLeaderboardTable.tsx
import { Table, TableTd, TableTh, TableTheadTr, TableTrActionable } from "components/Table/Table";
import AddressView from "components/AddressView/AddressView";

import { useChainId } from "lib/chains";
import { formatUsd } from "lib/numbers";
import { useHistory } from "react-router-dom";

import { useLeaderboardData } from "domain/synthetics/leaderboard";
import { windowToFromTimestamp, type WhaleWindow } from "domain/synthetics/whales/period";
import { rankByVolumeDesc } from "domain/synthetics/whales/shares";

import { buildWhaleAccountUrl } from "../whaleRoutes";

const TOP_N = 100;

export function WhaleLeaderboardTable({ window }: { window: WhaleWindow }) {
  const { chainId } = useChainId();
  const history = useHistory();
  const from = windowToFromTimestamp(window, Math.floor(Date.now() / 1000)) ?? 0;

  const { data } = useLeaderboardData(true, chainId, {
    account: undefined,
    from,
    to: undefined,
    positionsSnapshotTimestamp: undefined,
    leaderboardDataType: "accounts",
  });

  const rows = rankByVolumeDesc(data?.accounts ?? []).slice(0, TOP_N);

  return (
    <Table>
      <thead>
        <TableTheadTr>
          <TableTh>#</TableTh>
          <TableTh>Address</TableTh>
          <TableTh>Total volume</TableTh>
        </TableTheadTr>
      </thead>
      <tbody>
        {rows.map((acc, i) => (
          <TableTrActionable key={acc.account} onClick={() => history.push(buildWhaleAccountUrl(acc.account))}>
            <TableTd>{i + 1}</TableTd>
            <TableTd>
              <AddressView address={acc.account} size={20} noLink />
            </TableTd>
            <TableTd>{formatUsd(acc.volume)}</TableTd>
          </TableTrActionable>
        ))}
      </tbody>
    </Table>
  );
}
```

Note: `leaderboardDataType` value must match the type used by `useLeaderboardData` (confirm the exact `LeaderboardDataType` member for accounts when implementing). `noLink` on `AddressView` because the row click already navigates to the in-tool account page; the account page links out to the full dashboard. "Active markets / Top market" columns are a follow-up (one `positions(account_eq)` query per visible row).

- [ ] **Step 2: Verify**

Dev build → `/whales`, Whales mode: shows accounts ranked by total volume for the window; clicking a row opens `/whales/account/:account`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Whales/components/WhaleLeaderboardTable.tsx
git commit -m "feat(whales): whale leaderboard by total volume"
```

---

## Task 9: Market detail page

**Files:**
- Create: `src/pages/Whales/components/MarketWhalesTable.tsx`
- Modify: `src/pages/Whales/WhalesMarketPage.tsx`

**Interfaces:**
- Consumes: `useMarketWhales` (Task 6); `useMarketsInfoData`; `useChainId`; `AddressView`; `Table`; `formatUsd`, `formatPercentage`; `buildWhaleAccountUrl`.
- Produces: `MarketWhalesTable` (`market: string`, `window: WhaleWindow`).

- [ ] **Step 1: Implement the table**

```tsx
// src/pages/Whales/components/MarketWhalesTable.tsx
import { useHistory } from "react-router-dom";

import { Table, TableTd, TableTh, TableTheadTr, TableTrActionable } from "components/Table/Table";
import AddressView from "components/AddressView/AddressView";

import { useChainId } from "lib/chains";
import { formatPercentage, formatUsd } from "lib/numbers";

import { useMarketWhales } from "domain/synthetics/whales/marketWhales";
import type { WhaleWindow } from "domain/synthetics/whales/period";

import { buildWhaleAccountUrl } from "../whaleRoutes";

export function MarketWhalesTable({ market, window }: { market: string; window: WhaleWindow }) {
  const { chainId } = useChainId();
  const history = useHistory();
  const { rows, totalVolume, isLoading } = useMarketWhales(chainId, market, window, 25);

  return (
    <div className="flex flex-col gap-8">
      <div className="text-body-medium text-typography-secondary">Total volume: {formatUsd(totalVolume)}</div>
      <Table>
        <thead>
          <TableTheadTr>
            <TableTh>#</TableTh>
            <TableTh>Address</TableTh>
            <TableTh>Volume</TableTh>
            <TableTh>Share</TableTh>
            <TableTh>Peak size</TableTh>
          </TableTheadTr>
        </thead>
        <tbody>
          {isLoading && rows.length === 0 ? (
            <tr>
              <TableTd colSpan={5}>Loading…</TableTd>
            </tr>
          ) : (
            rows.map((r, i) => (
              <TableTrActionable key={r.account} onClick={() => history.push(buildWhaleAccountUrl(r.account))}>
                <TableTd>{i + 1}</TableTd>
                <TableTd>
                  <AddressView address={r.account} size={20} noLink />
                </TableTd>
                <TableTd>{formatUsd(r.volume)}</TableTd>
                <TableTd>{formatPercentage(r.shareBps, { bps: true, displayDecimals: 1 })}</TableTd>
                <TableTd>{formatUsd(r.peakSize)}</TableTd>
              </TableTrActionable>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
}
```

Verify during implementation that `formatPercentage(8470n, { bps: true })` renders `"84.7%"`; if the `bps` flag has different semantics, adjust the call (the helper returns bps regardless).

- [ ] **Step 2: Wire into the page (keep the back breadcrumb, add a window selector)**

```tsx
// src/pages/Whales/WhalesMarketPage.tsx (extend the shell)
import { useState } from "react";
// ...existing imports from the shell...
import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import type { WhaleWindow } from "domain/synthetics/whales/period";
import { WhaleWindowTabs } from "./components/WhaleWindowTabs";
import { MarketWhalesTable } from "./components/MarketWhalesTable";

// inside the component, after reading `market`:
const [window, setWindow] = useState<WhaleWindow>("total");
const marketsInfoData = useMarketsInfoData();
const marketName = (market && marketsInfoData?.[market]?.name) || market;

// render: breadcrumb shows {marketName}; below it:
// <div className="flex justify-end"><WhaleWindowTabs value={window} onChange={setWindow} /></div>
// {market && <MarketWhalesTable market={market} window={window} />}
```

- [ ] **Step 3: Verify**

Dev build → click a market from the overview → market page shows total volume, top accounts ranked by exact volume with share + peak size, working back button, window tabs.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Whales/components/MarketWhalesTable.tsx src/pages/Whales/WhalesMarketPage.tsx
git commit -m "feat(whales): market detail page"
```

---

## Task 10: Account page (table + pie + dashboard link)

**Files:**
- Create: `src/domain/synthetics/whales/accountMarkets.ts`
- Create: `src/pages/Whales/components/AccountMarketsTable.tsx`
- Create: `src/pages/Whales/components/AccountMarketsPie.tsx`
- Modify: `src/pages/Whales/WhalesAccountPage.tsx`

**Interfaces:**
- Consumes: `useMarketVolumes` (Task 3); `fetchAccountMarketVolume` (Task 4); `computeShareBps` (Task 5); `useMarketsInfoData`; `useChainId`; `windowToFromTimestamp`; `InteractivePieChart`; `buildAccountDashboardUrl` from `pages/AccountDashboard/buildAccountDashboardUrl`; formatters.
- Produces:
  - `type AccountMarketRow = { market: string; totalVolume: bigint; whaleVolume: bigint; shareBps: bigint }` (market display name is resolved in the component via `useMarketsInfoData`).
  - `useAccountMarketBreakdown(chainId, account, window): { rows: AccountMarketRow[]; isLoading: boolean }`.
  - `AccountMarketsTable` (`rows`), `AccountMarketsPie` (`rows`).

- [ ] **Step 1: Data hook — account across markets**

For the given account, find the markets it traded (from `positions(account_eq)`), then compute exact volume per market and the share vs. each market total.

```ts
// src/domain/synthetics/whales/accountMarkets.ts
import { gql } from "@apollo/client";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers/clients";

import { useMarketVolumes } from "./marketVolumes";
import { windowToFromTimestamp, type WhaleWindow } from "./period";
import { computeShareBps } from "./shares";
import { fetchAccountMarketVolume } from "./whaleVolume";

export type AccountMarketRow = {
  market: string;
  totalVolume: bigint;
  whaleVolume: bigint;
  shareBps: bigint;
};

const ACCOUNT_MARKETS_QUERY = gql`
  query AccountMarkets($account: String!) {
    positions(where: { account_eq: $account }, orderBy: maxSize_DESC, limit: 500) {
      market
    }
  }
`;

export function useAccountMarketBreakdown(
  chainId: number,
  account: string | undefined,
  window: WhaleWindow
): { rows: AccountMarketRow[]; isLoading: boolean } {
  const { data: marketVolumes } = useMarketVolumes(chainId, window);

  const { data, isLoading } = useSWR<AccountMarketRow[]>(
    account && marketVolumes ? ["whaleAccountMarkets", chainId, account, window] : null,
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        if (!client || !account) return [];
        const res = await client.query<{ positions: { market: string }[] }>({
          query: ACCOUNT_MARKETS_QUERY,
          variables: { account },
          fetchPolicy: "no-cache",
        });
        const markets = [...new Set((res.data?.positions ?? []).map((p) => p.market))];
        const fromTimestamp = windowToFromTimestamp(window, Math.floor(Date.now() / 1000));
        const rows = await Promise.all(
          markets.map(async (market) => {
            const whaleVolume = await fetchAccountMarketVolume(client, { account, market, fromTimestamp });
            const totalVolume = marketVolumes?.[market] ?? 0n;
            return { market, totalVolume, whaleVolume, shareBps: computeShareBps(whaleVolume, totalVolume) };
          })
        );
        return rows.sort((a, b) => (a.whaleVolume < b.whaleVolume ? 1 : a.whaleVolume > b.whaleVolume ? -1 : 0));
      },
    }
  );

  return { rows: data ?? [], isLoading };
}
```

- [ ] **Step 2: Pie chart (reuse `InteractivePieChart`)**

```tsx
// src/pages/Whales/components/AccountMarketsPie.tsx
import InteractivePieChart from "components/InteractivePieChart/InteractivePieChart";

import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { formatAmountHuman } from "lib/numbers";

import type { AccountMarketRow } from "domain/synthetics/whales/accountMarkets";

const COLORS = ["#3D51FF", "#26A17B", "#E5A700", "#C04EC9", "#1FA8C9", "#D0563B", "#8E7DFF", "#5FB878"];

export function AccountMarketsPie({ rows }: { rows: AccountMarketRow[] }) {
  const marketsInfoData = useMarketsInfoData();
  const total = rows.reduce((acc, r) => acc + r.whaleVolume, 0n);
  const data = rows.map((r, i) => ({
    name: marketsInfoData?.[r.market]?.name ?? r.market,
    // value is a display percentage number for the pie/tooltip
    value: total > 0n ? Number((r.whaleVolume * 10000n) / total) / 100 : 0,
    color: COLORS[i % COLORS.length],
  }));
  return <InteractivePieChart data={data} label={formatAmountHuman(total, 30, true, 1)} />;
}
```

- [ ] **Step 3: Per-market table (the screenshot) + aggregate row**

```tsx
// src/pages/Whales/components/AccountMarketsTable.tsx
import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";

import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { formatPercentage, formatUsd } from "lib/numbers";

import { computeShareBps } from "domain/synthetics/whales/shares";
import type { AccountMarketRow } from "domain/synthetics/whales/accountMarkets";

export function AccountMarketsTable({ rows }: { rows: AccountMarketRow[] }) {
  const marketsInfoData = useMarketsInfoData();
  const totalMarket = rows.reduce((acc, r) => acc + r.totalVolume, 0n);
  const totalWhale = rows.reduce((acc, r) => acc + r.whaleVolume, 0n);

  return (
    <Table>
      <thead>
        <TableTheadTr>
          <TableTh>Market</TableTh>
          <TableTh>Total volume</TableTh>
          <TableTh>Whale volume</TableTh>
          <TableTh>Whale share</TableTh>
        </TableTheadTr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <TableTr key={r.market}>
            <TableTd>{marketsInfoData?.[r.market]?.name ?? r.market}</TableTd>
            <TableTd>{formatUsd(r.totalVolume)}</TableTd>
            <TableTd>{formatUsd(r.whaleVolume)}</TableTd>
            <TableTd>{formatPercentage(r.shareBps, { bps: true, displayDecimals: 1 })}</TableTd>
          </TableTr>
        ))}
        <TableTr>
          <TableTd>All</TableTd>
          <TableTd>{formatUsd(totalMarket)}</TableTd>
          <TableTd>{formatUsd(totalWhale)}</TableTd>
          <TableTd>{formatPercentage(computeShareBps(totalWhale, totalMarket), { bps: true, displayDecimals: 1 })}</TableTd>
        </TableTr>
      </tbody>
    </Table>
  );
}
```

- [ ] **Step 4: Compose the account page (table + pie + dashboard link + window tabs)**

```tsx
// src/pages/Whales/WhalesAccountPage.tsx (extend the shell)
import { useState } from "react";
import { Link } from "react-router-dom";
// ...existing shell imports...
import { useChainId } from "lib/chains";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";
import { useAccountMarketBreakdown } from "domain/synthetics/whales/accountMarkets";
import type { WhaleWindow } from "domain/synthetics/whales/period";
import { WhaleWindowTabs } from "./components/WhaleWindowTabs";
import { AccountMarketsTable } from "./components/AccountMarketsTable";
import { AccountMarketsPie } from "./components/AccountMarketsPie";

// inside the component, after reading `account`:
const { chainId } = useChainId();
const [window, setWindow] = useState<WhaleWindow>("total");
const { rows } = useAccountMarketBreakdown(chainId, account, window);

// render below the breadcrumb:
// <div className="flex items-center justify-between">
//   <Link to={buildAccountDashboardUrl(account, chainId, 2)} target="_blank">Open full dashboard</Link>
//   <WhaleWindowTabs value={window} onChange={setWindow} />
// </div>
// <div className="flex gap-16">
//   <AccountMarketsTable rows={rows} />
//   <AccountMarketsPie rows={rows} />
// </div>
```

- [ ] **Step 5: Verify**

Dev build → from a whale row → account page: per-market table matching the screenshot (Total / Whale volume / Whale share + "All" aggregate), a pie of volume distribution, a working back button, and an "Open full dashboard" link to `/accounts/:account`.

- [ ] **Step 6: Commit**

```bash
git add src/domain/synthetics/whales/accountMarkets.ts src/pages/Whales/components/AccountMarketsTable.tsx src/pages/Whales/components/AccountMarketsPie.tsx src/pages/Whales/WhalesAccountPage.tsx
git commit -m "feat(whales): account per-market breakdown with pie"
```

---

## Phase 2 (not in this plan)

- Custom Subsquid resolver: top-N accounts by summed `sizeDeltaUsd` per market/period (removes the candidate-pool limitation; replaces `fetchMarketTopCandidates` + per-candidate sums).
- Cross-chain switcher.
- Time-series / whale-movement view + alerts.
- "Active markets / Top market" columns on the whale leaderboard; top-3 concentration column on the markets overview (progressive).

## Verification checklist (end of plan)

- [ ] `yarn test:ci src/domain/synthetics/whales/` — all unit tests pass.
- [ ] Typecheck passes (project's `tsc`/`yarn tscheck` equivalent).
- [ ] Lint passes for new files.
- [ ] `/whales` routes render only in dev; 404 in production build.
- [ ] Account page reproduces the screenshot's columns for a known whale.
