import { ComponentType, memo, useCallback, useMemo } from "react";

import { searchBy } from "lib/searchBy";

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

    return searchBy(options as Item<T>[], ["text"], search);
  }, [options, isGrouped, search]);
}

type FlatItemsProps<T> = {
  filteredFlatItems: Item<T>[];
  onTogglePair: (pair: T) => void;
  getIsSelected: (pair: T) => boolean;
  ItemComponent?: ComponentType<{
    item: T;
  }>;
};

export function FlatItems<T>({ filteredFlatItems, onTogglePair, getIsSelected, ItemComponent }: FlatItemsProps<T>) {
  return (
    <>
      {filteredFlatItems.map((pair) => (
        <FlatItemMemo
          key={pair.text}
          flatItem={pair}
          onTogglePair={onTogglePair}
          getIsSelected={getIsSelected}
          ItemComponent={ItemComponent}
        />
      ))}
    </>
  );
}

type FlatItemProps<T> = {
  flatItem: Item<T>;
  onTogglePair: (pair: T) => void;
  getIsSelected: (pair: T) => boolean;
  ItemComponent?: ComponentType<{
    item: T;
  }>;
};

function FlatItem<T>({ flatItem: pair, getIsSelected, onTogglePair, ItemComponent }: FlatItemProps<T>) {
  const handleTogglePair = useCallback(() => {
    onTogglePair(pair.data);
  }, [pair.data, onTogglePair]);

  const isSelected = useMemo(() => getIsSelected(pair.data), [getIsSelected, pair.data]);

  return (
    <div className="TableOptionsFilter-option font-medium last-of-type:pb-10" onClick={handleTogglePair}>
      <Checkbox isChecked={isSelected} setIsChecked={handleTogglePair}>
        {ItemComponent ? <ItemComponent item={pair.data} /> : pair.text}
      </Checkbox>
    </div>
  );
}

const FlatItemMemo = memo(FlatItem) as typeof FlatItem;
