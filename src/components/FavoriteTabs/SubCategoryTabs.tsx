import cx from "classnames";
import { msg } from "@lingui/macro";
import type { MessageDescriptor } from "@lingui/core";
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

import Button from "components/Button/Button";

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
    <div className="flex items-center gap-8 whitespace-nowrap">
      {visible.map((option) => {
        const label = option === "all" ? allLabels.all : subLabels[option];
        return (
          <Button
            key={option}
            type="button"
            variant="ghost"
            size="small"
            className={cx(className, {
              "!bg-button-secondary !text-typography-primary": subCategoryTab === option,
              [activeClassName]: activeClassName && subCategoryTab === option,
            })}
            onClick={() => setSubCategoryTab(option as CryptoSubCategory | TradfiSubCategory)}
            data-selected={subCategoryTab === option}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}
