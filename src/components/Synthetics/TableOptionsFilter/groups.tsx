import type Fuse from "fuse.js";
import isEqual from "lodash/isEqual";
import { ComponentType, memo, useCallback, useMemo } from "react";

import { definedOrThrow } from "lib/guards";
import { EMPTY_ARRAY } from "lib/objects";
import { useFuse } from "lib/useFuse";

import Checkbox from "components/Checkbox/Checkbox";

import { FilteredGroup, Group, Item } from "./types";

type GroupsProps<T> = {
  filteredGroups: FilteredGroup<T>[];
  onToggleGroup?: (group: FilteredGroup<T>) => void;
  onTogglePair: (pair: T) => void;
  getIsSelected: (pair: T) => boolean;
  showGroupToggle?: boolean;
  ItemComponent?: ComponentType<{
    item: T;
  }>;
};

export function Groups<T>({
  filteredGroups,
  onToggleGroup,
  onTogglePair,
  getIsSelected,
  showGroupToggle,
  ItemComponent,
}: GroupsProps<T>) {
  return (
    <>
      {filteredGroups.map((group) => (
        <GroupComponentMemo
          key={group.groupName}
          group={group}
          onToggleGroup={onToggleGroup}
          onTogglePair={onTogglePair}
          getIsSelected={getIsSelected}
          showGroupToggle={showGroupToggle}
          ItemComponent={ItemComponent}
        />
      ))}
    </>
  );
}

type GroupComponentProps<T> = {
  group: FilteredGroup<T>;
  onToggleGroup?: (group: FilteredGroup<T>) => void;
  onTogglePair: (pair: T) => void;
  getIsSelected: (pair: T) => boolean;
  showGroupToggle?: boolean;
  ItemComponent?: ComponentType<{
    item: T;
  }>;
};

function GroupComponent<T>({
  group,
  showGroupToggle,
  onToggleGroup,
  onTogglePair,
  getIsSelected,
  ItemComponent,
}: GroupComponentProps<T>) {
  const handleGroupToggle = useCallback(() => {
    definedOrThrow(onToggleGroup);
    onToggleGroup(group);
  }, [group, onToggleGroup]);

  return (
    <div key={group.groupName} className="TableOptionsFilter-group group/group">
      {showGroupToggle ? (
        <div className="TableOptionsFilter-group-name" onClick={handleGroupToggle}>
          <Checkbox
            isPartialChecked={group.isSomethingSelected && !group.isEverythingSelected}
            isChecked={group.isEverythingSelected}
            setIsChecked={handleGroupToggle}
          >
            {group.groupName}
          </Checkbox>
        </div>
      ) : (
        <div className="TableOptionsFilter-group-name">{group.groupName}</div>
      )}
      {group.items.map((pair) => (
        <ItemComponentWrapperMemo
          key={pair.text}
          item={pair}
          onTogglePair={onTogglePair}
          getIsSelected={getIsSelected}
          ItemComponent={ItemComponent}
        />
      ))}
    </div>
  );
}

const GroupComponentMemo = memo(GroupComponent) as typeof GroupComponent;

type ItemComponentWrapperProps<T> = {
  item: Item<T>;
  onTogglePair: (pair: T) => void;
  getIsSelected: (pair: T) => boolean;
  ItemComponent?: ComponentType<{
    item: T;
  }>;
};

function ItemComponentWrapper<T>({ item, onTogglePair, getIsSelected, ItemComponent }: ItemComponentWrapperProps<T>) {
  const handleTogglePair = useCallback(() => {
    onTogglePair(item.data);
  }, [item.data, onTogglePair]);

  return (
    <div
      key={item.text}
      className="TableOptionsFilter-option TableOptionsFilter-option-in-group group-last-of-type/group:last-of-type:pb-10"
      onClick={handleTogglePair}
    >
      <Checkbox isChecked={getIsSelected(item.data)} setIsChecked={handleTogglePair}>
        {ItemComponent ? <ItemComponent item={item.data} /> : item.text}
      </Checkbox>
    </div>
  );
}

const ItemComponentWrapperMemo = memo(ItemComponentWrapper) as typeof ItemComponentWrapper;

export function useFilteredGroups<T>({
  isGrouped,
  search,
  multiple,
  value,
  options,
}: {
  isGrouped: boolean;
  search: string;
  multiple?: boolean;
  value?: T[] | T;
  options: Item<T>[] | Group<T>[];
}): FilteredGroup<T>[] | null {
  const fuse = useFuse(
    () =>
      !isGrouped
        ? EMPTY_ARRAY
        : (options as Group<T>[]).flatMap((group, groupIndex) =>
            group.items.map((item, itemIndex) => ({
              id: `${groupIndex}_${itemIndex}`,
              text: item.text,
            }))
          ),

    [options, isGrouped]
  );

  return useMemo(() => {
    if (!isGrouped) return null;

    const groups = options as Group<T>[];

    return filterGroups({
      groups,
      search,
      value,
      multiple,
      fuse,
    });
  }, [isGrouped, search, multiple, options, value, fuse]);
}

function filterGroups<T>({
  groups,
  search,
  value,
  multiple,
  fuse,
}: {
  groups: Group<T>[];
  search: string;
  value?: T[] | T;
  multiple?: boolean;
  fuse: Fuse<{ id: string; text: string }>;
}): FilteredGroup<T>[] {
  const matchedItems = fuse.search(search).map((result) => result.item);

  return groups
    .map((group, groupIndex) => {
      const items = !search.trim()
        ? group.items
        : group.items.filter((item, itemIndex) =>
            matchedItems.some((matchedItem) => matchedItem.id === `${groupIndex}_${itemIndex}`)
          );

      let isEverythingSelected: boolean | undefined;
      let isEverythingFilteredSelected: boolean | undefined;
      let isSomethingSelected: boolean | undefined;

      if (value && multiple) {
        const castedValue = value as T[];
        isEverythingSelected = group.items.every((item) =>
          castedValue.some((selectedItem) => isEqual(selectedItem, item.data))
        );
        isEverythingFilteredSelected = items.every((item) =>
          castedValue.some((selectedItem) => isEqual(selectedItem, item.data))
        );
        isSomethingSelected = group.items.some((item) =>
          castedValue.some((selectedItem) => isEqual(selectedItem, item.data))
        );
      }

      return {
        groupName: group.groupName,
        isEverythingSelected,
        isEverythingFilteredSelected,
        isSomethingSelected,
        items,
      };
    })
    .filter((group) => group.items.length > 0);
}
