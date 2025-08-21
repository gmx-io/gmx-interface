import cx from "classnames";

import {
  TokenFavoriteKey,
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
}: {
  favoritesKey: TokenFavoriteKey;
  className?: string;
  activeClassName?: string;
}) {
  const { tab, setTab } = useTokensFavorites(favoritesKey);

  const localizedTabOptionLabels = useLocalizedMap(tokensFavoritesTabOptionLabels);

  return (
    <div className="flex items-center gap-8 whitespace-nowrap">
      {tokensFavoritesTabOptions.map((option) => (
        <Button
          key={option}
          type="button"
          variant={"ghost"}
          size="small"
          className={cx(className, {
            "!bg-button-secondary !text-textIcon-strong": tab === option,
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
