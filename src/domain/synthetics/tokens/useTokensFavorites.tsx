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
import { useChainId } from "lib/chains";
import { useLocalStorageByChainId } from "lib/localStorage";
import { EMPTY_ARRAY } from "lib/objects";

export type TokenFavoritesTabOption = "all" | "favorites";
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

type TokensFavoritesContextType = {
  keys: {
    [key in TokenFavoriteKey]?: {
      tab: TokenFavoritesTabOption;
      favoriteTokens: string[];
    };
  };
  setTab: (key: TokenFavoriteKey, tab: TokenFavoritesTabOption) => void;
  setFavoriteTokens: (key: TokenFavoriteKey, favoriteTokens: string[]) => void;
  toggleFavoriteToken: (key: TokenFavoriteKey, address: string) => void;
};

export type TokenFavoritesState = {
  tab: TokenFavoritesTabOption;
  favoriteTokens: string[];
  setTab: (tab: TokenFavoritesTabOption) => void;
  toggleFavoriteToken: (address: string) => void;
};

const context = createContext<TokensFavoritesContextType>({
  keys: {},
  setTab: noop,
  setFavoriteTokens: noop,
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

  const [settings, setSettings] = useLocalStorageByChainId<TokensFavoritesContextType["keys"]>(
    chainId,
    TOKEN_FAVORITE_PREFERENCE_SETTINGS_KEY,
    {}
  );

  const setTab = useCallback(
    (key: TokenFavoriteKey, tab: TokenFavoritesTabOption) => {
      setSettings((prev) => {
        return {
          ...prev,
          [key]: {
            ...prev[key],
            tab,
          },
        };
      });
    },
    [setSettings]
  );

  const setFavoriteTokens = useCallback(
    (key: TokenFavoriteKey, favoriteTokens: string[]) => {
      setSettings((prev) => {
        return {
          ...prev,
          [key]: {
            ...prev[key],
            favoriteTokens,
          },
        };
      });
    },
    [setSettings]
  );

  const toggleFavoriteToken = useCallback(
    (key: TokenFavoriteKey, address: string) => {
      setSettings((prev) => {
        const favoriteTokens = prev[key]?.favoriteTokens || [];
        const updatedFavoriteTokens = favoriteTokens.includes(address)
          ? favoriteTokens.filter((token) => token !== address)
          : [...favoriteTokens, address];

        return {
          ...prev,
          [key]: {
            ...prev[key],
            favoriteTokens: updatedFavoriteTokens,
          },
        };
      });
    },
    [setSettings]
  );

  const stableObj = useMemo<TokensFavoritesContextType>(
    () => ({
      keys: settings!,
      setTab,
      setFavoriteTokens,
      toggleFavoriteToken,
    }),
    [settings, setTab, setFavoriteTokens, toggleFavoriteToken]
  );

  return <Provider value={stableObj}>{children}</Provider>;
}

export function useTokensFavorites(key: TokenFavoriteKey): TokenFavoritesState {
  const { keys, setTab, toggleFavoriteToken } = useContext(context);

  const tab = keys[key]?.tab || "all";
  const favoriteTokens = keys[key]?.favoriteTokens || EMPTY_ARRAY;

  const internalSetTab = useCallback(
    (tab: TokenFavoritesTabOption) => {
      setTab(key, tab);
    },
    [setTab, key]
  );

  const internalToggleFavoriteToken = useCallback(
    (address: string) => {
      toggleFavoriteToken(key, address);
    },
    [toggleFavoriteToken, key]
  );

  return {
    tab,
    favoriteTokens,
    setTab: internalSetTab,
    toggleFavoriteToken: internalToggleFavoriteToken,
  };
}

export const tokensFavoritesTabOptions = ["all", "favorites"];
export const tokensFavoritesTabOptionLabels = {
  all: msg({
    message: "All",
    comment: "Filter option for tokens favorites",
  }),
  favorites: msg`Favorites`,
};
