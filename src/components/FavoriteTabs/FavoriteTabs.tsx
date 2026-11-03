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

const REGULAR_TAB_CLASS_NAME = "!px-8 !py-12 text-body-small";

export function FavoriteTabs({
  favoritesKey,
  className,
  type = "block",
  recentlyListedCount = 0,
  hasAvailableFavorites,
  excludedTabs = [],
  selectedValue,
}: {
  favoritesKey: TokenFavoriteKey;
  className?: string;
  type?: "inline" | "block";
  recentlyListedCount?: number;
  hasAvailableFavorites?: boolean;
  excludedTabs?: TopLevelTab[];
  selectedValue?: TopLevelTab;
}) {
  const { topLevelTab, setTopLevelTab } = useTokensFavorites(favoritesKey);
  const labels = useLocalizedMap(topLevelTabLabels);
  const activeValue = selectedValue ?? topLevelTab;

  const options = useMemo<Option<TopLevelTab>[]>(() => {
    return topLevelTabOptions
      .filter((opt) => !excludedTabs.includes(opt))
      .filter((opt) => (opt === "recently-listed" ? recentlyListedCount > 0 : true))
      .filter((opt) => (opt === "favorites" && hasAvailableFavorites !== undefined ? hasAvailableFavorites : true))
      .map((opt) => ({
        value: opt,
        label:
          opt === "recently-listed" && recentlyListedCount > 0 ? (
            <span className="flex flex-nowrap items-center gap-4 whitespace-nowrap">
              {labels[opt]}
              <span className="text-body-small flex h-18 min-w-20 items-center justify-center rounded-full bg-button-secondary px-4 font-medium text-textIcon-secondary">
                {recentlyListedCount}
              </span>
            </span>
          ) : (
            labels[opt]
          ),
      }));
  }, [excludedTabs, recentlyListedCount, hasAvailableFavorites, labels]);

  return (
    <Tabs
      options={options}
      selectedValue={activeValue}
      onChange={setTopLevelTab}
      type={type}
      className={className}
      regularOptionClassname={type === "block" ? REGULAR_TAB_CLASS_NAME : undefined}
      tabsWrapperClassName={type === "block" ? "!w-fit" : undefined}
    />
  );
}
