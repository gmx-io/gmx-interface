import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/macro";
import noop from "lodash/noop";
import { PropsWithChildren, createContext, useCallback, useContext, useMemo } from "react";

import {
  CHART_TOKEN_SELECTOR_FAVORITE_TOKENS_KEY,
  CHART_TOKEN_SELECTOR_FILTER_TAB_KEY,
  GM_TOKEN_SELECTOR_FAVORITE_TOKENS_KEY,
  GM_TOKEN_SELECTOR_FILTER_TAB_KEY,
  TOKEN_FAVORITE_PREFERENCE_SETTINGS_KEY,
} from "config/localStorage";

import type { TokenCategory } from "sdk/types/tokens";
import { useChainId } from "lib/chains";
import { useLocalStorageByChainId } from "lib/localStorage";
import { EMPTY_ARRAY, EMPTY_OBJECT } from "lib/objects";

export type TokenFavoritesTabOption = "all" | "favorites" | TokenCategory;
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

type TokensFavoritesStore = {
  tabs: {
    [key in TokenFavoriteKey]?: TokenFavoritesTabOption;
  };
  gmFavoriteTokens: string[];
  indexFavoriteTokens: string[];
};

const DEFAULT_TOKENS_FAVORITES_STORE: TokensFavoritesStore = {
  tabs: EMPTY_OBJECT,
  gmFavoriteTokens: EMPTY_ARRAY,
  indexFavoriteTokens: EMPTY_ARRAY,
};

type TokensFavoritesContextType = TokensFavoritesStore & {
  setTab: (key: TokenFavoriteKey, tab: TokenFavoritesTabOption) => void;
  toggleFavoriteToken: (type: TokenFavoritesType, address: string) => void;
};

export type TokenFavoritesState = {
  tab: TokenFavoritesTabOption;
  favoriteTokens: string[];
  setTab: (tab: TokenFavoritesTabOption) => void;
  toggleFavoriteToken: (address: string) => void;
};

const context = createContext<TokensFavoritesContextType>({
  tabs: {},
  gmFavoriteTokens: EMPTY_ARRAY,
  indexFavoriteTokens: EMPTY_ARRAY,
  setTab: noop,
  toggleFavoriteToken: noop,
});

const Provider = context.Provider;

localStorage.removeItem(CHART_TOKEN_SELECTOR_FILTER_TAB_KEY);
localStorage.removeItem(CHART_TOKEN_SELECTOR_FAVORITE_TOKENS_KEY);
localStorage.removeItem(GM_TOKEN_SELECTOR_FAVORITE_TOKENS_KEY);
localStorage.removeItem(GM_TOKEN_SELECTOR_FILTER_TAB_KEY);

export function TokensFavoritesContextProvider({ children }: PropsWithChildren) {
  // TODO: migrate to useSelector(selectChainId) when SyntheticsStateContext is refactored
  const { chainId } = useChainId();

  const [settings, setSettings] = useLocalStorageByChainId<TokensFavoritesStore>(
    chainId,
    TOKEN_FAVORITE_PREFERENCE_SETTINGS_KEY,
    DEFAULT_TOKENS_FAVORITES_STORE
  );

  const setTab = useCallback(
    (key: TokenFavoriteKey, tab: TokenFavoritesTabOption) => {
      setSettings((prev) => {
        return {
          ...prev,
          tabs: {
            ...prev.tabs,
            [key]: tab,
          },
        };
      });
    },
    [setSettings]
  );

  const toggleFavoriteToken = useCallback(
    (type: TokenFavoritesType, address: string) => {
      setSettings((prev) => {
        const favoriteTokens = type === "gm" ? prev.gmFavoriteTokens : prev.indexFavoriteTokens;
        const updatedFavoriteTokens = favoriteTokens.includes(address)
          ? favoriteTokens.filter((token) => token !== address)
          : [...favoriteTokens, address];

        const newState = {
          ...prev,
        };

        if (type === "gm") {
          newState.gmFavoriteTokens = updatedFavoriteTokens;
        } else {
          newState.indexFavoriteTokens = updatedFavoriteTokens;
        }

        return newState;
      });
    },
    [setSettings]
  );

  const stableObj = useMemo<TokensFavoritesContextType>(
    () => ({
      tabs: settings!.tabs,
      gmFavoriteTokens: settings!.gmFavoriteTokens,
      indexFavoriteTokens: settings!.indexFavoriteTokens,
      setTab,
      toggleFavoriteToken,
    }),
    [settings, setTab, toggleFavoriteToken]
  );

  return <Provider value={stableObj}>{children}</Provider>;
}

export function useTokensFavorites(key: TokenFavoriteKey): TokenFavoritesState {
  const { tabs, setTab, toggleFavoriteToken, indexFavoriteTokens, gmFavoriteTokens } = useContext(context);
  const type = TAB_TYPE_MAP[key];

  const tab = tabs[key] || "all";
  const favoriteTokens = type === "gm" ? gmFavoriteTokens : indexFavoriteTokens;

  const internalSetTab = useCallback(
    (tab: TokenFavoritesTabOption) => {
      setTab(key, tab);
    },
    [key, setTab]
  );

  const internalToggleFavoriteToken = useCallback(
    (address: string) => {
      toggleFavoriteToken(type, address);
    },
    [toggleFavoriteToken, type]
  );

  return {
    tab,
    favoriteTokens,
    setTab: internalSetTab,
    toggleFavoriteToken: internalToggleFavoriteToken,
  };
}

export const tokensFavoritesTabOptions: TokenFavoritesTabOption[] = [
  "all",
  "favorites",
  "meme",
  "layer1",
  "layer2",
  "defi",
];

export const tokensFavoritesTabOptionLabels: Record<TokenFavoritesTabOption, MessageDescriptor> = {
  all: msg({
    message: "All",
    comment: "Filter option for tokens favorites",
  }),
  favorites: msg`Favorites`,
  meme: msg`Meme`,
  layer1: msg`Layer 1`,
  layer2: msg`Layer 2`,
  defi: msg`DeFi`,
};
