import { msg } from "@lingui/macro";
import noop from "lodash/noop";
import uniq from "lodash/uniq";
import { PropsWithChildren, createContext, useCallback, useContext, useMemo } from "react";

import { CHART_TOKEN_SELECTOR_FAVORITE_TOKENS_KEY, CHART_TOKEN_SELECTOR_FILTER_TAB_KEY } from "config/localStorage";
import { useChainId } from "lib/chains";
import { useLocalStorageByChainId } from "lib/localStorage";

export type GmTokenFavoritesTabOption = "all" | "favorites";

export type GmTokensFavoritesContextType = {
  tab: GmTokenFavoritesTabOption;
  setTab: (tab: GmTokenFavoritesTabOption) => void;
  favoriteTokens: string[];
  setFavoriteTokens: (favoriteTokens: string[]) => void;
  toggleFavoriteToken: (address: string) => void;
};

const context = createContext<GmTokensFavoritesContextType>({
  tab: "all",
  setTab: noop,
  favoriteTokens: [],
  setFavoriteTokens: noop,
  toggleFavoriteToken: noop,
});

const Provider = context.Provider;

export function GmTokensFavoritesContextProvider({ children }: PropsWithChildren) {
  // TODO: migrate to useSelector(selectChainId) when SyntheticsStateContext is refactored
  const { chainId } = useChainId();
  const [tab, setTab] = useLocalStorageByChainId<GmTokenFavoritesTabOption>(
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

  const handleToggleFavoriteToken = useCallback(
    (address: string): void => {
      if (favoriteTokens!.includes(address)) {
        setFavoriteTokens(favoriteTokens!.filter((token) => token !== address));
      } else {
        setFavoriteTokens([...favoriteTokens!, address]);
      }
    },
    [favoriteTokens, setFavoriteTokens]
  );

  const stableObj = useMemo<GmTokensFavoritesContextType>(
    () => ({
      tab: tab!,
      setTab,
      favoriteTokens: favoriteTokens!,
      setFavoriteTokens: handleSetFavoriteTokens,
      toggleFavoriteToken: handleToggleFavoriteToken,
    }),
    [tab, setTab, favoriteTokens, handleSetFavoriteTokens, handleToggleFavoriteToken]
  );

  return <Provider value={stableObj}>{children}</Provider>;
}

export function useGmTokensFavorites() {
  return useContext(context);
}

export const gmTokensFavoritesTabOptions = ["all", "favorites"];
export const gmTokensFavoritesTabOptionLabels = {
  all: msg({
    message: "All",
    comment: "GM market token selector all markets filter",
  }),
  favorites: msg`Favorites`,
};
