import { ComponentType, memo, useCallback, useMemo } from "react";

import { EMPTY_ARRAY } from "lib/objects";
import { useFuse } from "lib/useFuse";

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
  const fuse = useFuse(
    () =>
      isGrouped
        ? EMPTY_ARRAY
        : (options as Item<T>[]).map((item) => ({
            id: item,
            text: item.text,
          })),
    [options, isGrouped]
  );

  return useMemo(() => {
    if (isGrouped) {
      return null;
    }

    return fuse.search(search).map((result) => result.item.id);
  }, [fuse, isGrouped, search]);
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
    <div className="TableOptionsFilter-option last-of-type:pb-10" onClick={handleTogglePair}>
      <Checkbox isChecked={isSelected} setIsChecked={handleTogglePair}>
        {ItemComponent ? <ItemComponent item={pair.data} /> : pair.text}
      </Checkbox>
    </div>
  );
}

const FlatItemMemo = memo(FlatItem) as typeof FlatItem;
