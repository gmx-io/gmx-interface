import { msg } from "@lingui/macro";
import noop from "lodash/noop";
import uniq from "lodash/uniq";
import { PropsWithChildren, createContext, useCallback, useContext, useMemo } from "react";

import { CHART_TOKEN_SELECTOR_FAVORITE_TOKENS_KEY, CHART_TOKEN_SELECTOR_FILTER_TAB_KEY } from "config/localStorage";
import { useChainId } from "lib/chains";
import { useLocalStorageByChainId } from "lib/localStorage";

export type IndexTokenFavoritesTabOption = "all" | "favorites";

type IndexTokensFavoritesContextType = {
  tab: IndexTokenFavoritesTabOption;
  setTab: (tab: IndexTokenFavoritesTabOption) => void;
  /**
   * Both native and wrapped tokens, meaning this array can contain zero address
   */
  favoriteTokens: string[];
  setFavoriteTokens: (favoriteTokens: string[]) => void;
};

const context = createContext<IndexTokensFavoritesContextType>({
  tab: "all",
  setTab: noop,
  favoriteTokens: [],
  setFavoriteTokens: noop,
});

const Provider = context.Provider;

export function IndexTokensFavoritesContextProvider({ children }: PropsWithChildren) {
  // TODO: migrate to useSelector(selectChainId) when SyntheticsStateContext is refactored
  const { chainId } = useChainId();
  const [tab, setTab] = useLocalStorageByChainId<IndexTokenFavoritesTabOption>(
    chainId,
    CHART_TOKEN_SELECTOR_FILTER_TAB_KEY,
    "all"
  );
  const [favoriteTokens, setFavoriteTokens] = useLocalStorageByChainId<string[]>(
    chainId,
    CHART_TOKEN_SELECTOR_FAVORITE_TOKENS_KEY,
    []
  );

  const handleSetFavoriteTokens = useCallback(
    (favoriteTokens: string[]) => {
      setFavoriteTokens(uniq(favoriteTokens));
    },
    [setFavoriteTokens]
  );

  const stableObj = useMemo<IndexTokensFavoritesContextType>(
    () => ({ tab: tab!, setTab, favoriteTokens: favoriteTokens!, setFavoriteTokens: handleSetFavoriteTokens }),
    [tab, setTab, favoriteTokens, handleSetFavoriteTokens]
  );

  return <Provider value={stableObj}>{children}</Provider>;
}

export function useIndexTokensFavorites() {
  return useContext(context);
}

export const indexTokensFavoritesTabOptions = ["all", "favorites"];
export const indexTokensFavoritesTabOptionLabels = {
  all: msg({
    message: "All",
    comment: "Chart token selector all markets filter",
  }),
  favorites: msg`Favorites`,
};
