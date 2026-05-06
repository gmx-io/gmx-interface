# Market Dropdown Overhaul Implementation Plan (FEDEV-3780)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the trade-page market dropdown (`ChartTokenSelector`) to support trading-mode tabs (Perpetuals / Swap), a hierarchical category taxonomy with Crypto and TradFi parents (each with their own sub-categories), a Recently Listed top-level filter with a "New" badge on rows, and a strict TradFi tag rule — landing all four sub-issues together for a single QA pass.

**Architecture:**
1. **Foundation first.** Extend `TokenCategory` (rename `rwa`→`tradfi`, add `ai`, add sub-cats `commodities`/`stocks`/`indices`/`fx`) and apply per-token re-tags in `sdk/src/configs/tokens.ts`. Compile cleanly before touching UI.
2. **Tab state model.** Replace the flat `tokensFavoritesTabOptions` array with a two-level taxonomy: a `topLevelTab` (mode + parent) plus a `subCategoryTab` that only renders for `crypto`/`tradfi`. Persist both per `TokenFavoriteKey`.
3. **Trading-mode in-dropdown.** Stop reading `isSwap` from Redux inside `MarketsList`. Use a local `mode: 'perp' | 'swap'` initialized from the page tradebox flags but toggleable inside the dropdown; commit page mode change only on row select via the existing `chooseSuitableMarket` path.
4. **Recently Listed.** Source listing dates from the existing `/markets` API endpoint — `MarketWithTiers.listingDate` is already populated server-side but is currently dropped on the floor (the SDK helper that builds the application-layer market type hardcodes `listingDate: undefined`). New hook `useMarketsListingDates(chainId)` fetches once per chain and feeds both the top-level tab count badge and the per-row "New" pill from one source of truth.
5. **Pools-page parity.** Mirror the same hierarchical filter in `useFilterSortPools` so `/pools` honors sub-categories.

**Testing approach:** Extract pure filtering predicates (`applyTopLevelFilter`, `applySubCategoryFilter`, `isMarketRecentlyListed`) into helper modules so they can be unit-tested with vitest. Add component tests for `RecentlyListedBadge`, `SubCategoryTabs`. Add a hook test for `useMarketsListingDates` (mocking the SDK call). Existing patterns to follow: `src/lib/PauseableInterval.spec.ts`, `src/components/Tabs/__tests__/Tabs.ct.spec.tsx`, `sdk/src/utils/markets/__tests__/`.

**Tech Stack:** TypeScript, React, Redux (page-level), per-key context state in `TokensFavoritesContextProvider`, Lingui i18n, Tailwind. SDK in `sdk/src/...`. Pre-push hooks: typecheck + tests.

**Phase ordering & ticket mapping:**
- **Phase 1** — Type & data foundation (FEDEV-3781 type bits + FEDEV-3809 token re-tag audit). Lands together because the type changes won't compile without the data updates and vice versa.
- **Phase 2** — Hierarchical tab state model + sub-category UI (FEDEV-3616). Both `/trade` dropdown and `/pools`.
- **Phase 3** — Perpetuals / Swap top-level tabs (FEDEV-3536). Internalize `isSwap` to dropdown.
- **Phase 4** — Recently Listed filter + "New" badge (FEDEV-3810).
- **Phase 5** — End-to-end manual QA pass + cleanup before merging the umbrella.

Each phase is independently shippable. Recommendation: bundle into a single PR per FEDEV-3780, or merge phase-by-phase to `release` if review bandwidth requires.

