import { useCallback } from "react";

import {
  TokenFavoriteKey,
  tokensFavoritesTabOptionLabels,
  useTokensFavorites,
} from "domain/synthetics/tokens/useTokensFavorites";
import { useLocalizedMap } from "lib/i18n";

import Button from "components/Button/Button";

export function FavoriteTabs({ favoritesKey }: { favoritesKey: TokenFavoriteKey }) {
  const { tab, setTab } = useTokensFavorites(favoritesKey);

  const localizedTabOptionLabels = useLocalizedMap(tokensFavoritesTabOptionLabels);

  const handleAll = useCallback(() => {
    setTab("all");
  }, [setTab]);

  const handleFavorites = useCallback(() => {
    setTab("favorites");
  }, [setTab]);

  return (
    <div className="flex items-center gap-4">
      <Button variant={tab === "all" ? "secondary" : "ghost"} className="!text-body-large !py-7" onClick={handleAll}>
        {localizedTabOptionLabels.all}
      </Button>
      <Button
        variant={tab === "favorites" ? "secondary" : "ghost"}
        className="!text-body-large !py-7"
        onClick={handleFavorites}
      >
        {localizedTabOptionLabels.favorites}
      </Button>
    </div>
  );
}
