import cx from "classnames";

import {
  TokenFavoriteKey,
  topLevelTabLabels,
  topLevelTabOptions,
  useTokensFavorites,
} from "context/TokensFavoritesContext/TokensFavoritesContextProvider";
import { useLocalizedMap } from "lib/i18n";

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
    <div className="flex items-center gap-16 whitespace-nowrap px-4">
      {visibleOptions.map((option) => {
        const isActive = topLevelTab === option;
        return (
          <button
            key={option}
            type="button"
            className={cx(
              "border-transparent text-body-small flex h-40 items-center gap-6 border-b-2 py-10 font-medium transition-colors",
              {
                "border-blue-300 text-typography-primary": isActive,
                "text-typography-secondary hover:text-typography-primary": !isActive,
              },
              className,
              { [activeClassName]: activeClassName && isActive }
            )}
            onClick={() => setTopLevelTab(option)}
            data-selected={isActive}
          >
            <span>{labels[option]}</span>
            {option === "recently-listed" && recentlyListedCount > 0 && (
              <span className="flex h-18 min-w-20 items-center justify-center rounded-full bg-button-secondary px-4 text-[12px] font-medium text-typography-secondary">
                {recentlyListedCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
