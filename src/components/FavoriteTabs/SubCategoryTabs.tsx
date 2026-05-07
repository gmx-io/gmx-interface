import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/macro";
import cx from "classnames";
import { useMemo } from "react";

import {
  CryptoSubCategory,
  SubCategoryTab,
  TokenFavoriteKey,
  TradfiSubCategory,
  cryptoSubCategoryOptions,
  subCategoryTabLabels,
  tradfiSubCategoryOptions,
  useTokensFavorites,
} from "context/TokensFavoritesContext/TokensFavoritesContextProvider";
import { useLocalizedMap } from "lib/i18n";

const allLabel: Record<"all", MessageDescriptor> = {
  all: msg`All`,
};

export function SubCategoryTabs({
  favoritesKey,
  parent,
  populatedSubCategories,
  className,
  activeClassName = "",
}: {
  favoritesKey: TokenFavoriteKey;
  parent: "crypto" | "tradfi";
  /** Sub-cats with at least one market — empties are hidden per spec. "all" is always visible. */
  populatedSubCategories: Set<SubCategoryTab>;
  className?: string;
  activeClassName?: string;
}) {
  const { subCategoryTab, setSubCategoryTab } = useTokensFavorites(favoritesKey);
  const subLabels = useLocalizedMap(subCategoryTabLabels);
  const allLabels = useLocalizedMap(allLabel);

  const allOptions: readonly SubCategoryTab[] =
    parent === "crypto" ? cryptoSubCategoryOptions : tradfiSubCategoryOptions;

  const visible = useMemo(
    () => allOptions.filter((opt) => opt === "all" || populatedSubCategories.has(opt)),
    [allOptions, populatedSubCategories]
  );

  return (
    <div className="flex items-center gap-16 whitespace-nowrap px-4">
      {visible.map((option) => {
        const isActive = subCategoryTab === option;
        const label = option === "all" ? allLabels.all : subLabels[option];
        return (
          <button
            key={option}
            type="button"
            className={cx(
              "border-transparent text-body-small flex h-40 items-center gap-4 border-b-2 py-10 font-medium transition-colors",
              {
                "border-blue-300 text-typography-primary": isActive,
                "text-typography-secondary hover:text-typography-primary": !isActive,
              },
              className,
              { [activeClassName]: activeClassName && isActive }
            )}
            onClick={() => setSubCategoryTab(option as CryptoSubCategory | TradfiSubCategory)}
            data-selected={isActive}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
