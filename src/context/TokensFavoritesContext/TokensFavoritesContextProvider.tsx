import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/macro";
import noop from "lodash/noop";
import { PropsWithChildren, createContext, useCallback, useContext, useMemo } from "react";

import { TOKEN_FAVORITES_PREFERENCE_KEY } from "config/localStorage";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { EMPTY_ARRAY, EMPTY_OBJECT } from "lib/objects";

// ---- Types ----

export type TopLevelTab = "all" | "favorites" | "crypto" | "tradfi" | "recently-listed";

export type CryptoSubCategory = "all" | "ai" | "layer1" | "layer2" | "defi" | "meme";
export type TradfiSubCategory = "all" | "commodities" | "stocks" | "indices" | "fx";
export type SubCategoryTab = CryptoSubCategory | TradfiSubCategory;

export type TradeMode = "perp" | "swap";

export type TokenFavoritesType = "gm" | "index";

export type TokenFavoriteKey =
  | "chart-token-selector"
  | "market-selector"
  | "pool-selector"
  // in /pools on the left
  | "gm-token-selector"
  // in /pools on the right
  | "gm-token-receive-pay-selector"
  | "gm-list"
  | "gm-pool-selector";

const TAB_TYPE_MAP: Record<TokenFavoriteKey, TokenFavoritesType> = {
  "chart-token-selector": "index",
  "market-selector": "index",
  "pool-selector": "index",
  "gm-token-selector": "gm",
  "gm-token-receive-pay-selector": "gm",
  "gm-list": "gm",
  "gm-pool-selector": "gm",
};

export const topLevelTabOptions: TopLevelTab[] = ["all", "favorites", "crypto", "tradfi", "recently-listed"];

export const cryptoSubCategoryOptions: CryptoSubCategory[] = ["all", "ai", "layer1", "layer2", "defi", "meme"];

export const tradfiSubCategoryOptions: TradfiSubCategory[] = ["all", "commodities", "stocks", "indices", "fx"];

