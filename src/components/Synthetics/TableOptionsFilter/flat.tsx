import { ComponentType, useMemo } from "react";

import Checkbox from "components/Checkbox/Checkbox";

import type { Group, Item } from "./types";

export function useFilteredFlatItems<T>({
  isGrouped,
  options,
  search,
}: {
  isGrouped: boolean;
  options: Item<T>[] | Group<T>[];
  search: string;
}): Item<T>[] | null {
  return useMemo(() => {
    if (isGrouped) {
      return null;
    }

    const castedOptions = options as Item<T>[];

    return castedOptions.filter((pair) => {
      return pair.text.toLowerCase().includes(search.toLowerCase());
    });
  }, [isGrouped, options, search]);
}

export function FlatItems<T>({
  filteredFlatItems,
  togglePair,
  getIsSelected,
  ItemComponent,
}: {
  filteredFlatItems: Item<T>[];
  togglePair: (pair: T) => void;
  getIsSelected: (pair: T) => boolean;
  ItemComponent?: ComponentType<{ item: T }>;
}) {
  return (
    <>
      {filteredFlatItems.map((pair) => (
        <div
          key={pair.text}
          className="TableOptionsFilter-option"
          onClick={() => {
            togglePair(pair.data);
          }}
        >
          <Checkbox
            isChecked={getIsSelected(pair.data)}
            setIsChecked={() => {
              togglePair(pair.data);
            }}
          >
            {ItemComponent ? <ItemComponent item={pair.data} /> : pair.text}
          </Checkbox>
        </div>
      ))}
    </>
  );
}
