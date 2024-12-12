import {
  TokenFavoriteKey,
  tokensFavoritesTabOptionLabels,
  tokensFavoritesTabOptions,
  useTokensFavorites,
} from "domain/synthetics/tokens/useTokensFavorites";
import { useLocalizedMap } from "lib/i18n";

import Button from "components/Button/Button";

export function FavoriteTabs({ favoritesKey }: { favoritesKey: TokenFavoriteKey }) {
  const { tab, setTab } = useTokensFavorites(favoritesKey);

  const localizedTabOptionLabels = useLocalizedMap(tokensFavoritesTabOptionLabels);

  return (
    <div className="flex items-center gap-4 whitespace-nowrap">
      {tokensFavoritesTabOptions.map((option) => (
        <Button
          key={option}
          type="button"
          variant={tab === option ? "secondary" : "ghost"}
          className="!text-body-medium !py-7"
          onClick={() => setTab(option)}
        >
          {localizedTabOptionLabels[option]}
        </Button>
      ))}
    </div>
  );
}
