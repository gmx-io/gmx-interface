import cx from "classnames";

import {
  TokenFavoriteKey,
  TokenFavoritesTabOption,
  tokensFavoritesTabOptionLabels,
  tokensFavoritesTabOptions,
  useTokensFavorites,
} from "context/TokensFavoritesContext/TokensFavoritesContextProvider";
import { useLocalizedMap } from "lib/i18n";

import Button from "components/Button/Button";

export function FavoriteTabs({
  favoritesKey,
  className,
  activeClassName = "",
  options,
}: {
  favoritesKey: TokenFavoriteKey;
  className?: string;
  activeClassName?: string;
  options?: TokenFavoritesTabOption[];
}) {
  const { tab, setTab } = useTokensFavorites(favoritesKey);

  const localizedTabOptionLabels = useLocalizedMap(tokensFavoritesTabOptionLabels);

  const tabOptions = options ?? tokensFavoritesTabOptions;

  return (
    <div className="flex items-center gap-8 whitespace-nowrap">
      {tabOptions.map((option) => (
        <Button
          key={option}
          type="button"
          variant={"ghost"}
          size="small"
          className={cx(className, {
            "!bg-button-secondary !text-typography-primary": tab === option,
            [activeClassName]: activeClassName && tab === option,
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
