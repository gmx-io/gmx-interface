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
const EMPTY_TOP_LEVEL_TABS: TopLevelTab[] = [];

export function FavoriteTabs({
  favoritesKey,
  className,
  type = "block",
  recentlyListedCount = 0,
  excludedTabs = EMPTY_TOP_LEVEL_TABS,
  extraTabs = EMPTY_TOP_LEVEL_TABS,
  selectedValue,
}: {
  favoritesKey: TokenFavoriteKey;
  className?: string;
  type?: "inline" | "block";
  recentlyListedCount?: number;
  excludedTabs?: TopLevelTab[];
  extraTabs?: TopLevelTab[];
  selectedValue?: TopLevelTab;
}) {
  const { topLevelTab, setTopLevelTab } = useTokensFavorites(favoritesKey);
  const labels = useLocalizedMap(topLevelTabLabels);
  const activeValue = selectedValue ?? topLevelTab;

  const options = useMemo<Option<TopLevelTab>[]>(() => {
    const tabs = extraTabs.length > 0 ? [...topLevelTabOptions, ...extraTabs] : topLevelTabOptions;

    return tabs
      .filter((opt) => !excludedTabs.includes(opt))
      .filter((opt) => (opt === "recently-listed" ? recentlyListedCount > 0 : true))
      .map((opt) => ({
        value: opt,
        label:
          opt === "recently-listed" && recentlyListedCount > 0 ? (
            <span className="flex flex-nowrap items-center gap-6 whitespace-nowrap">
              {labels[opt]}
              <span className="flex h-18 min-w-20 items-center justify-center rounded-full bg-button-secondary px-4 text-12 font-medium text-typography-secondary">
                {recentlyListedCount}
              </span>
            </span>
          ) : (
            labels[opt]
          ),
      }));
  }, [excludedTabs, extraTabs, recentlyListedCount, labels]);

  return (
    <Tabs
      options={options}
      selectedValue={activeValue}
      onChange={setTopLevelTab}
      type={type}
      className={className}
      regularOptionClassname={type === "block" ? REGULAR_TAB_CLASS_NAME : undefined}
      tabsWrapperClassName={type === "block" ? "gap-16" : undefined}
    />
  );
}
