import { useCallback } from "react";

import {
  indexTokensFavoritesTabOptionLabels,
  useIndexTokensFavorites,
} from "domain/synthetics/tokens/useIndexTokensFavorites";
import { useLocalizedMap } from "lib/i18n";

import Button from "components/Button/Button";

export function FavoriteIndexTabs() {
  const { tab, setTab } = useIndexTokensFavorites();

  const localizedTabOptionLabels = useLocalizedMap(indexTokensFavoritesTabOptionLabels);

  const handleAll = useCallback(() => {
    setTab("all");
  }, [setTab]);

  const handleFavorites = useCallback(() => {
    setTab("favorites");
  }, [setTab]);

  return (
    <div className="flex items-center gap-4">
      <Button variant={tab === "all" ? "secondary" : "ghost"} className="!py-7" onClick={handleAll}>
        {localizedTabOptionLabels.all}
      </Button>
      <Button variant={tab === "favorites" ? "secondary" : "ghost"} className="!py-7" onClick={handleFavorites}>
        {localizedTabOptionLabels.favorites}
      </Button>
    </div>
  );
}