**Out of scope** (per parent ticket):
- Hiding deprecated markets — already shipped under FEDEV-3773 (PR #2413, merged).
- Re-design of mobile tradebox.

---

## File Structure

### Files to Create

| Path | Responsibility |
| -- | -- |
| `src/domain/synthetics/markets/useMarketsListingDates.ts` | Hook that calls `fetchApiMarkets` once per chain (cached via swr/react-query — match existing patterns) and returns `{ listingDateByIndexToken: Record<string, number>, isLoading: boolean }` keyed by lowercased indexTokenAddress. |
| `src/components/ChartTokenSelector/marketFilters.ts` | Pure helpers extracted for testability: `applyTopLevelFilter`, `applySubCategoryFilter`, `isMarketRecentlyListed(listingDate, now, windowMs)`, `getRecentlyListedTokenAddresses(listingDateByIndexToken, now, windowMs)`. No React imports — all data in/out. |
| `src/components/ChartTokenSelector/__tests__/marketFilters.spec.ts` | Vitest unit tests for the helpers above. |
| `src/components/FavoriteTabs/SubCategoryTabs.tsx` | New component rendering the sub-category row (visible only when parent tab is `crypto` or `tradfi`). Reuses the same Button/active-state styling as `FavoriteTabs`. |
| `src/components/FavoriteTabs/__tests__/SubCategoryTabs.spec.tsx` | Component test covering hide-empty-sub-cat behavior and active-state styling. |
| `src/components/FavoriteTabs/RecentlyListedBadge.tsx` | Tiny "New" pill rendered next to the market name when the market falls inside the 30-day window. Used by `MarketListItem` and the equivalent row in `GmList`. |
| `src/components/FavoriteTabs/__tests__/RecentlyListedBadge.spec.tsx` | Component test (snapshot + a11y label). |
| `src/domain/synthetics/markets/__tests__/useMarketsListingDates.spec.ts` | Hook test with mocked SDK call. |

### Files to Modify

| Path | Change |
| -- | -- |
| `sdk/src/utils/tokens/types.ts` (line 11) | Extend `TokenCategory` union with `tradfi`, `ai`, `commodities`, `stocks`, `indices`, `fx`; remove `rwa`. |
| `sdk/src/configs/tokens.ts` | Apply 100+ token re-tags from FEDEV-3809 audit table. Update `getCategoryTokenAddresses` only if needed. |
| `src/context/TokensFavoritesContext/TokensFavoritesContextProvider.tsx` | Replace flat tab options with hierarchical model: `TopLevelTab`, `SubCategoryTab`, persistence per `TokenFavoriteKey` for both levels. Add `mode: 'perp' \| 'swap'` to the per-key store. |
| `src/components/FavoriteTabs/FavoriteTabs.tsx` | Switch to `topLevelTab`, pass through new options, integrate count badge for Recently Listed. |
| `src/components/ChartTokenSelector/ChartTokenSelector.tsx` | Internalize `isSwap` (rename internal var to `mode`). Render mode tabs above category row. Add cross-search empty-state link. Wire sub-category row + Recently Listed visibility rules. Render `RecentlyListedBadge` on rows. Update `useFilterSortTokens` to consume the new tab model. |
| `src/components/GmList/useFilterSortPools.tsx` | Mirror the new hierarchical filter. Drive sub-cat filter the same way as `MarketsList`. |
| `src/components/GmList/GmList.tsx` | Render `SubCategoryTabs` on `/pools` when parent is `crypto`/`tradfi`. Wire `useMarketsListingDates`. |
| `src/domain/synthetics/userFeedback/useMissedCoinsSearch.ts` | Accept current top-level tab so analytics can disambiguate empty searches across modes. |
| `sdk/src/utils/markets/utils.ts:551` | Optional: stop hardcoding `listingDate: undefined` if the same caller has access to the API-side `MarketWithTiers.listingDate`. Lower priority — the dropdown can call `fetchApiMarkets` directly via the new hook. Decide during Phase 4 based on consumer needs. |

---

# Phase 1 — Type & Data Foundation

Goal: extend `TokenCategory`, apply all per-token tag changes from FEDEV-3809, ship a green build. UI still renders the old flat tab list pointing at the renamed values; the actual UI restructure is Phase 2.

### Task 1.1: Extend `TokenCategory` union

**Files:**
- Modify: `sdk/src/utils/tokens/types.ts:11`

- [ ] **Step 1: Replace the `TokenCategory` union**

```typescript
export type TokenCategory =
  | "meme"
  | "layer1"
  | "layer2"
  | "defi"
  | "ai"
  | "tradfi"
  | "commodities"
  | "stocks"
  | "indices"
  | "fx";
```

- [ ] **Step 2: Run typecheck — expect failures across the codebase**

Run: `yarn typecheck`
Expected: failures wherever `"rwa"` appears as a string literal. Capture the file list — every callsite must move to `"tradfi"` (Phase 1.2 + 1.3).

- [ ] **Step 3: Commit (intentionally broken)**

```bash
git add sdk/src/utils/tokens/types.ts
git commit -m "chore(sdk): extend TokenCategory with tradfi/ai/sub-cats (FEDEV-3781)"
```

Repo will not typecheck cleanly until Task 1.4 lands. Keep the next tasks focused.

### Task 1.2: Rename `rwa` → `tradfi` in TabOptionLabels

**Files:**
- Modify: `src/context/TokensFavoritesContext/TokensFavoritesContextProvider.tsx:165-186`

- [ ] **Step 1: Replace `tokensFavoritesTabOptions` and labels**

```typescript
export const tokensFavoritesTabOptions: TokenFavoritesTabOption[] = [
  "all",
  "favorites",
  "tradfi",
  "defi",
  "meme",
  "layer1",
  "layer2",
];

export const tokensFavoritesTabOptionLabels: Record<TokenFavoritesTabOption, MessageDescriptor> = {
  all: msg({
    message: "All markets",
    comment: "Filter option for tokens favorites",
  }),
  favorites: msg`Favorites`,
  meme: msg`Meme`,
  layer1: msg`Layer 1`,
  layer2: msg`Layer 2`,
  defi: msg`DeFi`,
  tradfi: msg`TradFi`,
  // sub-categories — labels exist now, but UI placement is Phase 2
  ai: msg`AI`,
  commodities: msg`Commodities`,
  stocks: msg`Stocks`,
  indices: msg`Indices`,
  fx: msg`FX`,
};
```

- [ ] **Step 2: Verify typecheck for this file**

Run: `yarn typecheck 2>&1 | grep TokensFavoritesContextProvider`
Expected: no remaining errors in this file.

- [ ] **Step 3: Commit**

```bash
git add src/context/TokensFavoritesContext/TokensFavoritesContextProvider.tsx
git commit -m "feat(market-selector): rename RWA tab label to TradFi (FEDEV-3781)"
```

### Task 1.3: Apply token re-tags — TradFi commodities (mainnet)

**Files:**
- Modify: `sdk/src/configs/tokens.ts` (lines 1148, 1195, 1205, 1215, 1226, 1237, 1775, 1784, 1793, 1802 — search for `categories: ["rwa"]`)

This is the per-token data work from FEDEV-3809. Replace each `categories: ["rwa"]` with the precise tag combo from the audit table.

- [ ] **Step 1: Replace tags for Arbitrum commodities**

For each of these in the Arbitrum section:

```
GOLD:    categories: ["rwa"]   → categories: ["tradfi", "commodities"]
SILVER:  categories: ["rwa"]   → categories: ["tradfi", "commodities"]
WTIOIL:  categories: ["rwa"]   → categories: ["tradfi", "commodities"]
BRENTOIL:categories: ["rwa"]   → categories: ["tradfi", "commodities"]
NATGAS:  categories: ["rwa"]   → categories: ["tradfi", "commodities"]
XAUT:    categories: ["rwa"]   → categories: ["tradfi", "commodities"]
```

- [ ] **Step 2: Add `XAUt0` (Avalanche) tag**

XAUt0 currently has no `categories`. Add `categories: ["tradfi", "commodities"]` to the Avalanche `XAUt0` entry to match XAUT on Arbitrum.

- [ ] **Step 3: Replace tags for Sepolia testnet commodities**

```
XAU:      ["rwa"] → ["tradfi", "commodities"]
XAG:      ["rwa"] → ["tradfi", "commodities"]
XPT:      ["rwa"] → ["tradfi", "commodities"]
XPD:      ["rwa"] → ["tradfi", "commodities"]
WTIOIL:   ["rwa"] → ["tradfi", "commodities"]
BRENTOIL: ["rwa"] → ["tradfi", "commodities"]
NATGAS:   ["rwa"] → ["tradfi", "commodities"]
```

- [ ] **Step 4: Search for any leftover `"rwa"` literals**

Run: `rg --no-heading -n '"rwa"' sdk/src/configs/tokens.ts`
Expected: zero results.

- [ ] **Step 5: Commit**

```bash
git add sdk/src/configs/tokens.ts
git commit -m "data(tokens): rename rwa→tradfi and add commodities sub-cat (FEDEV-3809)"
```

### Task 1.4: Apply token re-tags — Crypto AI assignments

**Files:**
- Modify: `sdk/src/configs/tokens.ts` (Arbitrum + Avalanche sections)

Apply per the FEDEV-3809 audit. Each entry below is `symbol → final categories array` (use this exact array, do not merge with existing).

- [ ] **Step 1: AI tag assignments (11 tokens)**

```
EIGEN:   ["ai"]
0G:      ["layer1", "ai"]
AIXBT:   ["meme", "ai"]
AI16Z:   ["meme", "ai"]
VIRTUAL: ["ai"]
FET:     ["ai"]
TAO:     ["layer1", "ai"]
NEAR:    ["layer1", "ai"]
ICP:     ["layer1", "ai"]
RENDER:  ["ai"]
VVV:     ["ai"]
```

For tokens currently uncategorized, you may need to add the `categories` field; for those currently categorized, replace the array.

- [ ] **Step 2: Verify**

Run: `rg --no-heading -nC 1 '"ai"' sdk/src/configs/tokens.ts | head -100`
Expected: 11 entries match the table above.

- [ ] **Step 3: Commit**

```bash
git add sdk/src/configs/tokens.ts
git commit -m "data(tokens): assign AI category to 11 tokens (FEDEV-3809)"
```

### Task 1.5: Apply token re-tags — L1 / L2 corrections

**Files:**
- Modify: `sdk/src/configs/tokens.ts`

- [ ] **Step 1: L1/L2 corrections per audit**

```
POL:  ["layer1", "layer2"]      → ["layer2"]
ARB:  ["layer2", "defi"]        → ["layer2"]
UNI:  ["layer2", "defi"]        → ["defi"]
WLD:  ["layer2", "defi"]        → ["layer2"]
MNT:  ["layer1", "defi"]        → ["layer2"]
```

- [ ] **Step 2: Drop incorrect `defi` from L1 chains**

```
XMR:  ["layer1", "defi"] → ["layer1"]
XPL:  ["layer1", "defi"] → ["layer1"]
MON:  ["layer1", "defi"] → ["layer1"]
SOMI: ["layer1", "defi"] → ["layer1"]
OM:   ["layer1", "defi"] → ["layer1"]
ALGO: ["layer1", "defi"] → ["layer1"]
HBAR: ["layer1", "defi"] → ["layer1"]
```

- [ ] **Step 3: Add missing tags**

```
INJ:  ["layer1"]   → ["layer1", "defi"]
HYPE: ["defi"]     → ["layer1", "defi"]
```

- [ ] **Step 4: ORDI / MKR / ONDO**

```
ORDI: ["defi"]   → ["meme"]
ONDO: ["defi"]   keep (strict TradFi rule excludes governance tokens)
MKR:  ["defi"]   keep (strict TradFi rule)
```

- [ ] **Step 5: Add categories to previously uncategorized tokens**

```
APE:  (none)  → ["meme"]
MEME: (none)  → ["meme"]
XLM:  (none)  → ["layer1"]
```

- [ ] **Step 6: Commit**

```bash
git add sdk/src/configs/tokens.ts
git commit -m "data(tokens): L1/L2 corrections and misc category fixes (FEDEV-3809)"
```

### Task 1.6: Verify Phase 1 (typecheck + sanity scan)

- [ ] **Step 1: Full typecheck**

Run: `yarn typecheck`
Expected: passes. If anything still references `"rwa"`, fix it now.

- [ ] **Step 2: Sanity scan for stale `rwa` references**

Run: `rg --no-heading -n '\brwa\b' sdk src --type ts --type tsx`
Expected: zero hits except inside `searchAliases` arrays (if any exist with the literal "rwa" as a search term — keep those).

- [ ] **Step 3: Verify final master inventory matches FEDEV-3809**

Manually skim Arbitrum + Avalanche token lists. Compare against the "Master inventory" table in the FEDEV-3809 description. Any token tag mismatch is a Phase 1 bug.

- [ ] **Step 4: Commit (if any fixups)**

```bash
git add -p
git commit -m "data(tokens): fixups against FEDEV-3809 master inventory"
```

---

# Phase 2 — Hierarchical Tab State + Sub-Category UI

Goal: replace the flat tab list with a `topLevelTab` + `subCategoryTab` model. Render the sub-category row only when the parent is `crypto` or `tradfi`. Hide empty sub-categories. Apply on `/trade` and `/pools`.

### Task 2.1: Define the new tab taxonomy in context

**Files:**
- Modify: `src/context/TokensFavoritesContext/TokensFavoritesContextProvider.tsx`

Replace the flat `TokenFavoritesTabOption` model.

- [ ] **Step 1: New types and constants**

Replace the existing type alias (line 11) and the bottom exports (lines 165-186) with:

```typescript
// Top-level tabs — appear in the first row.
export type TopLevelTab = "all" | "favorites" | "crypto" | "tradfi" | "recently-listed";

// Sub-category tabs — appear in a second row, only when the parent is crypto/tradfi.
// "all" here means "all markets within the parent" (no sub-cat filter applied).
export type CryptoSubCategory = "all" | "ai" | "layer1" | "layer2" | "defi" | "meme";
export type TradfiSubCategory = "all" | "commodities" | "stocks" | "indices" | "fx";
export type SubCategoryTab = CryptoSubCategory | TradfiSubCategory;

export const topLevelTabOptions: TopLevelTab[] = [
  "all",
  "favorites",
  "crypto",
  "tradfi",
  "recently-listed",
];

export const cryptoSubCategoryOptions: CryptoSubCategory[] = [
  "all",
  "ai",
  "layer1",
  "layer2",
  "defi",
  "meme",
];

export const tradfiSubCategoryOptions: TradfiSubCategory[] = [
  "all",
  "commodities",
  "stocks",
  "indices",
  "fx",
];

export const topLevelTabLabels: Record<TopLevelTab, MessageDescriptor> = {
  all: msg`All`,
  favorites: msg`Favorites`,
  crypto: msg`Crypto`,
  tradfi: msg`TradFi`,
  "recently-listed": msg`Recently Listed`,
};

export const subCategoryTabLabels: Record<Exclude<SubCategoryTab, "all">, MessageDescriptor> = {
  ai: msg`AI`,
  layer1: msg`Layer 1`,
  layer2: msg`Layer 2`,
  defi: msg`DeFi`,
  meme: msg`Meme`,
  commodities: msg`Commodities`,
  stocks: msg`Stocks`,
  indices: msg`Indices`,
  fx: msg`FX`,
};

// "All" within a sub-cat is rendered with the same `msg\`All\`` as the top level.
```

- [ ] **Step 2: Update store shape**

Replace `TokensFavoritesStore.tabs` with two parallel maps:

```typescript
type TokensFavoritesStore = {
  topLevelTabs: { [key in TokenFavoriteKey]?: TopLevelTab };
  subCategoryTabs: {
    [key in TokenFavoriteKey]?: { crypto?: CryptoSubCategory; tradfi?: TradfiSubCategory };
  };
  modes: { [key in TokenFavoriteKey]?: "perp" | "swap" };
  gmFavoriteTokens: string[];
  indexFavoriteTokens: string[];
};
```

`modes` is added now to scaffold Phase 3 — values default to `"perp"` until Phase 3 wires up writes; Phase 2 ignores it.

- [ ] **Step 3: Update `setTab` API**

Split into `setTopLevelTab(key, tab)` and `setSubCategoryTab(key, parent, tab)`. The `useTokensFavorites` hook returns:

```typescript
export type TokenFavoritesState = {
  topLevelTab: TopLevelTab;
  subCategoryTab: SubCategoryTab; // "all" when parent is not crypto/tradfi
  favoriteTokens: string[];
  setTopLevelTab: (tab: TopLevelTab) => void;
  setSubCategoryTab: (tab: SubCategoryTab) => void;
  toggleFavoriteToken: (address: string) => void;
};
```

Defaults: `topLevelTab = "all"`, `subCategoryTab = "all"`. When parent is `crypto`, return `subCategoryTabs[key]?.crypto ?? "all"`; when `tradfi`, return `subCategoryTabs[key]?.tradfi ?? "all"`; else return `"all"`.

- [ ] **Step 4: Migration of localStorage shape**

The old `tabs` key on the persisted store is incompatible. Approach: ignore old data (read-then-discard). On first load if `topLevelTabs === undefined` and a legacy `tabs` key exists, do best-effort mapping: `rwa` → top=`tradfi`, `defi`/`meme`/`layer1`/`layer2` → top=`crypto` + matching sub-cat. After mapping, remove the `tabs` key. Keep this in the constructor of `TokensFavoritesContextProvider`.

- [ ] **Step 5: Typecheck + commit**

Run: `yarn typecheck` — expect failures in callsites that still use `setTab` / `tab` (FavoriteTabs, ChartTokenSelector, MarketSelector, GmList, etc.). Fix in subsequent tasks.

```bash
git add src/context/TokensFavoritesContext/TokensFavoritesContextProvider.tsx
git commit -m "feat(market-selector): hierarchical tab model (FEDEV-3616)"
```

### Task 2.2: Update `FavoriteTabs` to render the top-level row

**Files:**
- Modify: `src/components/FavoriteTabs/FavoriteTabs.tsx`

- [ ] **Step 1: Switch to new model**

Replace the body. Map over `topLevelTabOptions`. Hide `recently-listed` when its count is 0 (count comes via prop — Phase 4 wires it; Phase 2 passes `recentlyListedCount = 0` so the tab is hidden by default).

```tsx
import cx from "classnames";

import {
  TokenFavoriteKey,
  topLevelTabLabels,
  topLevelTabOptions,
  useTokensFavorites,
} from "context/TokensFavoritesContext/TokensFavoritesContextProvider";
import { useLocalizedMap } from "lib/i18n";

import Button from "components/Button/Button";

export function FavoriteTabs({
  favoritesKey,
  className,
  activeClassName = "",
  recentlyListedCount = 0,
}: {
  favoritesKey: TokenFavoriteKey;
  className?: string;
  activeClassName?: string;
  recentlyListedCount?: number;
}) {
  const { topLevelTab, setTopLevelTab } = useTokensFavorites(favoritesKey);
  const labels = useLocalizedMap(topLevelTabLabels);

  const visibleOptions = topLevelTabOptions.filter((opt) =>
    opt === "recently-listed" ? recentlyListedCount > 0 : true
  );

  return (
    <div className="flex items-center gap-8 whitespace-nowrap">
      {visibleOptions.map((option) => {
        const label =
          option === "recently-listed" && recentlyListedCount > 0
            ? `${labels[option]} (${recentlyListedCount})`
            : labels[option];

        return (
          <Button
            key={option}
            type="button"
            variant="ghost"
            size="small"
            className={cx(className, {
              "!bg-button-secondary !text-typography-primary": topLevelTab === option,
              [activeClassName]: activeClassName && topLevelTab === option,
            })}
            onClick={() => setTopLevelTab(option)}
            data-selected={topLevelTab === option}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/FavoriteTabs/FavoriteTabs.tsx
git commit -m "feat(market-selector): top-level tab row uses new taxonomy (FEDEV-3616)"
```

### Task 2.3: Add `SubCategoryTabs` component

**Files:**
- Create: `src/components/FavoriteTabs/SubCategoryTabs.tsx`

- [ ] **Step 1: Implement the component**

```tsx
import cx from "classnames";
import { msg } from "@lingui/macro";
import { useMemo } from "react";

import {
  CryptoSubCategory,
  SubCategoryTab,
  TokenFavoriteKey,
  TradfiSubCategory,
  cryptoSubCategoryOptions,
  subCategoryTabLabels,
  tradfiSubCategoryOptions,
  useTokensFavorites,
} from "context/TokensFavoritesContext/TokensFavoritesContextProvider";
import { useLocalizedMap } from "lib/i18n";

import Button from "components/Button/Button";

const labelsWithAll = {
  ...subCategoryTabLabels,
  all: msg`All`,
};

export function SubCategoryTabs({
  favoritesKey,
  parent,
  populatedSubCategories,
  className,
  activeClassName = "",
}: {
  favoritesKey: TokenFavoriteKey;
  parent: "crypto" | "tradfi";
  /** Set of sub-cats that have at least one market — empties are hidden per spec. */
  populatedSubCategories: Set<SubCategoryTab>;
  className?: string;
  activeClassName?: string;
}) {
  const { subCategoryTab, setSubCategoryTab } = useTokensFavorites(favoritesKey);
  const labels = useLocalizedMap(labelsWithAll);

  const allOptions = parent === "crypto" ? cryptoSubCategoryOptions : tradfiSubCategoryOptions;

  const visible = useMemo(
    () => allOptions.filter((opt) => opt === "all" || populatedSubCategories.has(opt)),
    [allOptions, populatedSubCategories]
  );

  return (
    <div className="flex items-center gap-8 whitespace-nowrap">
      {visible.map((option) => (
        <Button
          key={option}
          type="button"
          variant="ghost"
          size="small"
          className={cx(className, {
            "!bg-button-secondary !text-typography-primary": subCategoryTab === option,
            [activeClassName]: activeClassName && subCategoryTab === option,
          })}
          onClick={() => setSubCategoryTab(option as CryptoSubCategory | TradfiSubCategory)}
          data-selected={subCategoryTab === option}
        >
          {labels[option as keyof typeof labels]}
        </Button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Add component test (hide-empty + active state)**

Create `src/components/FavoriteTabs/__tests__/SubCategoryTabs.spec.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@lingui/react";
import { describe, it, expect } from "vitest";

import { i18n } from "@lingui/core";
import { TokensFavoritesContextProvider } from "context/TokensFavoritesContext/TokensFavoritesContextProvider";

import { SubCategoryTabs } from "../SubCategoryTabs";

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <I18nProvider i18n={i18n}>
      <TokensFavoritesContextProvider>{ui}</TokensFavoritesContextProvider>
    </I18nProvider>
  );
}

describe("SubCategoryTabs", () => {
  it("hides sub-cats with no markets (empties)", () => {
    renderWithProviders(
      <SubCategoryTabs
        favoritesKey="chart-token-selector"
        parent="tradfi"
        populatedSubCategories={new Set(["commodities"])}
      />
    );
    expect(screen.queryByText("Commodities")).toBeInTheDocument();
    expect(screen.queryByText("Stocks")).not.toBeInTheDocument();
    expect(screen.queryByText("Indices")).not.toBeInTheDocument();
    expect(screen.queryByText("FX")).not.toBeInTheDocument();
    expect(screen.queryByText("All")).toBeInTheDocument(); // "All" always visible
  });

  it("renders all crypto sub-cats when populated", () => {
    renderWithProviders(
      <SubCategoryTabs
        favoritesKey="chart-token-selector"
        parent="crypto"
        populatedSubCategories={new Set(["ai", "layer1", "layer2", "defi", "meme"])}
      />
    );
    ["All", "AI", "Layer 1", "Layer 2", "DeFi", "Meme"].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it("places AI right after All for crypto", () => {
    renderWithProviders(
      <SubCategoryTabs
        favoritesKey="chart-token-selector"
        parent="crypto"
        populatedSubCategories={new Set(["ai", "layer1"])}
      />
    );
    const buttons = screen.getAllByRole("button").map((b) => b.textContent);
    expect(buttons[0]).toBe("All");
    expect(buttons[1]).toBe("AI");
  });
});
```

- [ ] **Step 3: Run tests**

Run: `yarn test src/components/FavoriteTabs/__tests__/SubCategoryTabs.spec.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/FavoriteTabs/SubCategoryTabs.tsx \
  src/components/FavoriteTabs/__tests__/SubCategoryTabs.spec.tsx
git commit -m "feat(market-selector): add SubCategoryTabs component + tests (FEDEV-3616)"
```

### Task 2.4a: Extract pure filter helpers (TDD)

**Files:**
- Create: `src/components/ChartTokenSelector/marketFilters.ts`
- Create: `src/components/ChartTokenSelector/__tests__/marketFilters.spec.ts`

- [ ] **Step 1: Write the failing tests first**

```typescript
// src/components/ChartTokenSelector/__tests__/marketFilters.spec.ts
import { describe, it, expect } from "vitest";

import {
  applySubCategoryFilter,
  applyTopLevelFilter,
} from "../marketFilters";

const tokens = [
  { address: "0xeth", categories: ["layer1"] },
  { address: "0xarb", categories: ["layer2"] },
  { address: "0xfet", categories: ["ai"] },
  { address: "0xgold", categories: ["tradfi", "commodities"] },
  { address: "0xusdc", categories: undefined },
] as any[];

describe("applyTopLevelFilter", () => {
  it("returns all tokens for 'all'", () => {
    expect(applyTopLevelFilter(tokens, { topLevelTab: "all", favoriteAddresses: [] })).toEqual(tokens);
  });

  it("returns only crypto tokens for 'crypto' (excludes tradfi and uncategorized)", () => {
    const result = applyTopLevelFilter(tokens, { topLevelTab: "crypto", favoriteAddresses: [] });
    expect(result.map((t) => t.address)).toEqual(["0xeth", "0xarb", "0xfet"]);
  });

  it("returns only tradfi tokens for 'tradfi'", () => {
    const result = applyTopLevelFilter(tokens, { topLevelTab: "tradfi", favoriteAddresses: [] });
    expect(result.map((t) => t.address)).toEqual(["0xgold"]);
  });

  it("returns favorites only", () => {
    const result = applyTopLevelFilter(tokens, {
      topLevelTab: "favorites",
      favoriteAddresses: ["0xeth", "0xfet"],
    });
    expect(result.map((t) => t.address)).toEqual(["0xeth", "0xfet"]);
  });
});

describe("applySubCategoryFilter", () => {
  it("returns input unchanged for 'all' sub-cat", () => {
    expect(applySubCategoryFilter(tokens, { topLevelTab: "crypto", subCategoryTab: "all" })).toEqual(tokens);
  });

  it("filters to AI within crypto", () => {
    const result = applySubCategoryFilter(tokens, { topLevelTab: "crypto", subCategoryTab: "ai" });
    expect(result.map((t) => t.address)).toEqual(["0xfet"]);
  });

  it("filters to commodities within tradfi", () => {
    const result = applySubCategoryFilter(tokens, {
      topLevelTab: "tradfi",
      subCategoryTab: "commodities",
    });
    expect(result.map((t) => t.address)).toEqual(["0xgold"]);
  });

  it("ignores sub-cat when parent is not crypto/tradfi", () => {
    expect(
      applySubCategoryFilter(tokens, { topLevelTab: "all", subCategoryTab: "ai" })
    ).toEqual(tokens);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test src/components/ChartTokenSelector/__tests__/marketFilters.spec.ts`
Expected: FAIL with "module not found".

- [ ] **Step 3: Implement the helpers**

```typescript
// src/components/ChartTokenSelector/marketFilters.ts
import type { Token } from "domain/tokens";
import type { TokenCategory } from "sdk/utils/tokens/types";

import type {
  SubCategoryTab,
  TopLevelTab,
} from "context/TokensFavoritesContext/TokensFavoritesContextProvider";

const CRYPTO_CATEGORIES: TokenCategory[] = ["ai", "layer1", "layer2", "defi", "meme"];

function hasAnyCategory(token: Token, cats: TokenCategory[]): boolean {
  return Boolean(token.categories?.some((c) => cats.includes(c)));
}

export function applyTopLevelFilter(
  tokens: Token[],
  args: {
    topLevelTab: TopLevelTab;
    favoriteAddresses: string[];
    recentlyListedAddresses?: Set<string>;
  }
): Token[] {
  switch (args.topLevelTab) {
    case "all":
      return tokens;
    case "favorites":
      return tokens.filter((t) => args.favoriteAddresses.includes(t.address));
    case "crypto":
      return tokens.filter((t) => hasAnyCategory(t, CRYPTO_CATEGORIES));
    case "tradfi":
      return tokens.filter((t) => t.categories?.includes("tradfi"));
    case "recently-listed": {
      const set = args.recentlyListedAddresses ?? new Set<string>();
      return tokens.filter((t) => set.has(t.address.toLowerCase()));
    }
  }
}

export function applySubCategoryFilter(
  tokens: Token[],
  args: { topLevelTab: TopLevelTab; subCategoryTab: SubCategoryTab }
): Token[] {
  if (args.subCategoryTab === "all") return tokens;
  if (args.topLevelTab !== "crypto" && args.topLevelTab !== "tradfi") return tokens;
  return tokens.filter((t) => t.categories?.includes(args.subCategoryTab as TokenCategory));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn test src/components/ChartTokenSelector/__tests__/marketFilters.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChartTokenSelector/marketFilters.ts \
  src/components/ChartTokenSelector/__tests__/marketFilters.spec.ts
git commit -m "feat(market-selector): pure filter helpers + unit tests (FEDEV-3616)"
```

### Task 2.4b: Wire `MarketsList` to the new model

**Files:**
- Modify: `src/components/ChartTokenSelector/ChartTokenSelector.tsx` (lines 158-410, plus `useFilterSortTokens` at 413-503)

- [ ] **Step 1: Replace tab usage in `MarketsList`**

Inside `MarketsList()`:

```typescript
const { topLevelTab, subCategoryTab, favoriteTokens, toggleFavoriteToken } =
  useTokensFavorites("chart-token-selector");
```

Replace any `tab === "all"` / `tab === "favorites"` etc. checks with `topLevelTab === ...` / `subCategoryTab === ...` semantics.

- [ ] **Step 2: Compute `populatedSubCategories` per parent**

Inside `MarketsList()`:

```typescript
const populatedCryptoSubCats = useMemo(() => {
  const set = new Set<SubCategoryTab>();
  if (!options) return set;
  for (const cat of ["ai", "layer1", "layer2", "defi", "meme"] as const) {
    const addresses = getCategoryTokenAddresses(chainId, cat);
    if (options.some((o) => addresses.includes(o.address))) set.add(cat);
  }
  return set;
}, [options, chainId]);

const populatedTradfiSubCats = useMemo(() => {
  const set = new Set<SubCategoryTab>();
  if (!options) return set;
  for (const cat of ["commodities", "stocks", "indices", "fx"] as const) {
    const addresses = getCategoryTokenAddresses(chainId, cat);
    if (options.some((o) => addresses.includes(o.address))) set.add(cat);
  }
  return set;
}, [options, chainId]);
```

- [ ] **Step 3: Render the sub-category row conditionally**

Just below the existing `<FavoriteTabs favoritesKey="chart-token-selector" />` (in both the mobile and desktop branches at lines 296 and 312), add:

```tsx
{topLevelTab === "crypto" && populatedCryptoSubCats.size > 0 && (
  <ButtonRowScrollFadeContainer>
    <SubCategoryTabs
      favoritesKey="chart-token-selector"
      parent="crypto"
      populatedSubCategories={populatedCryptoSubCats}
    />
  </ButtonRowScrollFadeContainer>
)}
{topLevelTab === "tradfi" && populatedTradfiSubCats.size > 0 && (
  <ButtonRowScrollFadeContainer>
    <SubCategoryTabs
      favoritesKey="chart-token-selector"
      parent="tradfi"
      populatedSubCategories={populatedTradfiSubCats}
    />
  </ButtonRowScrollFadeContainer>
)}
```

For `topLevelTab === "all" | "favorites" | "recently-listed"`: do not render the sub-cat row.

- [ ] **Step 4: Update `useFilterSortTokens` filter logic**

Replace the `tab` parameter with `topLevelTab` and `subCategoryTab`. Import the helpers from Task 2.4a:

```typescript
import { applySubCategoryFilter, applyTopLevelFilter } from "./marketFilters";

// Inside the existing useMemo for filteredTokens:
const afterTopLevel = applyTopLevelFilter(textMatched ?? [], {
  topLevelTab,
  favoriteAddresses: favoriteTokens,
  recentlyListedAddresses: recentlyListedAddressesSet, // wired in Phase 4; pass empty Set for now
});
const afterSubCat = applySubCategoryFilter(afterTopLevel, { topLevelTab, subCategoryTab });
// ...continue with existing sort step on afterSubCat
```

For Phase 2, `recentlyListedAddressesSet = new Set()` (the tab is hidden by default until Phase 4 wires the API hook).

- [ ] **Step 5: Sanity test in browser**

Run: `yarn dev` (separate terminal). Open `/trade`. Verify:
- "All" shows all markets, no sub-cat row.
- "Favorites" shows favorited markets, no sub-cat row.
- "Crypto" shows crypto markets, sub-cat row appears with `All / AI / Layer 1 / Layer 2 / DeFi / Meme`. Selecting `AI` filters to AI-tagged tokens.
- "TradFi" shows commodities, sub-cat row appears with `All / Commodities` (others hidden because empty). Selecting `Commodities` filters correctly.
- "Recently Listed" tab is **hidden** because count is still 0 (Phase 4 wires the count).

- [ ] **Step 6: Commit**

```bash
git add src/components/ChartTokenSelector/ChartTokenSelector.tsx
git commit -m "feat(market-selector): two-level filter UI in dropdown (FEDEV-3616)"
```

### Task 2.5: Mirror on `/pools` page

**Files:**
- Modify: `src/components/GmList/useFilterSortPools.tsx:115-143`
- Modify: `src/components/GmList/GmList.tsx`

- [ ] **Step 1: Update `useFilterSortPools`**

Change the `tab: TokenFavoritesTabOption` prop to `{ topLevelTab: TopLevelTab; subCategoryTab: SubCategoryTab }`. Rewrite the filter section using the same two-step approach as Task 2.4 but operating on `market.indexTokenAddress` (already there).

- [ ] **Step 2: Update `GmList` to pass new props and render sub-cat row**

Read `topLevelTab` / `subCategoryTab` from `useTokensFavorites("gm-list")`. Render `<SubCategoryTabs favoritesKey="gm-list" parent={...} populatedSubCategories={...} />` next to the existing `<FavoriteTabs favoritesKey="gm-list" />` on the same conditions.

Computing populated sub-cats on `/pools`: derive from the markets list (filter `marketsInfo` by `indexToken.categories?.includes(cat)`), same logic as Task 2.4 step 2.

- [ ] **Step 3: Manual smoke test on `/pools`**

Run dev server. Navigate to `/pools`. Verify the same hierarchical filter behavior.

- [ ] **Step 4: Commit**

```bash
git add src/components/GmList/useFilterSortPools.tsx src/components/GmList/GmList.tsx
git commit -m "feat(pools): hierarchical sub-category filter on /pools (FEDEV-3616)"
```

### Task 2.6: Update other consumers of `useTokensFavorites`

**Files:**
- Modify: `src/components/MarketSelector/PoolSelector.tsx`
- Modify: `src/components/MarketSelector/MarketSelector.tsx`
- Modify: `src/components/MarketSelector/GmPoolsSelectorForGlvMarket.tsx`

These selectors all consume `useTokensFavorites` for their own `TokenFavoriteKey`. Rename `tab`/`setTab` to `topLevelTab`/`setTopLevelTab`. They can ignore `subCategoryTab` for now (none currently filter by sub-category beyond the flat list).

- [ ] **Step 1: Mechanical rename in each file**

Search/replace within each file:
- `const { tab, setTab` → `const { topLevelTab: tab, setTopLevelTab: setTab`

This minimizes diff while satisfying the new API. Cleaner full rename can be a follow-up if any reviewer prefers.

- [ ] **Step 2: Run typecheck**

Run: `yarn typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/MarketSelector
git commit -m "chore(market-selector): adapt other selectors to new tab API (FEDEV-3616)"
```

---

# Phase 3 — Perpetuals / Swap Top-Level Tabs

Goal: render a `Perpetuals | Swap` switch above the category row inside the dropdown. Internalize `mode`. Cross-search empty-state link. Page trade mode only commits when a market is selected.

### Task 3.1: Add `mode` to per-key store and hook

**Files:**
- Modify: `src/context/TokensFavoritesContext/TokensFavoritesContextProvider.tsx`

- [ ] **Step 1: Add API for mode**

Extend the hook return with `mode` and `setMode`:

```typescript
export type TokenFavoritesState = {
  topLevelTab: TopLevelTab;
  subCategoryTab: SubCategoryTab;
  mode: "perp" | "swap";
  favoriteTokens: string[];
  setTopLevelTab: (tab: TopLevelTab) => void;
  setSubCategoryTab: (tab: SubCategoryTab) => void;
  setMode: (mode: "perp" | "swap") => void;
  toggleFavoriteToken: (address: string) => void;
};
```

`mode` defaults to `"perp"`. Persisted under `modes[key]` (already added in Task 2.1 store).

- [ ] **Step 2: Commit**

```bash
git add src/context/TokensFavoritesContext/TokensFavoritesContextProvider.tsx
git commit -m "feat(market-selector): add mode (perp/swap) to per-key tab state (FEDEV-3536)"
```

### Task 3.2: Internalize `isSwap` in `MarketsList`

**Files:**
- Modify: `src/components/ChartTokenSelector/ChartTokenSelector.tsx`

- [ ] **Step 1: Replace Redux `isSwap` reads with local `mode`**

In `MarketsList()`:

```typescript
const tradeFlags = useSelector(selectTradeboxTradeFlags);
const { mode, setMode } = useTokensFavorites("chart-token-selector");

// Initialize mode from page state once on first mount of the dropdown.
const initialModeRef = useRef<"perp" | "swap" | null>(null);
useEffect(() => {
  if (initialModeRef.current === null) {
    initialModeRef.current = tradeFlags.isSwap ? "swap" : "perp";
    setMode(initialModeRef.current);
  }
  // intentionally no deps — only on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

const isSwap = mode === "swap";
```

Now `isSwap` flows through the rest of the component (placeholder text, columns, panel width, etc.) without changing the page tradebox state.

- [ ] **Step 2: Source the right token list per mode**

`selectAvailableChartTokens` reads `isSwap` from Redux. To support local mode, either:

(a) Subscribe to **both** swap and perp lists separately (preferred — selectors are cheap and memoized), and pick by `mode`:

```typescript
const perpTokens = useSelector(selectAvailablePerpChartTokens);
const swapTokens = useSelector(selectAvailableSwapChartTokens);
const availableTokens = isSwap ? swapTokens : perpTokens;
```

If those selectors don't already exist as separate exports, split `selectAvailableChartTokens` into two named exports that take no implicit Redux dependency on `isSwap`. Look in `src/context/SyntheticsStateContext/selectors/chartSelectors.ts` and refactor.

- [ ] **Step 3: Commit**

```bash
git add src/components/ChartTokenSelector/ChartTokenSelector.tsx \
  src/context/SyntheticsStateContext/selectors/chartSelectors.ts
git commit -m "feat(market-selector): internalize isSwap in dropdown (FEDEV-3536)"
```

### Task 3.3: Render `Perpetuals | Swap` tabs above category row

**Files:**
- Modify: `src/components/ChartTokenSelector/ChartTokenSelector.tsx`

- [ ] **Step 1: Add a small mode-tabs component**

Add inside `ChartTokenSelector.tsx` (or extract to a tiny component if cleaner):

```tsx
function ModeTabs({ mode, setMode }: { mode: "perp" | "swap"; setMode: (m: "perp" | "swap") => void }) {
  return (
    <div className="flex items-center gap-8 border-b-1/2 border-slate-600 px-12 pt-12">
      <Button
        type="button"
        variant="ghost"
        size="small"
        className={cx({ "!bg-button-secondary !text-typography-primary": mode === "perp" })}
        onClick={() => setMode("perp")}
      >
        <Trans>Perpetuals</Trans>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="small"
        className={cx({ "!bg-button-secondary !text-typography-primary": mode === "swap" })}
        onClick={() => setMode("swap")}
      >
        <Trans>Swap</Trans>
      </Button>
    </div>
  );
}
```

Render inside the desktop and mobile branches above `SearchInput`.

- [ ] **Step 2: Commit**

```bash
git add src/components/ChartTokenSelector/ChartTokenSelector.tsx
git commit -m "feat(market-selector): Perpetuals/Swap tabs above category row (FEDEV-3536)"
```

### Task 3.4: Cross-search empty-state link

**Files:**
- Modify: `src/components/ChartTokenSelector/ChartTokenSelector.tsx`

- [ ] **Step 1: Replace the "No matching markets" empty state**

When `searchKeyword` is non-empty and `sortedTokens.length === 0`, render:

```tsx
<EmptyTableContent
  isLoading={false}
  isEmpty={true}
  emptyText={
    <div className="flex flex-col items-center gap-8">
      <Trans>No matching markets</Trans>
      <button
        type="button"
        className="text-typography-link underline"
        onClick={() => setMode(isSwap ? "perp" : "swap")}
      >
        {isSwap ? <Trans>Search in perpetuals markets</Trans> : <Trans>Search in swap markets</Trans>}
      </button>
    </div>
  }
/>
```

Important: clicking the link only switches `mode` inside the dropdown — page trade mode is untouched. Page mode flips only when `chooseSuitableMarket` runs in `handleMarketSelect`.

- [ ] **Step 2: Manual test**

Run dev server. Search for a non-existent market. Verify the cross-link switches the dropdown's mode and re-runs the search. Close the dropdown without selecting — the page tradebox stays in its original mode.

- [ ] **Step 3: Commit**

```bash
git add src/components/ChartTokenSelector/ChartTokenSelector.tsx
git commit -m "feat(market-selector): cross-mode search empty-state link (FEDEV-3536)"
```

### Task 3.5: Update `useMissedCoinsSearch` to take tab context

**Files:**
- Modify: `src/domain/synthetics/userFeedback/useMissedCoinsSearch.ts`
- Modify: `src/components/ChartTokenSelector/ChartTokenSelector.tsx` (the call at lines 227-232)

- [ ] **Step 1: Add `topLevelTab` arg to the hook**

Append `topLevelTab?: TopLevelTab` to `useMissedCoinsSearch`. Include it in the analytics payload so empty searches in `crypto` vs `tradfi` are distinguishable.

- [ ] **Step 2: Pass from caller**

Update the call site to pass `topLevelTab: topLevelTab`.

- [ ] **Step 3: Commit**

```bash
git add src/domain/synthetics/userFeedback/useMissedCoinsSearch.ts \
  src/components/ChartTokenSelector/ChartTokenSelector.tsx
git commit -m "feat(market-selector): include tab context in missed-coins analytics (FEDEV-3536)"
```

---

# Phase 4 — Recently Listed Filter + "New" Badge

Goal: ship the 5th top-level tab (Recently Listed, with count badge) and a per-row "New" pill. Source of truth: the existing `/markets` API endpoint, which already returns `MarketWithTiers.listingDate`. The SDK type field exists but is currently dropped at `sdk/src/utils/markets/utils.ts:551` (hardcoded `undefined`). Workflow: add a hook that fetches `/markets` directly and exposes a per-indexToken listing-date map; consume it in both `MarketsList` and `GmList`.

### Task 4.1: Pure helpers + tests for "recently listed" predicate (TDD)

**Files:**
- Modify: `src/components/ChartTokenSelector/marketFilters.ts` (extend Phase 2 file)
- Modify: `src/components/ChartTokenSelector/__tests__/marketFilters.spec.ts`

- [ ] **Step 1: Write the failing tests**

Append to `marketFilters.spec.ts`:

```typescript
import {
  RECENTLY_LISTED_WINDOW_MS,
  getRecentlyListedTokenAddresses,
  isMarketRecentlyListed,
} from "../marketFilters";

describe("isMarketRecentlyListed", () => {
  const now = Date.UTC(2026, 4, 6); // 2026-05-06

  it("returns true within the 30-day window", () => {
    expect(isMarketRecentlyListed(now - 1000, now)).toBe(true);
    expect(isMarketRecentlyListed(now - RECENTLY_LISTED_WINDOW_MS + 1, now)).toBe(true);
  });

  it("returns false on or after the window edge", () => {
    expect(isMarketRecentlyListed(now - RECENTLY_LISTED_WINDOW_MS - 1, now)).toBe(false);
    expect(isMarketRecentlyListed(undefined, now)).toBe(false);
  });
});

describe("getRecentlyListedTokenAddresses", () => {
  const now = Date.UTC(2026, 4, 6);

  it("returns lowercased addresses inside the window", () => {
    const map = {
      "0xAaA": now - 1000,
      "0xBBB": now - RECENTLY_LISTED_WINDOW_MS - 1,
      "0xccc": now - 5 * 24 * 60 * 60 * 1000,
    };
    const result = getRecentlyListedTokenAddresses(map, now);
    expect(result.sort()).toEqual(["0xaaa", "0xccc"].sort());
  });

  it("returns empty when input map is empty", () => {
    expect(getRecentlyListedTokenAddresses({}, now)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `yarn test src/components/ChartTokenSelector/__tests__/marketFilters.spec.ts`
Expected: FAIL with import errors for the new symbols.

- [ ] **Step 3: Implement helpers**

Append to `marketFilters.ts`:

```typescript
export const RECENTLY_LISTED_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function isMarketRecentlyListed(
  listingDate: number | undefined,
  now: number,
  windowMs: number = RECENTLY_LISTED_WINDOW_MS
): boolean {
  if (listingDate === undefined) return false;
  return now - listingDate < windowMs;
}

/**
 * @param listingDateByIndexToken Map indexed by indexTokenAddress (any case).
 *                                Output addresses are lowercased.
 */
export function getRecentlyListedTokenAddresses(
  listingDateByIndexToken: Record<string, number>,
  now: number,
  windowMs: number = RECENTLY_LISTED_WINDOW_MS
): string[] {
  const result: string[] = [];
  for (const [address, ts] of Object.entries(listingDateByIndexToken)) {
    if (now - ts < windowMs) result.push(address.toLowerCase());
  }
  return result;
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `yarn test src/components/ChartTokenSelector/__tests__/marketFilters.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChartTokenSelector/marketFilters.ts \
  src/components/ChartTokenSelector/__tests__/marketFilters.spec.ts
git commit -m "feat(market-selector): recently-listed predicates + tests (FEDEV-3810)"
```

### Task 4.2: `useMarketsListingDates` hook (TDD)

**Files:**
- Create: `src/domain/synthetics/markets/useMarketsListingDates.ts`
- Create: `src/domain/synthetics/markets/__tests__/useMarketsListingDates.spec.ts`

The hook calls `fetchApiMarkets` (already in `sdk/src/utils/markets/api.ts`) and returns a memoized map keyed by lowercased `indexTokenAddress` → `listingDate` (number, ms). Match the existing patterns for chain-scoped data hooks: look at `src/domain/synthetics/markets/useMarketsInfoRequest/index.ts` for the SWR/`useSWR` setup the codebase uses, and reuse the same `IHttp` access (probably via `getGmxSdk(chainId)` or equivalent — check the existing `fetchApiMarketsInfo` consumer to copy the pattern).

- [ ] **Step 1: Write the failing test**

```typescript
// src/domain/synthetics/markets/__tests__/useMarketsListingDates.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("sdk/utils/markets/api", () => ({
  fetchApiMarkets: vi.fn(),
}));

import { fetchApiMarkets } from "sdk/utils/markets/api";
import { useMarketsListingDates } from "../useMarketsListingDates";

describe("useMarketsListingDates", () => {
  beforeEach(() => {
    (fetchApiMarkets as any).mockReset();
  });

  it("returns a map keyed by lowercased indexTokenAddress", async () => {
    (fetchApiMarkets as any).mockResolvedValue([
      { indexTokenAddress: "0xAaA", listingDate: 1000 },
      { indexTokenAddress: "0xBBB", listingDate: 2000 },
      { indexTokenAddress: "0xCCC", listingDate: undefined },
    ]);

    const { result } = renderHook(() => useMarketsListingDates(42161));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.listingDateByIndexToken).toEqual({
      "0xaaa": 1000,
      "0xbbb": 2000,
    });
  });

  it("returns empty map when API yields empty array", async () => {
    (fetchApiMarkets as any).mockResolvedValue([]);

    const { result } = renderHook(() => useMarketsListingDates(42161));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.listingDateByIndexToken).toEqual({});
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `yarn test src/domain/synthetics/markets/__tests__/useMarketsListingDates.spec.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the hook**

Use whichever data-fetching primitive the rest of the codebase favors for SDK calls. Based on `useMarketsInfoRequest/index.ts`, expect `useSWR` with a key like `["markets-listing-dates", chainId]` and a fetcher that wraps `fetchApiMarkets({ api: getGmxSdk(chainId).api })`. Pseudocode:

```typescript
import { useMemo } from "react";
import useSWR from "swr";

import { getGmxSdk } from "lib/gmxSdk"; // or wherever the SDK accessor lives
import { fetchApiMarkets } from "sdk/utils/markets/api";

export function useMarketsListingDates(chainId: number) {
  const { data, isLoading } = useSWR(
    ["markets-listing-dates", chainId],
    async () => {
      const markets = await fetchApiMarkets({ api: getGmxSdk(chainId).api });
      const map: Record<string, number> = {};
      for (const m of markets) {
        if (m.listingDate !== undefined) {
          map[m.indexTokenAddress.toLowerCase()] = m.listingDate;
        }
      }
      return map;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5 * 60 * 1000, // 5 min — listing dates rarely change
    }
  );

  return useMemo(
    () => ({ listingDateByIndexToken: data ?? {}, isLoading }),
    [data, isLoading]
  );
}
```

If the codebase uses a wrapper around SWR (look at how `useMarketsInfoRequest` handles its caching — it may use `useSWRConfig` or a custom request hook), match that pattern instead. The test just asserts shape; the cache strategy is the implementer's call.

- [ ] **Step 4: Run — expect PASS**

Run: `yarn test src/domain/synthetics/markets/__tests__/useMarketsListingDates.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/synthetics/markets/useMarketsListingDates.ts \
  src/domain/synthetics/markets/__tests__/useMarketsListingDates.spec.ts
git commit -m "feat(markets): useMarketsListingDates hook backed by /markets API (FEDEV-3810)"
```

### Task 4.3: Wire count + filter into `MarketsList`

**Files:**
- Modify: `src/components/ChartTokenSelector/ChartTokenSelector.tsx`

- [ ] **Step 1: Subscribe to listing dates and compute the recently-listed set**

Inside `MarketsList()`:

```typescript
import { useMarketsListingDates } from "domain/synthetics/markets/useMarketsListingDates";
import {
  applySubCategoryFilter,
  applyTopLevelFilter,
  getRecentlyListedTokenAddresses,
} from "./marketFilters";

const { listingDateByIndexToken } = useMarketsListingDates(chainId);

const recentlyListedAddressesSet = useMemo(() => {
  return new Set(getRecentlyListedTokenAddresses(listingDateByIndexToken, Date.now()));
}, [listingDateByIndexToken]);

const recentlyListedCount = useMemo(() => {
  if (!options) return 0;
  return options.filter((t) => recentlyListedAddressesSet.has(t.address.toLowerCase())).length;
}, [options, recentlyListedAddressesSet]);
```

Pass `recentlyListedCount` to `<FavoriteTabs ... recentlyListedCount={recentlyListedCount} />`.
Pass `recentlyListedAddressesSet` to the `applyTopLevelFilter` call (replacing the `new Set()` placeholder from Phase 2).

- [ ] **Step 2: Smoke test**

Run: `yarn dev`. Open `/trade`. Verify the `Recently Listed` tab appears when the API returns at least one market within the 30-day window, with count badge `Recently Listed (N)`. Selecting it shows the flat list. Tab is hidden when N = 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/ChartTokenSelector/ChartTokenSelector.tsx
git commit -m "feat(market-selector): Recently Listed tab uses /markets API (FEDEV-3810)"
```

### Task 4.4: Mirror on `/pools`

**Files:**
- Modify: `src/components/GmList/useFilterSortPools.tsx`
- Modify: `src/components/GmList/GmList.tsx`

- [ ] **Step 1: Same wiring on `/pools`**

`GmList` already calls `useTokensFavorites("gm-list")`. Add `useMarketsListingDates(chainId)`, derive `recentlyListedAddressesSet` and `recentlyListedCount` the same way, pass `recentlyListedCount` to its `<FavoriteTabs />`. In `useFilterSortPools`, accept `recentlyListedAddresses?: Set<string>` and apply the same filter for `topLevelTab === "recently-listed"`.

- [ ] **Step 2: Commit**

```bash
git add src/components/GmList/useFilterSortPools.tsx src/components/GmList/GmList.tsx
git commit -m "feat(pools): Recently Listed parity on /pools (FEDEV-3810)"
```

### Task 4.5: "New" badge on market rows + tests

**Files:**
- Create: `src/components/FavoriteTabs/RecentlyListedBadge.tsx`
- Create: `src/components/FavoriteTabs/__tests__/RecentlyListedBadge.spec.tsx`
- Modify: `src/components/ChartTokenSelector/ChartTokenSelector.tsx` (`MarketListItem`)
- Modify: `src/components/GmList/GmList.tsx` (the row rendering)

- [ ] **Step 1: Write component test (will fail — file doesn't exist yet)**

```tsx
// src/components/FavoriteTabs/__tests__/RecentlyListedBadge.spec.tsx
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@lingui/react";
import { i18n } from "@lingui/core";
import { describe, it, expect } from "vitest";

import { RecentlyListedBadge } from "../RecentlyListedBadge";

describe("RecentlyListedBadge", () => {
  it('renders the "New" label', () => {
    render(
      <I18nProvider i18n={i18n}>
        <RecentlyListedBadge />
      </I18nProvider>
    );
    expect(screen.getByText("New")).toBeInTheDocument();
  });
});
```

Run: `yarn test src/components/FavoriteTabs/__tests__/RecentlyListedBadge.spec.tsx`
Expected: FAIL.

- [ ] **Step 2: Implement the pill**

```tsx
// src/components/FavoriteTabs/RecentlyListedBadge.tsx
import { Trans } from "@lingui/macro";

export function RecentlyListedBadge() {
  return (
    <span className="ml-6 rounded-4 bg-[--badge-new-bg] px-6 py-2 text-[10px] font-medium uppercase text-typography-primary">
      <Trans>New</Trans>
    </span>
  );
}
```

(Match the design's exact color/spacing — pull tokens from the Figma node 8048-258427 referenced in FEDEV-3810. If the design tokens map cleanly to existing Tailwind tokens, prefer those over inline color literals.)

Run: `yarn test src/components/FavoriteTabs/__tests__/RecentlyListedBadge.spec.tsx`
Expected: PASS.

- [ ] **Step 3: Render conditionally in row components**

In `MarketListItem` (next to the market name span):

```tsx
import { isMarketRecentlyListed } from "components/ChartTokenSelector/marketFilters";

// In the row:
{isMarketRecentlyListed(listingDateByIndexToken[token.address.toLowerCase()], Date.now()) && (
  <RecentlyListedBadge />
)}
```

Pass `listingDateByIndexToken` down as a prop (the parent already has it from `useMarketsListingDates`). Same in `GmList`'s row component.

- [ ] **Step 4: Visual QA**

Run dev server. Confirm "New" pill appears on test markets across all top-level filters (All, Favorites, Crypto, TradFi, Recently Listed). Confirm the same window applies in both places (badge appears = market is in Recently Listed).

- [ ] **Step 5: Commit**

```bash
git add src/components/FavoriteTabs/RecentlyListedBadge.tsx \
  src/components/FavoriteTabs/__tests__/RecentlyListedBadge.spec.tsx \
  src/components/ChartTokenSelector/ChartTokenSelector.tsx \
  src/components/GmList/GmList.tsx
git commit -m "feat(market-selector): New badge on recently listed market rows (FEDEV-3810)"
```

---

# Phase 5 — End-to-end QA + Cleanup

Goal: single sweep over the whole restructured dropdown before merging the umbrella.

### Task 5.1: Manual QA matrix (desktop + mobile)

For each combination, verify behavior matches the parent FEDEV-3780 spec.

- [ ] **Trade page (desktop)**
  - Mode tab `Perpetuals` selected → categories show perp tokens only; column set is perp.
  - Mode tab `Swap` selected → swap tokens, column set is swap.
  - Top-level `All` → no sub-cat row.
  - Top-level `Favorites` → no sub-cat row.
  - Top-level `Crypto` → sub-cat row with `All / AI / Layer 1 / Layer 2 / DeFi / Meme` (in that order). `AI` is right after `All`.
  - Top-level `TradFi` → sub-cat row with `All / Commodities` (others hidden until populated).
  - Top-level `Recently Listed` → flat list, count badge in tab label, hidden when count = 0.
  - Cross-search empty-state link only switches the dropdown's mode; closing without selecting leaves page mode unchanged.
  - Selecting a market navigates to the right page mode.
  - Active tabs persist across dropdown open/close in the same session.

- [ ] **Trade page (mobile)** — same matrix.

- [ ] **Pools page (`/pools`)** — top-level tabs and sub-categories work as on the trade page; Recently Listed count consistent.

- [ ] **"New" badge cross-filter visibility** — markets within the 30-day window show the badge across All / Favorites / Crypto / TradFi / Recently Listed.

- [ ] **Master inventory parity** — random-spot-check 5 tokens per crypto sub-cat and all TradFi commodities against the FEDEV-3809 master inventory.

### Task 5.2: Stale string scan

- [ ] **Step 1: Confirm no `rwa` references survive in user-facing strings**

Run: `rg --no-heading -ni 'rwa' src --type ts --type tsx`
Expected: zero hits in user-facing strings. Hits inside CSS class names, comments, or test fixtures are fine if intentional.

- [ ] **Step 2: Scan for any TODO/placeholder left behind**

Run: `rg --no-heading -n 'TODO|FIXME' src/components/ChartTokenSelector src/components/FavoriteTabs src/components/GmList src/context/TokensFavoritesContext src/domain/synthetics/markets/useMarketsListingDates.ts`
Expected: empty (or known pre-existing).

### Task 5.3: Final typecheck + tests

- [ ] **Step 1: Full pre-push check**

Run: `yarn typecheck && yarn test`
Expected: all green.

- [ ] **Step 2: Pre-push hooks (network tests are flaky)**

If a network-related test fails, retry once. If it still fails and the failure is unrelated to dropdown code, `--no-verify` is acceptable per existing project policy on this branch.

### Task 5.4: PR

- [ ] **Step 1: Open PR against `release` referencing FEDEV-3780**

Title: `feat(market-selector): umbrella overhaul — Perp/Swap, sub-categories, Recently Listed (FEDEV-3780)`

Body: link FEDEV-3780 + the four sub-issues + FEDEV-3809. Test plan = Task 5.1 matrix.

---

## Self-Review Notes

**Coverage check:** Each `Done When` item across FEDEV-3780, 3536, 3616, 3781, 3809, 3810 maps to a task above. Spot checks:
- FEDEV-3536 cross-search empty-state — Task 3.4 ✓
- FEDEV-3616 hide-empty-sub-cat — Task 2.4 step 2 + Task 2.3 (`populatedSubCategories` filter) ✓
- FEDEV-3616 `/pools` parity — Task 2.5 ✓
- FEDEV-3781 strict TradFi rule — enforced via the FEDEV-3809 audit table application in Tasks 1.3-1.5 (ONDO/MKR/INJ kept on crypto side) ✓
- FEDEV-3810 hide tab when count = 0 — Task 2.2 + Task 4.3 ✓
- FEDEV-3810 same window for tab + badge — both consume `getRecentlyListedTokenAddresses` ✓

**Open coordination items (raise with team before starting):**
1. **Listing dates source — confirmed.** `/markets` API returns `MarketWithTiers.listingDate`. Verify with backend that this field is populated for all chains the dropdown supports (Arbitrum, Avalanche, Botanix). If any chain's response has `listingDate: undefined` for new markets, FEDEV-3810's tab will silently render zero on that chain — confirm the backend before merging Phase 4.
2. **Backend coordination.** FEDEV-3781 / FEDEV-3809 both call out "Tag changes coordinated with backend if tags are sourced from API/config". Tags currently live in `sdk/src/configs/tokens.ts` (frontend-side). If a backend service mirrors them, sync.
3. **`MarketSelector` family** consumers (Phase 2 Task 2.6) — these aren't in the umbrella scope but break under the new tab API. Confirm with reviewers whether to do a minimal alias rename (current plan) or a full migration to the new shape.

**Test coverage summary:**
- Unit tests (vitest): `marketFilters.spec.ts` covers `applyTopLevelFilter`, `applySubCategoryFilter`, `isMarketRecentlyListed`, `getRecentlyListedTokenAddresses`. `useMarketsListingDates.spec.ts` covers the API hook with mocked SDK.
- Component tests: `SubCategoryTabs.spec.tsx` (hide-empty + ordering), `RecentlyListedBadge.spec.tsx` (basic render).
- Manual QA: Phase 5 matrix covers all top-level / sub-cat / mode combinations on desktop and mobile, plus `/pools` parity.
