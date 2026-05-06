import cx from "classnames";

import {
  TokenFavoriteKey,
  topLevelTabLabels,
  topLevelTabOptions,
  useTokensFavorites,
} from "context/TokensFavoritesContext/TokensFavoritesContextProvider";
import { useLocalizedMap } from "lib/i18n";

import Button from "components/Button/Button";

export function FavoriteTabs({
  favoritesKey,
  className,
  activeClassName = "",
  recentlyListedCount = 0,
}: {
  favoritesKey: TokenFavoriteKey;
  className?: string;
  activeClassName?: string;
  recentlyListedCount?: number;
}) {
  const { topLevelTab, setTopLevelTab } = useTokensFavorites(favoritesKey);
  const labels = useLocalizedMap(topLevelTabLabels);

  const visibleOptions = topLevelTabOptions.filter((opt) =>
    opt === "recently-listed" ? recentlyListedCount > 0 : true
  );

  return (
    <div className="flex items-center gap-8 whitespace-nowrap">
      {visibleOptions.map((option) => {
        const label =
          option === "recently-listed" && recentlyListedCount > 0
            ? `${labels[option]} (${recentlyListedCount})`
            : labels[option];

        return (
          <Button
            key={option}
            type="button"
            variant="ghost"
            size="small"
            className={cx(className, {
              "!bg-button-secondary !text-typography-primary": topLevelTab === option,
              [activeClassName]: activeClassName && topLevelTab === option,
            })}
            onClick={() => setTopLevelTab(option)}
            data-selected={topLevelTab === option}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}