export const topLevelTabLabels: Record<TopLevelTab, MessageDescriptor> = {
  all: msg`All`,
  favorites: msg`Favourites`,
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

type TokensFavoritesStore = {
  topLevelTabs: { [key in TokenFavoriteKey]?: TopLevelTab };
  subCategoryTabs: {
    [key in TokenFavoriteKey]?: { crypto?: CryptoSubCategory; tradfi?: TradfiSubCategory };
  };
  modes: { [key in TokenFavoriteKey]?: TradeMode };
  gmFavoriteTokens: string[];
  indexFavoriteTokens: string[];

  /**
   * Legacy field kept for one-shot migration. Older sessions wrote `tabs` with
   * the flat tab model. We migrate then drop it on next save.
   */
  tabs?: { [key in TokenFavoriteKey]?: string };
};

const DEFAULT_TOKENS_FAVORITES_STORE: TokensFavoritesStore = {
  topLevelTabs: EMPTY_OBJECT,
  subCategoryTabs: EMPTY_OBJECT,
  modes: EMPTY_OBJECT,
  gmFavoriteTokens: EMPTY_ARRAY,
  indexFavoriteTokens: EMPTY_ARRAY,
};

type TokensFavoritesContextType = TokensFavoritesStore & {
  setTopLevelTab: (key: TokenFavoriteKey, tab: TopLevelTab) => void;
  setSubCategoryTab: (key: TokenFavoriteKey, parent: "crypto" | "tradfi", tab: SubCategoryTab) => void;
  setMode: (key: TokenFavoriteKey, mode: TradeMode) => void;
  toggleFavoriteToken: (type: TokenFavoritesType, address: string) => void;
};

export type TokenFavoritesState = {
  topLevelTab: TopLevelTab;
  subCategoryTab: SubCategoryTab;
  mode: TradeMode;
  favoriteTokens: string[];
  setTopLevelTab: (tab: TopLevelTab) => void;
  setSubCategoryTab: (tab: SubCategoryTab) => void;
  setMode: (mode: TradeMode) => void;
  toggleFavoriteToken: (address: string) => void;
};

const context = createContext<TokensFavoritesContextType>({
  topLevelTabs: {},
  subCategoryTabs: {},
  modes: {},
  gmFavoriteTokens: EMPTY_ARRAY,
  indexFavoriteTokens: EMPTY_ARRAY,
  setTopLevelTab: noop,
  setSubCategoryTab: noop,
  setMode: noop,
  toggleFavoriteToken: noop,
});

const Provider = context.Provider;

function migrateLegacyTabs(legacy: TokensFavoritesStore["tabs"]): {
  topLevelTabs: TokensFavoritesStore["topLevelTabs"];
  subCategoryTabs: TokensFavoritesStore["subCategoryTabs"];
} {
  const topLevelTabs: TokensFavoritesStore["topLevelTabs"] = {};
  const subCategoryTabs: TokensFavoritesStore["subCategoryTabs"] = {};
  if (!legacy) return { topLevelTabs, subCategoryTabs };

  for (const [key, value] of Object.entries(legacy)) {
    const k = key as TokenFavoriteKey;
    switch (value) {
      case "all":
      case "favorites":
        topLevelTabs[k] = value;
        break;
      case "rwa":
      case "tradfi":
        topLevelTabs[k] = "tradfi";
        break;
      case "defi":
      case "meme":
      case "layer1":
      case "layer2":
      case "ai":
        topLevelTabs[k] = "crypto";
        subCategoryTabs[k] = { crypto: value as CryptoSubCategory };
        break;
      default:
        break;
    }
  }
  return { topLevelTabs, subCategoryTabs };
}

export function TokensFavoritesContextProvider({ children }: PropsWithChildren) {
  const [settings, changeSettings] = useLocalStorageSerializeKey<TokensFavoritesStore>(
    TOKEN_FAVORITES_PREFERENCE_KEY,
    DEFAULT_TOKENS_FAVORITES_STORE
  );

  const setSettings = useCallback(
    (update: (prev: TokensFavoritesStore) => TokensFavoritesStore) => {
      changeSettings(update(settings ?? DEFAULT_TOKENS_FAVORITES_STORE));
    },
    [changeSettings, settings]
  );

  // Normalize the persisted store on every render. Legacy localStorage from before
  // the hierarchical-tab refactor may be missing some top-level fields entirely;
  // missing fields would otherwise read as `undefined` and crash `useTokensFavorites`.
  const migrated = useMemo(() => {
    const s = settings ?? DEFAULT_TOKENS_FAVORITES_STORE;
    const legacyMigration =
      s.tabs && (!s.topLevelTabs || Object.keys(s.topLevelTabs).length === 0)
        ? migrateLegacyTabs(s.tabs)
        : { topLevelTabs: {}, subCategoryTabs: {} };

    return {
      topLevelTabs: { ...legacyMigration.topLevelTabs, ...(s.topLevelTabs ?? {}) },
      subCategoryTabs: { ...legacyMigration.subCategoryTabs, ...(s.subCategoryTabs ?? {}) },
      modes: s.modes ?? EMPTY_OBJECT,
      gmFavoriteTokens: s.gmFavoriteTokens ?? EMPTY_ARRAY,
      indexFavoriteTokens: s.indexFavoriteTokens ?? EMPTY_ARRAY,
      tabs: undefined,
    };
  }, [settings]);

  const setTopLevelTab = useCallback(
    (key: TokenFavoriteKey, tab: TopLevelTab) => {
      setSettings((prev) => ({
        ...prev,
        topLevelTabs: { ...(prev.topLevelTabs ?? {}), [key]: tab },
      }));
    },
    [setSettings]
  );

  const setSubCategoryTab = useCallback(
    (key: TokenFavoriteKey, parent: "crypto" | "tradfi", tab: SubCategoryTab) => {
      setSettings((prev) => ({
        ...prev,
        subCategoryTabs: {
          ...(prev.subCategoryTabs ?? {}),
          [key]: { ...(prev.subCategoryTabs?.[key] ?? {}), [parent]: tab },
        },
      }));
    },
    [setSettings]
  );

  const setMode = useCallback(
    (key: TokenFavoriteKey, mode: TradeMode) => {
      setSettings((prev) => ({
        ...prev,
        modes: { ...(prev.modes ?? {}), [key]: mode },
      }));
    },
    [setSettings]
  );

  const toggleFavoriteToken = useCallback(
    (type: TokenFavoritesType, address: string) => {
      setSettings((prev) => {
        const favoriteTokens = (type === "gm" ? prev.gmFavoriteTokens : prev.indexFavoriteTokens) ?? EMPTY_ARRAY;
        const updated = favoriteTokens.includes(address)
          ? favoriteTokens.filter((t) => t !== address)
          : [...favoriteTokens, address];
        const next = { ...prev };
        if (type === "gm") next.gmFavoriteTokens = updated;
        else next.indexFavoriteTokens = updated;
        return next;
      });
    },
    [setSettings]
  );

  const value = useMemo<TokensFavoritesContextType>(
    () => ({
      topLevelTabs: migrated.topLevelTabs,
      subCategoryTabs: migrated.subCategoryTabs,
      modes: migrated.modes,
      gmFavoriteTokens: migrated.gmFavoriteTokens,
      indexFavoriteTokens: migrated.indexFavoriteTokens,
      setTopLevelTab,
      setSubCategoryTab,
      setMode,
      toggleFavoriteToken,
    }),
    [migrated, setTopLevelTab, setSubCategoryTab, setMode, toggleFavoriteToken]
  );

  return <Provider value={value}>{children}</Provider>;
}

export function useTokensFavorites(key: TokenFavoriteKey): TokenFavoritesState {
  const ctx = useContext(context);
  const type = TAB_TYPE_MAP[key];

  const topLevelTab: TopLevelTab = ctx.topLevelTabs?.[key] ?? "all";
  const mode: TradeMode = ctx.modes?.[key] ?? "perp";

  const subCategoryTab: SubCategoryTab = useMemo(() => {
    if (topLevelTab === "crypto") return ctx.subCategoryTabs?.[key]?.crypto ?? "all";
    if (topLevelTab === "tradfi") return ctx.subCategoryTabs?.[key]?.tradfi ?? "all";
    return "all";
  }, [ctx.subCategoryTabs, key, topLevelTab]);

  const favoriteTokens = type === "gm" ? ctx.gmFavoriteTokens ?? EMPTY_ARRAY : ctx.indexFavoriteTokens ?? EMPTY_ARRAY;

  const setTopLevelTab = useCallback((tab: TopLevelTab) => ctx.setTopLevelTab(key, tab), [ctx, key]);

  const setSubCategoryTab = useCallback(
    (tab: SubCategoryTab) => {
      if (topLevelTab === "crypto") ctx.setSubCategoryTab(key, "crypto", tab);
      else if (topLevelTab === "tradfi") ctx.setSubCategoryTab(key, "tradfi", tab);
    },
    [ctx, key, topLevelTab]
  );

  const setMode = useCallback((m: TradeMode) => ctx.setMode(key, m), [ctx, key]);

  const toggleFavoriteToken = useCallback((address: string) => ctx.toggleFavoriteToken(type, address), [ctx, type]);

  return {
    topLevelTab,
    subCategoryTab,
    mode,
    favoriteTokens,
    setTopLevelTab,
    setSubCategoryTab,
    setMode,
    toggleFavoriteToken,
  };
}
