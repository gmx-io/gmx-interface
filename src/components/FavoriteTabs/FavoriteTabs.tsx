import { useMemo } from "react";

import {
  TokenFavoriteKey,
  TopLevelTab,
  topLevelTabLabels,
  topLevelTabOptions,
  useTokensFavorites,
} from "context/TokensFavoritesContext/TokensFavoritesContextProvider";
import { useLocalizedMap } from "lib/i18n";

import Tabs from "components/Tabs/Tabs";
import type { Option } from "components/Tabs/types";

const REGULAR_TAB_CLASS_NAME = "!px-0 !pb-11 !pt-13 text-13";

export function FavoriteTabs({
  favoritesKey,
  className,
  recentlyListedCount = 0,
}: {
  favoritesKey: TokenFavoriteKey;
  className?: string;
  recentlyListedCount?: number;
}) {
  const { topLevelTab, setTopLevelTab } = useTokensFavorites(favoritesKey);
  const labels = useLocalizedMap(topLevelTabLabels);

  const options = useMemo<Option<TopLevelTab>[]>(() => {
    return topLevelTabOptions
      .filter((opt) => (opt === "recently-listed" ? recentlyListedCount > 0 : true))
      .map((opt) => ({
        value: opt,
        label:
          opt === "recently-listed" && recentlyListedCount > 0 ? (
            <span className="flex items-center gap-6">
              {labels[opt]}
              <span className="flex h-18 min-w-20 items-center justify-center rounded-full bg-button-secondary px-4 text-12 font-medium text-typography-secondary">
                {recentlyListedCount}
              </span>
            </span>
          ) : (
            labels[opt]
          ),
      }));
  }, [recentlyListedCount, labels]);

  return (
    <Tabs
      options={options}
      selectedValue={topLevelTab}
      onChange={setTopLevelTab}
      type="block"
      className={className}
      regularOptionClassname={REGULAR_TAB_CLASS_NAME}
      tabsWrapperClassName="gap-16"
    />
  );
}
