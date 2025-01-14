import cx from "classnames";

import {
  TokenFavoriteKey,
  tokensFavoritesTabOptionLabels,
  tokensFavoritesTabOptions,
  useTokensFavorites,
} from "context/TokensFavoritesContext/TokensFavoritesContextProvider";
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
          variant={"ghost"}
          className={cx("!text-body-medium !py-7", {
            "!bg-cold-blue-500": tab === option,
          })}
          onClick={() => setTab(option)}
          data-selected={tab === option}
        >
          {localizedTabOptionLabels[option]}
        </Button>
      ))}
    </div>
  );
}
